import assert from 'node:assert/strict';
import { build } from 'esbuild';
import { chromium, webkit } from '@playwright/test';
import { createServer } from 'node:http';
import { readFile } from 'node:fs/promises';

// Exercise the real size hook and planets with the sidebar appearing AFTER
// the options screen has measured the full width, just as starting a game does.
const bundle = await build({
  stdin: { resolveDir: process.cwd(), loader: 'tsx', contents: `
    import React, {useRef, useState} from 'react';
    import {createRoot} from 'react-dom/client';
    import {useGameplaySize} from './src/components/gravity/GameplayView';
    import {Planets} from './src/components/gravity/Planet';
    import {PLANET_ASSET_PATHS} from './src/lib/gravity/constants';
    function Fixture() {
      const ref = useRef(null);
      const size = useGameplaySize(ref);
      const [playing, setPlaying] = useState(false);
      const [level, setLevel] = useState(1);
      window.fixture = {setPlaying, setLevel};
      return <div className="GravityModeLayout"><div className="GravityModeLayout-body">
        {playing && <aside className="GravityModeLayout-sidebar"/>}
        <div className="GravityModeLayout-main" ref={ref} data-measured-width={size.w}>
          <div className="GravityGameplayView"><div className="GravityGameplayView-inner">
            <Planets currentLevel={level} gameState={playing ? 'FREE_FALL' : 'OPTIONS'} windowWidth={size.w || 800} windowHeight={size.h || 600} planetAssetPaths={PLANET_ASSET_PATHS} onLoaded={()=>{}}/>
          </div></div>
        </div>
      </div></div>;
    }
    createRoot(document.getElementById('root')).render(<Fixture/>);
  ` }, bundle: true, write: false, loader: { '.css': 'empty' }, jsx: 'automatic', platform: 'browser',
});
const server = createServer(async (req, res) => {
  if (req.url === '/fixture.js') { res.setHeader('Content-Type', 'text/javascript'); return res.end(bundle.outputFiles[0].contents); }
  if (req.url === '/gravity.css') { res.setHeader('Content-Type', 'text/css'); return res.end(await readFile('src/gravity/gravity.css')); }
  if (req.url.startsWith('/assets/')) { try { return res.end(await readFile('public' + req.url)); } catch { res.statusCode = 404; return res.end(); } }
  res.setHeader('Content-Type', 'text/html');
  res.end('<!doctype html><meta name="viewport" content="width=device-width,initial-scale=1"><link rel="stylesheet" href="/gravity.css"><style>*{box-sizing:border-box}body{margin:0}</style><div id="root"></div><script src="/fixture.js"></script>');
});
await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
try {
  for (const [name, engine] of [['Chromium', chromium], ['WebKit', webkit]]) {
    const browser = await engine.launch();
    try {
      const page = await browser.newPage({ viewport: { width: 1792, height: 1000 } });
      const errors = [];
      page.on('pageerror', error => errors.push(error.message));
      await page.goto('http://127.0.0.1:' + server.address().port);
      await page.waitForFunction(() => document.querySelector('[data-measured-width]')?.dataset.measuredWidth === '1792');
      await page.evaluate(() => window.fixture.setPlaying(true));
      // No browser resize event: the sidebar alone must trigger remeasurement.
      await page.waitForFunction(() => {
        const main = document.querySelector('[data-measured-width]');
        return Number(main.dataset.measuredWidth) === main.offsetWidth;
      }, null, { timeout: 3000 });
      for (const width of [1792, 1280, 768, 390, 320, 1792]) {
        await page.setViewportSize({ width, height: 1000 });
        for (const level of [1, 9, 10, 11]) {
          await page.evaluate(level => window.fixture.setLevel(level), level);
          await page.waitForTimeout(1900); // Let the original 1500ms transition settle.
          const result = await page.evaluate(() => {
            const area = document.querySelector('.GravityGameplayView-inner').getBoundingClientRect();
            return { area: area.toJSON(), planets: [...document.querySelectorAll('.GravityPlanet:not(.is-hidden)')].map(p => ({ rect: p.getBoundingClientRect().toJSON(), loaded: p.querySelector('img').naturalWidth > 0 })) };
          });
          assert.equal(result.planets.length, 3);
          const distant = result.planets.filter(p => p.rect.width < result.area.width);
          assert.equal(distant.length, 2);
          for (const p of distant) {
            assert(p.loaded, 'Visible planet texture must be loaded');
            assert(p.rect.left >= result.area.left && p.rect.right <= result.area.right + 1, `${name} ${width}px level ${level}: distant planet must stay inside the playfield`);
          }
        }
      }
      await page.evaluate(() => window.fixture.setPlaying(false));
      await page.waitForFunction(() => document.querySelector('[data-measured-width]').dataset.measuredWidth === '1792');
      assert.deepEqual(errors, []);
      console.log(`PASS ${name}: sidebar insertion/removal, desktop/mobile resize, three visible planets and level 10 wraparound.`);
    } finally { await browser.close(); }
  }
} finally { await new Promise(resolve => server.close(resolve)); }
