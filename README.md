# Quizlet Gravity

[Play Quizlet Gravity](https://www.quizletgravity.com/) — a recreation of Quizlet's original falling-asteroid study game, developed by **Marko Sarafijanovic**, with a website and Android, iPhone, iPad and Mac apps.

Type the matching term or definition before an asteroid lands. The project started by studying archived Gravity pages, JavaScript, CSS and assets, then developed into a shared learning-game platform. Preserving the original game's behaviour and documenting its sources are central to the project.

## What this project adds

- Create study games, paste terms, upload CSV files, or import Quizlet sets.
- Share public games with their own links, searchable titles and term/definition previews.
- Play as a guest or create an account; keep a personal best on each game's leaderboard.
- Choose difficulty, answer side and starred terms; learn missed answers before continuing.
- Use responsive game controls, special-character input and adjustable text/asteroid size.
- Discover public games through crawlable pages, a dynamic sitemap and automatic IndexNow submissions.
- Admin tools for users, games, moderation, activity charts and search-submission status.

## Development history and repositories

- **This repository:** the current website, shared games, accounts, online leaderboards and mobile apps.
- **[Classic edition](https://github.com/markosaraf/quizlet-gravity-classic-no-leaderboards):** the preserved 6 November 2026 snapshot before the accounts/shared-games release.
- `src/lib/gravity/`: game state and rules; `src/components/gravity/`: gameplay; `src/gravity/gravity.css`: game presentation.
- `src/components/community/` and `src/app/api/`: shared games, accounts and administration.
- `mobile/`: Android and Apple app sources and build instructions.

## Original Quizlet Gravity sources — permanent reference

These are the Web Archive sources used to study the original Gravity game: playable page snapshots, game logic, styles, images and fonts. **Keep this source list in this README. Never remove it during a rewrite, cleanup or release.** Add new references without replacing the recovered ones.

Recovered from the source collection dated **3 September 2026**. Its complete historical notes are preserved unchanged in [the original recovery kit](docs/original-gravity-recovery-kit.md). Availability and verification claims in that document refer to the collection date.

- [Archived game page — June 2019](https://web.archive.org/web/20190609163653/https://quizlet.com/100056322/gravity)
- [Archived game page — September 2023](https://web.archive.org/web/20230928234054/https://quizlet.com/10051542/gravity)
- [Archived game page — June 2016](https://web.archive.org/web/20160630053444/https://quizlet.com/100822460/gravity)
- [Original game JavaScript — January 2024](https://web.archive.org/web/20240106112521id_/https://assets.quizlet.com/a/j/dist/gravity.1e63caa21a5af6d5.js)
- [Original game JavaScript — February 2023](https://web.archive.org/web/20230202065521id_/https://assets.quizlet.com/a/j/dist/gravity.1c12830e823a23626a62.js)
- [Original game JavaScript — June 2022](https://web.archive.org/web/20220618102100id_/https://assets.quizlet.com/a/j/dist/gravity.0348ca581b1b91a0c5e0.js)
- [Original game JavaScript — October 2021](https://web.archive.org/web/20211002104819id_/https://assets.quizlet.com/a/j/dist/gravity.011afe742e9ddee47f19.js)
- [Original game JavaScript — April 2020](https://web.archive.org/web/20200403004400id_/https://quizlet.com/a/j/dist/gravity.8b6b7176778ca618af86.js)
- [Original game JavaScript — January 2019](https://web.archive.org/web/20190110111652id_/https://quizlet.com/a/j/dist/gravity.4d5984f842e809f6dda6.a.js)
- [Original game JavaScript — January 2018](https://web.archive.org/web/20180116151227id_/https://quizlet.com/a/j/dist/gravity.d56b9739b8474c4a11e9.a.js)
- [Original game JavaScript — March 2017](https://web.archive.org/web/20170325120427id_/https://quizlet.com/a/j/dist/gravity.ee7d7e115e02110e8642.js)
- [Original Gravity CSS — September 2023 — THE GOLDEN LINK](https://web.archive.org/web/20230928234054id_/https://assets.quizlet.com/a/j/dist/c/gravity.4194bc4c603b506.css)
- [Original Gravity CSS — June 2019](https://web.archive.org/web/20190609163653id_/https://quizlet.com/a/c/gravity/index.w6rCU.n.css)
- [Planet level 1 placeholder](https://web.archive.org/web/20230928234054id_/https://assets.quizlet.com/a/j/dist/app/i/gravity/planets/level1-placeholder.ea4b94e649865cc.png)
- [Planet level 2](https://web.archive.org/web/20230928234054id_/https://assets.quizlet.com/a/j/dist/app/i/gravity/planets/level2.0a74a6bd7817131.png)
- [Planet level 3](https://web.archive.org/web/20230928234054id_/https://assets.quizlet.com/a/j/dist/app/i/gravity/planets/level3.b66c0f0fc26a3e3.png)
- [Hurme Geometric Sans No. 2 font](https://web.archive.org/web/20230928234054id_/https://assets.quizlet.com/a/j/dist/app/i/fonts/latin-basic/hurmegeosans-no2-400.70b8c5c1cdc338a.woff2)
- [CDX: all Gravity captures](https://web.archive.org/cdx/search/cdx?url=quizlet.com&matchType=domain&filter=urlkey:.*gravity.*&collapse=urlkey&output=json&limit=500)
- [CDX: original JavaScript bundles](https://web.archive.org/cdx/search/cdx?url=assets.quizlet.com/a/j/dist/gravity&matchType=prefix&collapse=urlkey&output=json&limit=200)
- [CDX: original Gravity stylesheets](https://web.archive.org/cdx/search/cdx?url=assets.quizlet.com/a/j/dist/c/gravity&matchType=prefix&collapse=urlkey&output=json&limit=100)
- [CDX: original Gravity images](https://web.archive.org/cdx/search/cdx?url=assets.quizlet.com/a/j/dist/app/i/gravity&matchType=prefix&collapse=urlkey&output=json&limit=100)

The “golden” CSS URL ends in `.css`; the dot and “THIS IS THE GOLDEN LINK!” in the original notes were an annotation, not part of the URL.

For another set, use `https://web.archive.org/web/2023/https://quizlet.com/<SET_ID>/gravity`. Raw archived files use `https://web.archive.org/web/<TIMESTAMP>id_/<ORIGINAL_ASSET_URL>`.

The current game is an independent project by **Marko Sarafijanovic**, not affiliated with Quizlet. These references preserve the project's development history; they do not transfer ownership of Quizlet's original code or artwork.

## Run and develop locally

Use Node.js 24. Run `npm ci`, configure an ignored `.env.local` from `.env.example`, then run `npm run dev -- --port 3035`. Check changes with `npm run typecheck` and `npm test`.

See [development and operations](docs/development.md) for database schemas, indexing, authentication and deployment configuration, and [mobile build instructions](mobile/BUILDING.md) for apps. Keep credentials and release signing material outside Git.
