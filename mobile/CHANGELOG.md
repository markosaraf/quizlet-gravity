# Changelog

## 1.2.2 — 2026-10-17

- The first 0.67 seconds now show the original gold-on-indigo logo and title alone on Android and iOS.
- Carousel cards appear only after this starting screen, instead of being visible but frozen during the delay.

## 1.2.1 — 2026-10-17

- Android and iOS hold the opening artwork still for 0.67 seconds before starting the carousel.
- Subsequent carousel passes, the final gold-logo hold and fade keep their existing timing.

## 1.2.0 — store preparation

- Android targets API 36 and keeps the existing release signing key.
- Added native iPhone/iPad project with logo carousel, local website storage, file import and network retry.
- Added support/privacy links inside the apps, public support pages, store artwork, listing copy and submission notes.
- Added Xcode 26 simulator-build and unsigned device-archive CI. Apple signing and store submission remain separate steps.

## 1.1.0 — 2026-10-17

- Added a carousel using all three alternate square colour combinations from the supplied artwork.
- Once the website is ready to draw, the alternatives merge into gold-on-indigo, hold for one second and fade away over 650 ms.
- Kept “Quizlet Gravity”, without loading text or spinner. Animation pauses in the background and respects Android's disabled-animation setting.

## 1.0.2 — 2026-10-17

- Restored “Quizlet Gravity” beneath the opening-screen logo. No loading message or spinner is shown.

## 1.0.1 — 2026-10-17

- Opening screen shows only the gold Q on indigo, with no app title, loading text or spinner.
- Connection failures still show a separate retry message. A stalled initial load times out after 30 seconds.

## 1.0.0 — 2026-10-17

- Initial Android app for the live quizletgravity.com website.
- Adaptive gold/indigo icon and branded launch/loading screens.
- Document import, keyboard-aware layout, stored preferences, back handling and retry UI.
- HTTPS-only first-party navigation, no JavaScript/native bridge, no embedded backend credentials.
- Signed APK and Android App Bundle prepared for owner testing.
