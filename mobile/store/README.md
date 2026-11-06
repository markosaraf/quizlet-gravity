# Store submission package — Android 1.2.3 (8), iOS 1.2.4 (9)

Branding is unchanged. These files prepare a submission; neither store has reviewed or approved the app.

## Prepared

- Android target/compile SDK 36, signed release APK and AAB, existing signing key retained.
- iPhone/iPad source, shared Xcode scheme, native carousel, privacy manifest and Xcode 26 build/archive workflow.
- 512 px Play icon, 1024 px Apple icon, 1024 × 500 Play feature graphic.
- English and German listing copy, reviewer instructions, privacy/data inventory.
- Public support and privacy pages for the store listings; Android also includes footer links. The extra iOS footer was removed at the owner’s request.
- Support email: quizletgravity@gmail.com.
- Privacy URL: https://markosaraf.github.io/quizletgravity-android/privacy.html
- Support URL: https://markosaraf.github.io/quizletgravity-android/

## Android upload

1. Create/verify the developer account in Google Play Console, then create **Quizlet Gravity**.
2. Choose the appropriate game/education category and complete the console's content-rating, target-audience, ads, app-access and Data safety questions. Use DATA-INVENTORY.md as source material, not a blanket “no data collected” answer.
3. Enable Play App Signing. Retain the private existing signing material outside this repository. If Google generates a new app-signing key, a Play installation may not update the existing directly installed APK without uninstalling it. To retain that compatibility, use Google's supported process to enrol the existing app-signing key and consider a separate upload key. Do not change the key casually.
4. Upload `QuizletGravity-1.2.3.aab` to internal testing first. The APK is for direct installation, not the Play submission file.
5. Add the provided listing text, icon and feature graphic, plus **real phone screenshots**. These have not been fabricated or captured without the owner's app-testing permission.
6. If the personal developer account is subject to the new-account rule, complete the required closed test (at least 12 opted-in testers for 14 consecutive days) and apply for production access.
7. Check the Play pre-launch report and complete the owner's device checklist before requesting production review.

## Apple upload

1. Finish Apple Developer Program enrolment. The owner is arranging this separately.
2. Register `com.quizletgravity.ios` (or choose a unique bundle ID before the first release) and create an App Store Connect app record.
3. Use Xcode 26 or newer, select the developer team, create a **signed** archive and distribute it to App Store Connect. See ../ios/README.md. The GitHub archive is intentionally unsigned and cannot be submitted as-is or installed on an iPhone.
4. Add the listing, support/privacy URLs, real iPhone and iPad screenshots, App Privacy answers, content rating and review contact details. Do not claim Kids Category compliance without reviewing that separate programme's requirements.
5. Verify import, editing, playing, file selection and lifecycle behaviour on a real device/TestFlight, then submit for review.

## Remaining owner inputs/actions

- Apple membership/team/signing and the App Store Connect record.
- Play Console account/verification and any required closed testing.
- Real screenshots and device checks. Apple review/contact/account forms may need personal contact details which are not committed here.
- Review the provider data inventory and answer the store questionnaires based on the live service configuration.

Apple makes a separate minimum-functionality assessment. The product is an interactive study game in a native web container; an unsigned successful build does not guarantee store acceptance.

## References checked 17 October 2026

- https://support.google.com/googleplay/android-developer/answer/11926878
- https://support.google.com/googleplay/android-developer/answer/14151465
- https://support.google.com/googleplay/android-developer/answer/1078870
- https://developer.apple.com/news/upcoming-requirements/?id=02032026a
- https://developer.apple.com/app-store/review/guidelines/
- https://developer.apple.com/app-store/app-privacy-details/
