# Data inventory for store declarations

Source review: 17 October 2026. Covers the native containers **and the live web content**, not only native SDKs. The website is loaded remotely and can change independently of the app. Revisit declarations whenever its behaviour or providers change.

| Data | Processing | Purpose / disclosure considerations |
| --- | --- | --- |
| Pasted terms, selected CSV/TSV text, imported cards and preferences | Stored/processed in the app's website storage. Selected local file contents are parsed locally by the current site. | Local-only processing does not by itself constitute off-device collection. There is no account sync. |
| Public Quizlet set URL/identifier and returned cards | Sent to the website's import API, then retrieved through Firecrawl; parsed results cached with 3,600-second revalidation. | User-requested import/app functionality. Assess user content and search-history categories in each store. No claim of deletion after exactly one hour. |
| Request IP and technical headers | Hosting provider receives network requests; importer uses IP in a process-local 60-second rate-limit window. | Service delivery, security and abuse prevention. Provider hosting logs have their own retention. |
| Page URL/referrer, approximate location, OS/browser/device details, visitor hash | Website includes Vercel Web Analytics. | Analytics. No app login identity or advertising ID. Request-derived visitor hash is distinct from a hardware/device identifier; review store definitions before selecting identifier categories. |
| Performance/timing metrics and technical environment | Website includes Vercel Speed Insights. | App performance/diagnostics. |
| Support correspondence | If a user emails support, Gmail receives the message and email address. | Optional customer support. No in-app support form or automatic email collection. |

There is no added advertising SDK, purchase flow, native location access, contacts access, camera, microphone, tracking permission or privileged JavaScript bridge. There are no user accounts in this game, so app-account deletion does not apply. Do not infer that the service collects no data from these facts.

The iOS privacy manifest declares no native tracking and no required-reason API usage by the native Swift source. It is **not a replacement for App Store Connect App Privacy labels**. Website processing must be included in the labels. Android INTERNET permission alone likewise does not describe the entire service's data handling.

For Google Play, processing by a service provider on the developer's behalf can qualify for a sharing exception but still count as collection. Apply the actual questionnaire definitions and service contracts. For Apple, distinguish data linked to an identity, data used for tracking, and data collected without an identity. The current code has no app account identifier or cross-app advertising tracking.

Sources:
- https://vercel.com/docs/analytics/privacy-policy
- https://vercel.com/docs/speed-insights/privacy-policy
- https://www.firecrawl.dev/privacy-policy
- https://support.google.com/googleplay/android-developer/answer/10787469
- https://developer.apple.com/app-store/app-privacy-details/

Before submitting, confirm the production analytics settings and provider retention configuration. Neither anonymisation claims nor an empty native required-reason API list justify selecting “No data collected” for the entire app.
