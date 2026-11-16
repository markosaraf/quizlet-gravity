import UIKit
import UserNotifications
import WebKit

// Tokens never enter page JavaScript. Registration is authenticated using the
// first-party WebView session and sent only to our fixed HTTPS endpoint.
final class PushNotifications: NSObject, UNUserNotificationCenterDelegate, URLSessionTaskDelegate {
    static let shared = PushNotifications()
    private weak var webView: WKWebView?
    private weak var controller: GameViewController?
    private var pendingURL: URL?
    private var token: String?
    private var explicitRequest = false
    private var lastRegistration = ""
    private var lastRegisteredAt = Date.distantPast
    private lazy var session = URLSession(configuration: .ephemeral, delegate: self, delegateQueue: nil)
    private let origin = "https://www.quizletgravity.com"

    func start() {
        UNUserNotificationCenter.current().delegate = self
        refreshAuthorization()
    }

    func attach(_ webView: WKWebView, controller: GameViewController) {
        self.webView = webView
        self.controller = controller
        if let url = pendingURL { pendingURL = nil; controller.openAppLink(url) }
        refreshAuthorization()
    }

    private func trusted(_ url: URL?) -> Bool {
        guard let url else { return false }
        return url.scheme == "https" && ["www.quizletgravity.com", "quizletgravity.com"].contains(url.host ?? "") && url.user == nil && url.password == nil && (url.port == nil || url.port == 443)
    }

    func requestPermission() {
        guard trusted(webView?.url) else { return }
        explicitRequest = true
        UNUserNotificationCenter.current().requestAuthorization(options: [.alert, .badge, .sound]) { granted, error in
            DispatchQueue.main.async {
                guard granted, error == nil else { self.report(error == nil ? "denied" : "error"); return }
                UserDefaults.standard.set(true, forKey: "leaderboardNotificationsOptIn")
                UIApplication.shared.registerForRemoteNotifications()
                // APNs registration failure/success will complete this request.
            }
        }
    }

    func refreshAuthorization() {
        guard UserDefaults.standard.bool(forKey: "leaderboardNotificationsOptIn") else { return }
        UNUserNotificationCenter.current().getNotificationSettings { settings in
            guard settings.authorizationStatus == .authorized || settings.authorizationStatus == .provisional else { return }
            DispatchQueue.main.async { UIApplication.shared.registerForRemoteNotifications() }
        }
    }

    func registered(_ data: Data) {
        token = data.map { String(format: "%02x", $0) }.joined()
        sync()
    }

    func failed() { if explicitRequest { report("error") } }

    func sync() {
        guard UserDefaults.standard.bool(forKey: "leaderboardNotificationsOptIn"), let token,
              let webView, trusted(webView.url) else { return }
        webView.configuration.websiteDataStore.httpCookieStore.getAllCookies { cookies in
            DispatchQueue.main.async {
                guard self.webView === webView, self.trusted(webView.url) else { return }
                let ownCookies = cookies.filter {
                    ["quizletgravity.com", ".quizletgravity.com", "www.quizletgravity.com", ".www.quizletgravity.com"].contains($0.domain) &&
                    ($0.expiresDate == nil || $0.expiresDate! > Date()) && "/api/notifications/devices".hasPrefix($0.path)
                }
                let cookie = HTTPCookie.requestHeaderFields(with: ownCookies)["Cookie"] ?? ""
                guard !cookie.isEmpty else { if self.explicitRequest { self.report("error") }; return }
                let registration = token + "\n" + cookie
                if !self.explicitRequest && registration == self.lastRegistration && Date().timeIntervalSince(self.lastRegisteredAt) < 60 { return }
                #if targetEnvironment(macCatalyst)
                let platform = "macos"
                #else
                let platform = "ios"
                #endif
                #if DEBUG
                let environment = "sandbox"
                #else
                let environment = "production"
                #endif
                var request = URLRequest(url: URL(string: self.origin + "/api/notifications/devices")!)
                request.httpMethod = "POST"
                request.timeoutInterval = 15
                request.setValue("application/json", forHTTPHeaderField: "Content-Type")
                request.setValue(self.origin, forHTTPHeaderField: "Origin")
                request.setValue(cookie, forHTTPHeaderField: "Cookie")
                request.httpBody = try? JSONSerialization.data(withJSONObject: ["platform": platform, "environment": environment, "token": token])
                self.session.dataTask(with: request) { _, response, error in
                    DispatchQueue.main.async {
                        let success = error == nil && (response as? HTTPURLResponse)?.statusCode == 200
                        if success { self.lastRegistration = registration; self.lastRegisteredAt = Date() }
                        if self.explicitRequest { self.report(success ? "enabled" : "error") }
                    }
                }.resume()
            }
        }
    }

    private func report(_ status: String) {
        explicitRequest = false
        guard let webView, trusted(webView.url), ["enabled", "denied", "error"].contains(status) else { return }
        webView.evaluateJavaScript("window.dispatchEvent(new CustomEvent('quizlet-native-notifications',{detail:{status:'\(status)'}}));", completionHandler: nil)
    }

    func open(_ userInfo: [AnyHashable: Any]) {
        guard let value = userInfo["url"] as? String, let url = URL(string: value), trusted(url) else { return }
        if let controller { controller.openAppLink(url) } else { pendingURL = url }
    }

    func userNotificationCenter(_ center: UNUserNotificationCenter, didReceive response: UNNotificationResponse, withCompletionHandler completionHandler: @escaping () -> Void) {
        DispatchQueue.main.async { self.open(response.notification.request.content.userInfo); completionHandler() }
    }

    func userNotificationCenter(_ center: UNUserNotificationCenter, willPresent notification: UNNotification, withCompletionHandler completionHandler: @escaping (UNNotificationPresentationOptions) -> Void) {
        completionHandler([.banner, .list, .sound])
    }

    func urlSession(_ session: URLSession, task: URLSessionTask, willPerformHTTPRedirection response: HTTPURLResponse, newRequest request: URLRequest, completionHandler: @escaping (URLRequest?) -> Void) {
        completionHandler(nil)
    }
}
