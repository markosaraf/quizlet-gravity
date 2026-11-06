# Quizlet Gravity for iPhone and iPad

Native UIKit/WKWebView app for the live https://www.quizletgravity.com game. The name and original square logo variants are unchanged. It supports iOS 16 and later, persistent website storage, the system file picker, external links, safe-area layout, a native opening carousel, reduced motion, and retry after connection failures. No privileged JavaScript-to-native bridge or API credentials are included. A main-frame, trusted-origin observer in an isolated content world can only request focus for the active gameplay or copy-answer field; it sends no input contents.

Current iOS version: **2.0.0 (build 13)**. The carousel completes indigo-on-gold → black-on-indigo → white-on-indigo before morphing to gold, even when the website is already cached. Its timings match Android: 0.67 seconds on the starting screen, 0.8 seconds per slide, a 0.55-second morph, a one-second final hold and a 0.65-second fade. Slow loads repeat complete carousel passes. The window uses UIKit's scene life cycle; leaving the scene pauses the intro and active game.

The iOS Home Screen icon uses `artwork/app-icon-ios.svg`, a size-calibrated derivative of `quizlet-q-chip-large-gold-on-indigo-3.svg`. Android retains the original larger artwork. The carousel uses Android's neighbouring-card positions, scale and opacity as well as its timings. The static system launch screen and first 0.67 seconds both show the original gold-on-indigo logo.

On iPad, the phone layout is selected by default. Connecting an external keyboard switches to the laptop layout; disconnecting restores the phone layout without reloading the game. The native wrapper reads `GCKeyboard` connection state and applies scoped presentation rules to the trusted website only. The safe areas use a dark game background instead of the launch screen's indigo.

When Play/Resume opens the gameplay field, a missed asteroid opens the copy-answer field, or copying ends, a scoped isolated-world observer requests native WebKit focus once for that input transition. This opens the software keyboard without repeatedly reopening it if the user dismisses it. The callback validates the main frame and trusted origin, carries no typed text, and is skipped with an external keyboard.

The web view follows the docked keyboard’s top edge, matching Android’s keyboard insets. During a game, the top bar and play area share that resized viewport; the input stays at the bottom of the play area. Import and FAQ pages keep normal scrolling. The extra native Privacy policy / Support footer has been removed from iOS.

Open `QuizletGravity.xcodeproj`, select the shared **QuizletGravity** scheme and your Apple Developer team under **Signing & Capabilities**. The bundle ID is `com.quizletgravity.ios`; register it under your team before submission.

## Build

Use Xcode 26 or later with the iOS 26 SDK (Apple's current upload requirement). The GitHub `iOS release preparation` workflow builds the simulator target and creates a device archive with signing disabled. Its artifact is a **build verification archive, not an installable IPA or an App Store upload**.

For a signed archive on a suitably equipped Mac:

```sh
xcodebuild -project ios/QuizletGravity.xcodeproj -scheme QuizletGravity \
  -configuration Release -destination 'generic/platform=iOS' \
  -archivePath ios/build/QuizletGravity.xcarchive \
  DEVELOPMENT_TEAM=YOUR_TEAM_ID -allowProvisioningUpdates archive
```

With the membership signed in to Xcode, open the archive in Organizer and choose **Distribute App → App Store Connect**. Keep certificates and provisioning profiles outside git. Do not put Apple passwords or signing keys in issues or source files.

## Owner checks before submission

On a real iPhone/iPad or TestFlight build, check the carousel, reduced motion, paste/import/edit/play, the Files picker, keyboard sizing, background/pause/resume, portrait/landscape and network-off retry. This release still needs testing on a physical iPhone or iPad. Follow the release checklist in `store/README.md`.

For this update, check a fresh launch and a launch after the website has been cached: all three alternative logos must appear, including white-on-indigo. Also leave and return during the initial 0.67-second hold, a slide and the final gold hold; the intro should resume instead of skipping ahead. Check iPad rotation and Split View after the scene-life-cycle migration.

Check a game in portrait and landscape with the on-screen keyboard open and closed: the top bar and answer field must remain visible together. Also check missed-answer entry, accents, the game options and scrolling through imported terms.

Check the larger Home Screen icon, the absence of bright indigo strips above/below the game, and connecting/disconnecting an external keyboard during a game. The controls should move between the phone header and laptop sidebar, preserving the game and typed answer.

The assets are generated from the checked-in source SVGs. `scripts/generate-assets.cjs` uses Sharp; `scripts/generate-project.rb` uses Ruby's xcodeproj gem. The generated project and PNG assets are committed, so neither generator is needed to build.
