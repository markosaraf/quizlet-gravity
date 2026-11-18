# Quizlet Gravity — Original Code Recovery Kit

Everything in this folder was pulled from the Internet Archive (Wayback Machine) on 2026-09-03.
All URLs below were **verified live** against the Wayback CDX index at time of collection.

## What's in this folder

| File | What it is |
|------|-----------|
| `archived-page-2019.html` | Full HTML snapshot of a real Gravity game page (June 2019) — includes the inline `window.Quizlet["gravityModeData"]` payload with real terms/options |
| `archived-page-2023.html` | Full HTML snapshot of a Gravity page from Sept 2023 (final era of the game) |
| `gravityModeData-2019.json` / `gravityModeData-2023.json` | Parsed game-boot data (terms, options, planet paths) that the game bundle consumed at runtime |

## 1. Play the archived version right now (no coding)

The Wayback Machine replay often boots the game because the terms are embedded server-side in the page:

- `https://web.archive.org/web/20190609163653/https://quizlet.com/100056322/gravity`
- `https://web.archive.org/web/20230928234054/https://quizlet.com/10051542/gravity`
- `https://web.archive.org/web/20160630053444/https://quizlet.com/100822460/gravity` (2016-era look)

To check snapshots of **your own study set**, open:
`https://web.archive.org/web/2023/https://quizlet.com/<SET_ID>/gravity`
(Wayback redirects to the closest snapshot it has. Note: high-score saving, login, TTS audio and other API calls are dead server-side, so those parts will fail silently.)

## 2. Download the ORIGINAL game code (the exact files Quizlet served)

The game's own JS bundle is archived — **80+ deploy versions from 2017 to Jan 2024**.

Raw-download formula (the `id_` flag gives you the unmodified original bytes):

```
https://web.archive.org/web/<TIMESTAMP>id_/<ORIGINAL_ASSET_URL>
```

### The game bundle itself (verified 200-status snapshots)

Final era (assets.quizlet.com, 2020→Jan 2024), samples:
```
https://web.archive.org/web/20240106112521id_/https://assets.quizlet.com/a/j/dist/gravity.1e63caa21a5af6d5.js
https://web.archive.org/web/20230202065521id_/https://assets.quizlet.com/a/j/dist/gravity.1c12830e823a23626a62.js
https://web.archive.org/web/20220618102100id_/https://assets.quizlet.com/a/j/dist/gravity.0348ca581b1b91a0c5e0.js
https://web.archive.org/web/20211002104819id_/https://assets.quizlet.com/a/j/dist/gravity.011afe742e9ddee47f19.js
```
(60+ more versions exist — enumerate them with the CDX query in section 3.)

Classic era (quizlet.com, 2017–2020), samples:
```
https://web.archive.org/web/20200403004400id_/https://quizlet.com/a/j/dist/gravity.8b6b7176778ca618af86.js
https://web.archive.org/web/20190110111652id_/https://quizlet.com/a/j/dist/gravity.4d5984f842e809f6dda6.a.js
https://web.archive.org/web/20180116151227id_/https://quizlet.com/a/j/dist/gravity.d56b9739b8474c4a11e9.a.js
https://web.archive.org/web/20170325120427id_/https://quizlet.com/a/j/dist/gravity.ee7d7e115e02110e8642.js
```

### The Gravity CSS (the exact "look")

```
https://web.archive.org/web/20230928234054id_/https://assets.quizlet.com/a/j/dist/c/gravity.4194bc4c603b506.css. /THIS IS THE GOLDEN LINK!
https://web.archive.org/web/20190609163653id_/https://quizlet.com/a/c/gravity/index.w6rCU.n.css
```
Supporting stylesheets on the same snapshot: `c/global.*.css`, `c/mode.*.css`, `c/highscores.*.css`, `c/common.*.css`, `c/ui.*.css`

### The planet images (levels 1–3)

