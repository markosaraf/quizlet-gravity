import UIKit
import WebKit
import GameController
import AuthenticationServices
import CryptoKit

final class GameViewController: UIViewController, WKNavigationDelegate, WKUIDelegate, WKScriptMessageHandler, ASWebAuthenticationPresentationContextProviding {
    private let home = URL(string: "https://www.quizletgravity.com/")!
    private var webView: WKWebView!
    private var authSession: ASWebAuthenticationSession?
    private var intro: IntroView?
    private var timeout: Timer?
    private var generation = 0
    private var loaded = false
    private var failed = false
    private let pageBackground = UIColor(red: 11/255, green: 16/255, blue: 51/255, alpha: 1)

    override func viewDidLoad() {
        super.viewDidLoad()
        // The indigo launch screen is an overlay, not the persistent safe-area colour.
        view.backgroundColor = pageBackground
        let configuration = WKWebViewConfiguration()
        configuration.websiteDataStore = .default()
        configuration.applicationNameForUserAgent = "QuizletGravityApp"
        #if targetEnvironment(macCatalyst)
        // Use Safari's desktop layout without iPad scaling or touch-layout overrides.
        configuration.defaultWebpagePreferences.preferredContentMode = .desktop
        #else
        configuration.defaultWebpagePreferences.preferredContentMode = .mobile
        #endif
        // Isolated-world UI notification only: no page-accessible native capabilities,
        // input contents, credentials or arbitrary scripts cross this boundary.
        configuration.userContentController.add(
            WeakScriptMessageHandler(self), contentWorld: .defaultClient,
            name: "gravityGameInputReady"
        )
        webView = WKWebView(frame: .zero, configuration: configuration)
        webView.navigationDelegate = self
        webView.uiDelegate = self
        webView.allowsBackForwardNavigationGestures = true
        webView.isOpaque = false
        webView.backgroundColor = view.backgroundColor
        webView.scrollView.backgroundColor = pageBackground
        webView.underPageBackgroundColor = pageBackground
        webView.scrollView.contentInsetAdjustmentBehavior = .never
        NotificationCenter.default.addObserver(self, selector: #selector(keyboardChanged), name: .GCKeyboardDidConnect, object: nil)
        NotificationCenter.default.addObserver(self, selector: #selector(keyboardChanged), name: .GCKeyboardDidDisconnect, object: nil)
        configureInputLayout()
        webView.translatesAutoresizingMaskIntoConstraints = false
        view.addSubview(webView)
        NSLayoutConstraint.activate([
            webView.leadingAnchor.constraint(equalTo: view.safeAreaLayoutGuide.leadingAnchor),
            webView.trailingAnchor.constraint(equalTo: view.safeAreaLayoutGuide.trailingAnchor),
            webView.topAnchor.constraint(equalTo: view.safeAreaLayoutGuide.topAnchor),
            // Match Android's IME insets/adjustResize: resize the whole web viewport
            // above the keyboard instead of letting WebKit pan down to the input.
            // With the keyboard hidden this anchor is the bottom safe-area edge.
            webView.bottomAnchor.constraint(equalTo: view.keyboardLayoutGuide.topAnchor)
        ])
        loadGame()
    }

    @objc private func keyboardChanged() { configureInputLayout() }

    private func configureInputLayout() {
        #if targetEnvironment(macCatalyst)
        // Keep the desktop layout, with native keyboard-focus notifications.
        webView.configuration.userContentController.removeAllUserScripts()
        webView.configuration.userContentController.addUserScript(WKUserScript(source: Self.gameInputObserver,
            injectionTime: .atDocumentEnd, forMainFrameOnly: true, in: .defaultClient))
        return
        #else
        let mode = GCKeyboard.coalesced == nil ? "touch" : "keyboard"
        // Native-to-page presentation only: no privileged message handler or JS bridge.
        let source = """
        if (location.protocol === 'https:' && ['www.quizletgravity.com', 'quizletgravity.com'].includes(location.hostname)) {
            document.documentElement.dataset.gravityInput = '\(mode)';
            window.dispatchEvent(new Event('resize'));
        }
        """
        let scripts = webView.configuration.userContentController
        scripts.removeAllUserScripts()
        scripts.addUserScript(WKUserScript(source: Self.gameInputObserver,
            injectionTime: .atDocumentEnd, forMainFrameOnly: true, in: .defaultClient))
        scripts.addUserScript(WKUserScript(source: source, injectionTime: .atDocumentEnd, forMainFrameOnly: true))
        if let url = Bundle.main.url(forResource: "AppFooter", withExtension: "js"),
           let script = try? String(contentsOf: url, encoding: .utf8) {
            scripts.addUserScript(WKUserScript(source: script, injectionTime: .atDocumentEnd, forMainFrameOnly: true))
        }
        // Switching keyboards changes layout without reloading or losing the current game.
        webView.evaluateJavaScript(source, completionHandler: nil)
        #endif
    }

    // WebKit permits keyboard presentation for focus initiated by the native client.
    // The page's delayed React focus alone does not reliably open the iPad keyboard.
    // Track input transitions (Play/Resume, copy answer, return to play), not
    // mutations within one active field, so dismissing the keyboard stays possible.
    private static let gameInputObserver = """
    (() => {
        if (!['https://www.quizletgravity.com', 'https://quizletgravity.com'].includes(location.origin)) return;
        if (window.__gravityGameInputObserver) { window.__gravityGameInputObserver.scan(); return; }
        let previousInput = null;
        const scan = () => {
            const game = document.querySelector('.GravityGameplayView:not(.has-splash):not(.is-gameOver)');
            const input = game?.querySelector('textarea.GravityCopyTermView-input') ||
                game?.querySelector('.GravityTypingPrompt.is-showingInput:not(.is-copyState) textarea.GravityTypingPrompt-input');
            if (!input || input.disabled || input.readOnly || !input.getClientRects().length ||
                getComputedStyle(input).visibility !== 'visible') {
                previousInput = null;
                return;
            }
            if (input === previousInput) return;
            previousInput = input;
            window.webkit.messageHandlers.gravityGameInputReady.postMessage('ready');
        };
        const observer = new MutationObserver(scan);
        observer.observe(document.documentElement, {childList: true, subtree: true,
            attributes: true, attributeFilter: ['class', 'hidden', 'disabled', 'readonly']});
        window.__gravityGameInputObserver = {scan, observer};
        scan();
    })();
    """

    func userContentController(_ userContentController: WKUserContentController,
                               didReceive message: WKScriptMessage) {
        guard message.name == "gravityGameInputReady", message.body as? String == "ready",
              message.frameInfo.isMainFrame, let frameURL = message.frameInfo.request.url,
              isInternal(frameURL), let url = webView.url, isInternal(url),
              view.window != nil, UIApplication.shared.applicationState == .active else { return }
        focusGameInput()
    }

    private func focusGameInput() {
        guard let url = webView.url, isInternal(url), view.window != nil else { return }
        webView.becomeFirstResponder()
        webView.evaluateJavaScript("""
        (() => {
            const game = document.querySelector('.GravityGameplayView:not(.has-splash):not(.is-gameOver)');
            const input = game?.querySelector('textarea.GravityCopyTermView-input') ||
                game?.querySelector('.GravityTypingPrompt.is-showingInput:not(.is-copyState) textarea.GravityTypingPrompt-input');
            if (!input || input.disabled || input.readOnly || !input.getClientRects().length ||
                getComputedStyle(input).visibility !== 'visible') return;
            const start = input.selectionStart, end = input.selectionEnd;
            // React may already have focused it without opening the keyboard.
            if (document.activeElement === input) input.blur();
            input.focus({preventScroll: true});
            input.setSelectionRange(start, end);
        })();
        """, in: nil, in: .defaultClient, completionHandler: nil)
    }

    private func showIntro() {
        intro?.stop()
        intro?.removeFromSuperview()
        let overlay = IntroView(frame: view.bounds)
        overlay.autoresizingMask = [.flexibleWidth, .flexibleHeight]
        overlay.onRetry = { [weak self] in self?.loadGame() }
        overlay.onReveal = { [weak self, weak overlay] in
            guard self?.intro === overlay else { return }
            self?.webView.accessibilityElementsHidden = false
            overlay?.removeFromSuperview()
            self?.intro = nil
            UIAccessibility.post(notification: .screenChanged, argument: self?.webView)
        }
        webView.accessibilityElementsHidden = true
        view.addSubview(overlay)
        intro = overlay
        overlay.layoutIfNeeded()
        overlay.start()
    }

    private func loadGame() {
        generation += 1
        loaded = false
        failed = false
        webView.stopLoading()
        showIntro()
        armTimeout()
        webView.load(URLRequest(url: home, cachePolicy: .useProtocolCachePolicy, timeoutInterval: 30))
    }

    private func armTimeout() {
        timeout?.invalidate()
        timeout = Timer.scheduledTimer(withTimeInterval: 30, repeats: false) { [weak self] _ in self?.fail() }
    }

    private func fail() {
        guard !failed else { return }
        failed = true
        timeout?.invalidate()
        generation += 1
        webView.stopLoading()
        if intro == nil { showIntro() }
        intro?.showError()
    }

    func presentationAnchor(for session: ASWebAuthenticationSession) -> ASPresentationAnchor { view.window! }

    private func beginSignIn() {
        func random() -> String {
            var bytes = [UInt8](repeating: 0, count: 32)
            guard SecRandomCopyBytes(kSecRandomDefault, bytes.count, &bytes) == errSecSuccess else { return "" }
            return Data(bytes).base64EncodedString().replacingOccurrences(of: "+", with: "-").replacingOccurrences(of: "/", with: "_").replacingOccurrences(of: "=", with: "")
        }
        let verifier = random(), state = random()
        guard !verifier.isEmpty, !state.isEmpty else { return }
        let challenge = Data(SHA256.hash(data: Data(verifier.utf8))).base64EncodedString().replacingOccurrences(of: "+", with: "-").replacingOccurrences(of: "/", with: "_").replacingOccurrences(of: "=", with: "")
        let url = URL(string: "https://www.quizletgravity.com/native-auth?challenge=\(challenge)&state=\(state)")!
        authSession = ASWebAuthenticationSession(url: url, callbackURLScheme: "quizletgravity") { [weak self] callback, error in
            guard error == nil, let callback, callback.host == "auth", let components = URLComponents(url: callback, resolvingAgainstBaseURL: false), components.queryItems?.first(where: {$0.name == "state"})?.value == state, let code = components.queryItems?.first(where: {$0.name == "code"})?.value, code.range(of: "^[A-Za-z0-9_-]{43}$", options: .regularExpression) != nil else { return }
            DispatchQueue.main.async { self?.webView.load(URLRequest(url: URL(string: "https://www.quizletgravity.com/native-return#code=\(code)&verifier=\(verifier)")!)) }
        }
        authSession?.presentationContextProvider = self
        authSession?.start()
    }

    private func isInternal(_ url: URL) -> Bool {
        url.scheme?.lowercased() == "https" && ["www.quizletgravity.com", "quizletgravity.com"].contains(url.host?.lowercased() ?? "") && url.user == nil && url.password == nil && (url.port == nil || url.port == 443)
    }

    func webView(_ webView: WKWebView, decidePolicyFor action: WKNavigationAction, decisionHandler: @escaping (WKNavigationActionPolicy) -> Void) {
        guard let url = action.request.url else { decisionHandler(.cancel); return }
        if isInternal(url) {
            if url.path == "/native/start" { beginSignIn(); decisionHandler(.cancel); return }
            if action.targetFrame == nil { webView.load(action.request); decisionHandler(.cancel) }
            else { decisionHandler(.allow) }
            return
        }
        if action.navigationType == .linkActivated, ["https", "http", "mailto"].contains(url.scheme?.lowercased() ?? "") {
            UIApplication.shared.open(url)
        }
        decisionHandler(.cancel)
    }

    func webView(_ webView: WKWebView, decidePolicyFor response: WKNavigationResponse, decisionHandler: @escaping (WKNavigationResponsePolicy) -> Void) {
        if response.isForMainFrame, let http = response.response as? HTTPURLResponse, http.statusCode >= 400 {
            decisionHandler(.cancel)
            fail()
        } else { decisionHandler(.allow) }
    }

    func webView(_ webView: WKWebView, didFinish navigation: WKNavigation!) {
        guard let url = webView.url, isInternal(url) else { fail(); return }
        configureInputLayout()
        webView.evaluateJavaScript(Self.gameInputObserver, in: nil, in: .defaultClient, completionHandler: nil)
        #if !targetEnvironment(macCatalyst)
        if let scriptURL = Bundle.main.url(forResource: "AppFooter", withExtension: "js"),
           let script = try? String(contentsOf: scriptURL, encoding: .utf8) {
            webView.evaluateJavaScript(script, completionHandler: nil)
        }
        #endif
        let expected = generation
        // Two browser frames allow layout/paint before fading the native cover.
        webView.callAsyncJavaScript("await new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve)));", arguments: [:], in: nil, in: .page) { [weak self] result in
            guard let self, self.generation == expected else { return }
            if case .failure = result { self.fail(); return }
            self.loaded = true
            self.timeout?.invalidate()
            self.intro?.pageReady()
        }
    }

    func webView(_ webView: WKWebView, didFail navigation: WKNavigation!, withError error: Error) { handle(error) }
    func webView(_ webView: WKWebView, didFailProvisionalNavigation navigation: WKNavigation!, withError error: Error) { handle(error) }
    private func handle(_ error: Error) { if (error as NSError).code != NSURLErrorCancelled { fail() } }
    func webViewWebContentProcessDidTerminate(_ webView: WKWebView) { fail() }

    func sceneWillResignActive() {
        intro?.pause()
        timeout?.invalidate()
        guard let url = webView.url, isInternal(url) else { return }
        webView.evaluateJavaScript("(function(){if(!document.querySelector('.GravityGameplayView:not(.has-splash):not(.is-gameOver)'))return;var b=Array.from(document.querySelectorAll('button')).find(function(b){return !b.disabled && (b.getAttribute('aria-label')==='Pause' || b.textContent.trim()==='Pause');});window.__gravityPausedByApp=!!b;if(b)b.click();})()", completionHandler: nil)
    }
    func sceneDidBecomeActive() {
        intro?.resume()
        configureInputLayout()
        if let url = webView.url, isInternal(url) {
            webView.evaluateJavaScript("""
            (() => {
                if (window.__gravityPausedByApp) {
                    window.__gravityPausedByApp = false;
                    const button = Array.from(document.querySelectorAll('button')).find(b =>
                        !b.disabled && (b.getAttribute('aria-label') === 'Resume' || b.textContent.trim() === 'Resume'));
                    button?.click();
                }
            })();
            """, completionHandler: { [weak self] _, _ in self?.focusGameInput() })
        }
        if !loaded && !failed { armTimeout() }
    }

    func webView(_ webView: WKWebView, runJavaScriptAlertPanelWithMessage message: String, initiatedByFrame frame: WKFrameInfo, completionHandler: @escaping () -> Void) {
        let alert = UIAlertController(title: "Quizlet Gravity", message: message, preferredStyle: .alert)
        alert.addAction(UIAlertAction(title: "OK", style: .default) { _ in completionHandler() })
        present(alert, animated: true)
    }
    func webView(_ webView: WKWebView, runJavaScriptConfirmPanelWithMessage message: String, initiatedByFrame frame: WKFrameInfo, completionHandler: @escaping (Bool) -> Void) {
        let alert = UIAlertController(title: "Quizlet Gravity", message: message, preferredStyle: .alert)
        alert.addAction(UIAlertAction(title: "Cancel", style: .cancel) { _ in completionHandler(false) })
        alert.addAction(UIAlertAction(title: "OK", style: .default) { _ in completionHandler(true) })
        present(alert, animated: true)
    }
    func webView(_ webView: WKWebView, runJavaScriptTextInputPanelWithPrompt prompt: String, defaultText: String?, initiatedByFrame frame: WKFrameInfo, completionHandler: @escaping (String?) -> Void) {
        let alert = UIAlertController(title: "Quizlet Gravity", message: prompt, preferredStyle: .alert)
        alert.addTextField { $0.text = defaultText }
        alert.addAction(UIAlertAction(title: "Cancel", style: .cancel) { _ in completionHandler(nil) })
        alert.addAction(UIAlertAction(title: "OK", style: .default) { _ in completionHandler(alert.textFields?.first?.text) })
        present(alert, animated: true)
    }

    deinit { timeout?.invalidate(); NotificationCenter.default.removeObserver(self) }
}

// The content controller owns its handler; avoid retaining the view controller.
private final class WeakScriptMessageHandler: NSObject, WKScriptMessageHandler {
    private weak var delegate: WKScriptMessageHandler?
    init(_ delegate: WKScriptMessageHandler) { self.delegate = delegate }
    func userContentController(_ userContentController: WKUserContentController,
                               didReceive message: WKScriptMessage) {
        delegate?.userContentController(userContentController, didReceive: message)
    }
}
