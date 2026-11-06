# Phone checks

Build verification covers Java compilation, Android resource processing, lint, URL-policy unit tests and APK signing. These checks do not replace running the app on a phone. The first release is prepared for owner testing; phone behaviour has not yet been verified.

Please check:

1. After Android’s native splash, the opening screen shows only the original gold-on-indigo logo and “Quizlet Gravity” for 0.67 seconds, with no carousel cards visible, then starts the carousel of indigo-on-gold, black-on-indigo and white-on-indigo square logos. It morphs to gold-on-indigo, holds for one second and fades to the loaded website. No loading text or spinner. Check once on a normal connection and once on a slow connection: the site must be drawable before the final morph begins. Repeating carousel passes must not repeat the initial delay.
2. Paste a Quizlet share message with a public set URL and import it. Confirm the editable cards are complete and start a game.
3. Import a CSV or text file through the Android file picker. Switch back to pasted terms and try that too.
4. Type answers, including accents. Confirm the keyboard leaves the input visible, and rotate the phone to check the game remains in place.
5. Leave an active game for another app, then return. The game should be paused with the website's Resume control available.
6. Change theme/preferences, close the app and reopen it. Imported cards and supported preferences should remain on the same device.
7. Press Android Back. It should return through web history, or ask before closing the app at the root page.
8. Launch without internet. Confirm a useful error/retry screen, then reconnect and retry.
9. Leave the app during the carousel or final hold and return. The animation should resume. Retry after a failed load should restart the carousel. With Android animations disabled, the final logo should display without a repeating animation.

Do not expect data to be shared with the phone's separate browser or offline imports to work.
