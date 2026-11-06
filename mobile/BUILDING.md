# Build and sign

## Requirements

- JDK 17 or 21
- Android SDK Platform 36, Build Tools 35.0.0
- Android SDK path in `ANDROID_HOME` or an untracked `local.properties`

The checked-in Gradle wrapper pins Gradle 8.11.1 and verifies its SHA-256 checksum.

```sh
./gradlew testDebugUnitTest lintDebug assembleDebug
```

Debug APK: `app/build/outputs/apk/debug/app-debug.apk`. Debug builds use Android's development certificate and cannot update an installed release APK.

## Private release key

For the original maintainer, the signing key and password are stored **outside this repository** under:

```text
~/.local/share/quizletgravity-android/signing/
```

Keep an encrypted backup of that directory. Updates to an installed release must use the same signing key and a higher `versionCode`. Never attach this directory to a GitHub release or commit it.

The untracked properties file has these keys:

```properties
storeFile=/absolute/path/to/private/release.jks
storePassword=YOUR_PRIVATE_PASSWORD
keyAlias=quizletgravity
keyPassword=YOUR_PRIVATE_PASSWORD
```

Build using that private file:

```sh
export QUIZLETGRAVITY_SIGNING_PROPERTIES="$HOME/.local/share/quizletgravity-android/signing/signing.properties"
./gradlew testDebugUnitTest lintRelease assembleRelease bundleRelease
```

Outputs:

- `app/build/outputs/apk/release/app-release.apk` — signed, directly installable.
- `app/build/outputs/bundle/release/app-release.aab` — signed Android App Bundle for a future store submission; not directly installable.

Without the signing environment variable, release outputs are unsigned. Do not publish those as installable updates.

## Release checklist

1. Bump `versionCode` and `versionName` in `app/build.gradle.kts`.
2. Run unit tests, lint and release builds.
3. Have the owner perform [phone checks](TESTING.md). Do not install or exercise the phone app on their behalf unless they ask.
4. Verify the APK with Android Build Tools `apksigner verify --verbose --print-certs`.
5. Check the staged files for secrets, local paths and generated artifacts.
6. Publish source and APK/AAB/checksums as release assets. Never publish the signing material.

The website is not deployed or modified by building this app.
