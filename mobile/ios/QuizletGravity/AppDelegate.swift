import UIKit

@main
final class AppDelegate: UIResponder, UIApplicationDelegate {
    func application(_ application: UIApplication, didFinishLaunchingWithOptions options: [UIApplication.LaunchOptionsKey: Any]?) -> Bool {
        true
    }
}

final class SceneDelegate: UIResponder, UIWindowSceneDelegate {
    var window: UIWindow?
    #if targetEnvironment(macCatalyst)
    private var hasSizedInitialWindow = false
    #endif

    func scene(_ scene: UIScene, willConnectTo session: UISceneSession, options connectionOptions: UIScene.ConnectionOptions) {
        guard let windowScene = scene as? UIWindowScene else { return }
        let window = UIWindow(windowScene: windowScene)
        window.rootViewController = GameViewController()
        window.makeKeyAndVisible()
        self.window = window
    }

    func sceneDidBecomeActive(_ scene: UIScene) {
        #if targetEnvironment(macCatalyst)
        if let windowScene = scene as? UIWindowScene {
            maximizeInitialWindow(in: windowScene)
        }
        #endif
        (window?.rootViewController as? GameViewController)?.sceneDidBecomeActive()
    }

    #if targetEnvironment(macCatalyst)
    private func maximizeInitialWindow(in scene: UIWindowScene, attemptsRemaining: Int = 20) {
        guard !hasSizedInitialWindow else { return }
        // During initial activation the native window may not exist yet.
        guard !scene.effectiveGeometry.systemFrame.isEmpty else {
            guard attemptsRemaining > 0 else { return }
            DispatchQueue.main.asyncAfter(deadline: .now() + 0.05) { [weak self, weak scene] in
                guard let scene else { return }
                self?.maximizeInitialWindow(in: scene, attemptsRemaining: attemptsRemaining - 1)
            }
            return
        }
        hasSizedInitialWindow = true
        // macOS constrains this desktop window to the available screen area,
        // leaving the menu bar and Dock visible. Later manual resizing remains
        // untouched, including when returning from another app.
        scene.requestGeometryUpdate(
            UIWindowScene.GeometryPreferences.Mac(systemFrame: scene.screen.bounds)
        )
    }
    #endif

    func sceneWillResignActive(_ scene: UIScene) {
        (window?.rootViewController as? GameViewController)?.sceneWillResignActive()
    }
}
