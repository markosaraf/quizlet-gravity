# Level-up animation history

I kept these reference snapshots on 19 November 2026 when I replaced my slower transition with the original Quizlet Gravity timing and a continuous third-planet entry.

These files are stored as `.txt` outside the application source and public assets. They are not imported, served as game scripts, or selectable in gameplay.

## Original Quizlet Gravity

- [Original January 2024 JavaScript bundle](original-quizlet-gravity-2024.js.txt), including `GravityPlanet.getAnimation`, the velocity-react scheduling, and the 2,300 ms level-up phase.
- [Original recovered Gravity CSS](original-quizlet-gravity.css.txt), including the badge’s 500 ms delay and 1,500 ms animation.
- [Web Archive JavaScript source](https://web.archive.org/web/20240106112521id_/https://assets.quizlet.com/a/j/dist/gravity.1e63caa21a5af6d5.js)
- [Web Archive CSS source — the golden link](https://web.archive.org/web/20230928234054id_/https://assets.quizlet.com/a/j/dist/c/gravity.4194bc4c603b506.css)

The original artwork and game code remain Quizlet’s property. The recovered Velocity 1.5.2 engine retains its MIT copyright notices; the live implementation uses that engine to retain the original interpolation and scheduling.

## My earlier slow transition

Saved from commit `b29d6a7f27637f7596b93a32f1dc290882598141` before replacement:

- [Planet component](slow-1500ms-Planet.tsx.txt): 1,500 ms ease-out transitions with a 3,141 px horizontal entry path.
- [Level-up badge component](slow-LevelUpBadge.tsx.txt).
- [Styles](slow-gravity.css.txt): my former 3.141-second badge animation.
- [Timing constants](slow-constants.ts.txt): my former 3,141 ms level-up phase.

This was my first attempt to avoid the third planet appearing abruptly. I decided against it because it was much slower than the original animation.

## Approved replacement

[The local comparison source](approved-local-comparison.js.txt) records the approved 500 ms option, with the third planet sliding in, the phone motion following the second planet, and the Safari texture fix. The 1,000 ms comparison option remains in this reference snapshot only.

The maintained gameplay implementation is in [`Planet.tsx`](../../src/components/gravity/Planet.tsx) and [`planet-animation.ts`](../../src/lib/gravity/planet-animation.ts). The badge uses the original timing and stays above the planets. Android’s initial scale is explicitly seeded to avoid the old animation library’s first-scale workaround enlarging a small planet.
