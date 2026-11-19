# Quizlet Gravity

**This is the current repository for [quizletgravity.com](https://www.quizletgravity.com/) and my Android, iPhone, iPad and Mac apps.** For the older version without accounts or online leaderboards, see [Quizlet Gravity Classic](https://github.com/markosaraf/quizlet-gravity-classic-no-leaderboards).

[Play Quizlet Gravity](https://www.quizletgravity.com/) — my recreation of Quizlet's original falling-asteroid study game, available on the web and as Android, iPhone, iPad and Mac apps.

I started by studying archived Gravity pages, JavaScript, CSS and assets to recreate the original game as closely as possible. Since then, I've added shared study games, accounts and online leaderboards. I want to preserve the original game's behaviour while making it easier to create, share and learn from your own study material.

To play, type the matching term or definition before an asteroid lands.

## Play and learn

- Create study games, paste terms, upload CSV files, or import Quizlet sets.
- Share public games with their own links, searchable titles and term/definition previews.
- Play as a guest or create an account; keep a personal best on each game's leaderboard.
- Choose difficulty, answer side and starred terms; learn missed answers before continuing.
- Use responsive game controls, special-character input and adjustable text/asteroid size.

## Level-up animation

I restored the level-up animation to the original Quizlet Gravity timing, planet movement and level-up badge. I fixed the third planet’s abrupt spawn by staging it just outside the playfield and sliding it in from the right, so it reaches its position alongside the other planets. On mobile, its speed and easing follow the second planet’s movement. Preparing the small planet texture at its displayed size also prevents Safari from skipping part of the slide.

My first implementation of the planet-spawn fix used a much slower transition. After comparing it with the original, I decided against using that animation. I keep both the original animation code and my earlier slow implementation in the [animation history](docs/animation-history/README.md) as reference files.

## About the two repositories

- **[quizlet-gravity](https://github.com/markosaraf/quizlet-gravity) — current version:** this is where I develop the website and apps, including shared games, accounts and online leaderboards. Use this repository to run or contribute to the current version.
- **[quizlet-gravity-classic-no-leaderboards](https://github.com/markosaraf/quizlet-gravity-classic-no-leaderboards) — historical snapshot:** I kept the 6 November 2026 version as a reference from before I added accounts, shared games and online leaderboards. It is not the source of the current live site.

## Source layout
- `src/lib/gravity/`: game state and rules; `src/components/gravity/`: gameplay; `src/gravity/gravity.css`: game presentation.
- `src/components/community/` and `src/app/api/`: shared games and accounts.
- `mobile/`: Android and Apple app sources and build instructions.

## Original Quizlet Gravity sources — permanent reference

These are the Web Archive sources I used to study the original Gravity game: playable page snapshots, game logic, styles, images and fonts.

These links come from my source collection dated **3 September 2026**. I keep the complete historical notes unchanged in [the original recovery kit](docs/original-gravity-recovery-kit.md). Availability and verification claims in that document refer to the collection date.

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

This is my independent project, and I am not affiliated with Quizlet. I keep these references to document how I developed it. Quizlet's original code and artwork remain their property.

## Run and develop locally

Use Node.js 24. Run `npm ci`, configure an ignored `.env.local` from `.env.example`, then run `npm run dev -- --port 3035`. Check changes with `npm run typecheck` and `npm test`.

See [development and operations](docs/development.md) for database schemas, indexing, authentication and deployment configuration, and [mobile build instructions](mobile/BUILDING.md) for apps. Keep credentials and release signing material outside Git.