```
https://web.archive.org/web/20230928234054id_/https://assets.quizlet.com/a/j/dist/app/i/gravity/planets/level1-placeholder.ea4b94e649865cc.png
https://web.archive.org/web/20230928234054id_/https://assets.quizlet.com/a/j/dist/app/i/gravity/planets/level2.0a74a6bd7817131.png
https://web.archive.org/web/20230928234054id_/https://assets.quizlet.com/a/j/dist/app/i/gravity/planets/level3.b66c0f0fc26a3e3.png
```

### The font (Hurme Geometric Sans No. 2)

```
https://web.archive.org/web/20230928234054id_/https://assets.quizlet.com/a/j/dist/app/i/fonts/latin-basic/hurmegeosans-no2-400.70b8c5c1cdc338a.woff2
```
(plus 600/700 weights, latin-sup/latin-ext subsets — same folder pattern)

### Runtime dependencies (loaded on the game pages)

`main.*.js`, `common.*.js`, `react.*.js`, `redux.*.js`, `immutable.*.js`, `quizlet_global.*.js`, `quizlet_shared_kotlin.*.js`, `grader.*.js`, `countdown.*.js`, `header_and_common.*.js`, `rich_text_rendering.*.js` — exact hashed filenames per snapshot are listed in the `archived-page-*.html` files in this folder (view their `<script src=...>` tags).

## 3. Enumerate everything yourself (CDX API)

Paste these in a browser:

```
https://web.archive.org/cdx/search/cdx?url=quizlet.com&matchType=domain&filter=urlkey:.*gravity.*&collapse=urlkey&output=json&limit=500
https://web.archive.org/cdx/search/cdx?url=assets.quizlet.com/a/j/dist/gravity&matchType=prefix&collapse=urlkey&output=json&limit=200
https://web.archive.org/cdx/search/cdx?url=assets.quizlet.com/a/j/dist/c/gravity&matchType=prefix&collapse=urlkey&output=json&limit=100
https://web.archive.org/cdx/search/cdx?url=assets.quizlet.com/a/j/dist/app/i/gravity&matchType=prefix&collapse=urlkey&output=json&limit=100
```

Each row = [timestamp, original URL, HTTP status]. Build the download URL as
`https://web.archive.org/web/<timestamp>id_/<original URL>`.

## 4. How the original game actually worked (from the snapshots)

- URL route: `quizlet.com/<setID>/gravity` (modeType 13; earlier "Space Race" was the Flash predecessor)
- The server rendered the page with a big inline payload: `window.Quizlet["gravityModeData"] = {...}` — terms (word/definition/TTS URLs), options (`showingTermSide`, `selectedOnly`, `acceptsPartialAnswer`, `hasPhotoOnlyDefinitions`), planet asset paths
- The page then loaded hashed webpack bundles from `quizlet.com/a/j/dist/` (2017–2020) and later `assets.quizlet.com/a/j/dist/` (2020–2024); the game itself lives in `gravity.<hash>.js`
- Answer grading used the shared `grader.*.js` bundle; high scores posted to Quizlet's web API (server-side, unrecoverable)
- ⚠️ Caveats for a local revival: the bundle is minified/webpacked, depends on sibling bundles + `window.Quizlet` globals, and some hash-named assets were never captured. A drop-in rehost needs patching of data loading + API stubs.

## 5. Existing community revivals (all reimplementations, none use original code)

- Kysariin's dupe (the one you found): https://github.com/Kysariin/quizlet_gravity — from-scratch tribute with self-drawn art (that's why it looks different)
- dleiferives' replacement (live): https://dleiferives.github.io/gravity.html — from the r/quizlet "Gravity Replacement (Working and in Dev)" thread
- Firefox "Quizlet Gravity Injector": https://addons.mozilla.org/en-US/firefox/addon/quizlet-gravity-injector/ — ground-up remake injected into quizlet.com set pages, local leaderboards

## 6. Legal note

The bundles above are Quizlet's proprietary, copyrighted code. Retrieving archived copies for **personal study / personal revival** is one thing; re-publishing or redistributing the code or assets is not OK. A faithful clean-room reimplementation using the CSS/images for personal use is the safer long-term route.
