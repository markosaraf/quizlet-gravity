# Quizlet Gravity mobile apps

Android and iPhone/iPad apps for [quizletgravity.com](https://www.quizletgravity.com/), with a gold-on-indigo launcher icon and launch screen. The app displays the live mobile website in Android System WebView, so web improvements appear without reinstalling the app.

**[Download the latest Android APK](https://github.com/markosaraf/quizlet-gravity/releases/latest)**

## Install

1. Open the latest release on your Android phone.
2. Download `QuizletGravity-2.0.0.apk` from **Assets**.
3. Open the downloaded file. If Android asks, allow this installation from your browser/file manager.
4. Open **Quizlet Gravity**.

Android 8.0 or newer and a current Android System WebView are required. Internet access is needed to load the site and import Quizlet sets. This is not an offline copy of the game.

## Included

- The live website’s shared sets, accounts, leaderboards, editable terms and game.
- File import through Android’s document picker (CSV, TSV and text), without storage permissions.
- Local website storage for imported cards and preferences.
- Keyboard and system-bar insets, portrait/landscape resizing without reloading the game.
- Android Back navigation with confirmation before closing at the root page.
- The existing game’s Pause control is invoked when leaving the app, followed by WebView timer suspension.
- An offline/error screen with retry, rather than a blank browser error page.
- External links open in the browser. Only the exact HTTPS website domains open inside the app.
- Adaptive and monochrome launcher icons, plus an opening carousel of the supplied square colour variants and “Quizlet Gravity”. Once the website is drawable, the carousel morphs to gold-on-indigo, holds for one second and fades into the site. No loading message or spinner.

The app does not contain the Firecrawl API key or the website backend. Set imports use the existing website backend. Website analytics and its privacy terms still apply. Android WebView storage is separate from Chrome/Safari storage.

Current versions: **Android 2.0.6 (build 17)** and **iOS/macOS 2.0.2 (build 21)**. See [iOS setup and build instructions](ios/README.md).

## Source and builds

- App source: this repository.
- Website source: [quizlet-gravity](https://github.com/markosaraf/quizlet-gravity).
- Building/signing: [BUILDING.md](BUILDING.md).
- Phone checks: [TESTING.md](TESTING.md).

The launcher artwork on Android and iPhone/iPad is `quizlet-q-chip-large-gold-on-indigo-3.svg`, supplied by the site owner. Its unrounded background is separated from the gold Q so Android can apply its own launcher shape. The SVG is mapped to the visible 72-point area of Android's adaptive icon, with the surrounding system movement padding retained. iOS uses the uniformly size-adjusted derivative `artwork/app-icon-ios.svg` and applies its own corners. The carousel keeps the original smaller logo variants.

On both Android and iOS, the opening screen first shows only the original gold-on-indigo logo and “Quizlet Gravity” for 0.67 seconds. The carousel cards appear and start moving afterwards. It uses the full, unmodified square proportions from `quizlet-q-chip-indigo-on-gold-3.svg`, `quizlet-q-chip-black-on-indigo3.svg`, `quizlet-q-chip-white-on-indigo-3.svg` and finally `quizlet-q-chip-gold-on-indigo-3.svg`. The source SVGs are in `artwork/`. Android draws their shared vector path directly. If the page is slow, the alternatives continue cycling without another start delay. Errors stop the carousel and show retry. Android's disabled-animation setting is respected.

Reference: [Android adaptive icon guidance](https://developer.android.com/develop/ui/views/launch/icon_design_adaptive), [Android splash screens](https://developer.android.com/develop/ui/views/launch/splash-screen), [WebView file-access security](https://developer.android.com/privacy-and-security/risks/webview-unsafe-file-inclusion).

This independent app is for quizletgravity.com; it is not an official Quizlet app.

## Store releases and iOS

The Android release targets API 36. The iPhone/iPad project is in [ios/](ios/README.md), with the same game and supplied logo variants. See [store/README.md](store/README.md) for the submission package and remaining account, signing, screenshot and device-check requirements. An unsigned iOS CI archive is not an upload-ready IPA.

[Support](https://www.quizletgravity.com/) · [Privacy policy](https://www.quizletgravity.com/privacy)
