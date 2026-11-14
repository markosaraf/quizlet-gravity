// Exercise real gameplay and the missed-answer field without writing scores/accounts.
import assert from 'node:assert/strict';
import { chromium, webkit, expect } from '@playwright/test';
const base = process.env.BASE_URL || 'http://localhost:3104';
for (const [name, engine] of [['Chromium', chromium], ['WebKit', webkit]]) {
  const browser = await engine.launch();
  try {
    const page = await browser.newPage({ viewport: { width: 390, height: 844 }, hasTouch: true, isMobile: true });
    const errors = []; page.on('pageerror', error => errors.push(error.message));
    await page.addInitScript(() => document.addEventListener('DOMContentLoaded', () => { document.documentElement.dataset.gravityInput = 'touch'; }));
    await page.route('**/api/**', route => route.request().method() === 'GET' ? route.continue() : route.fulfill({ status: 200, body: '{}' }));
    await page.goto(`${base}/example`);
    if (base.includes('localhost')) await page.addStyleTag({content:'nextjs-portal { display: none; }'});
    await page.locator('.glass-keyboard').waitFor({ timeout: 60000 });
    async function check(selector) {
      const field = page.locator(selector);
      await field.waitFor();
      // Wait for the copy modal's initial focus timer before testing placement.
      await page.waitForTimeout(500);
      await field.fill('1'.repeat(100));
      await expect.poll(async () => (await field.boundingBox()).height).toBeGreaterThan(55);
      const box = await field.boundingBox(), keyboard = await page.locator('.glass-keyboard').boundingBox();
      assert.ok(box.height > 55, `${name}: ${selector} grows for wrapped text`);
      assert.ok(box.y + box.height < keyboard.y, `${name}: no keyboard overlap`);
      assert.ok(await field.evaluate(el => el.scrollHeight <= el.clientHeight + 1), `${name}: second line visible`);
      const point = await field.evaluate(el => {
        const s = getComputedStyle(el), c = document.createElement('canvas').getContext('2d'); c.font = s.font;
        const r = el.getBoundingClientRect();
        return { x: r.x + parseFloat(s.borderLeftWidth) + parseFloat(s.paddingLeft) + c.measureText('11').width,
          y: r.y + parseFloat(s.borderTopWidth) + parseFloat(s.paddingTop) + parseFloat(s.lineHeight) / 2 };
      });
      await page.touchscreen.tap(point.x, point.y); await page.waitForTimeout(40);
      assert.equal(await field.evaluate(el => el.selectionStart), 2, `${name}: tap positions caret in first line`);
      await page.getByRole('button', { name: '7', exact: true }).tap();
      assert.equal(await field.inputValue(), '117' + '1'.repeat(98), `${name}: insert without losing rest of answer`);
      await page.getByRole('button', { name: 'ABC', exact: true }).tap();
      const space = await page.getByRole('button', { name: 'space', exact: true }).boundingBox();
      await page.mouse.move(space.x + space.width / 2, space.y + space.height / 2);
      await page.mouse.down(); await page.waitForTimeout(350);
      await page.mouse.move(space.x + space.width / 2 - 24, space.y + space.height / 2);
      await page.mouse.up();
      assert.equal(await field.evaluate(el => el.selectionStart), 1, `${name}: space drag moves cursor left`);
      await page.getByRole('button', { name: 'x', exact: true }).tap();
      assert.equal(await field.inputValue(), '1x17' + '1'.repeat(98));
      await field.fill('1'); await expect.poll(async () => (await field.boundingBox()).height).toBe(55);
      await page.getByRole('button', { name: '123', exact: true }).tap();
      console.log(`PASS ${name} ${selector}: wrapping, touch placement, insertion and spacebar cursor`);
    }
    await check('.GravityTypingPrompt-input');
    await page.keyboard.press('Escape');
    await check('.GravityCopyTermView-input');
    await page.locator('.GravityCopyTermView-input').fill('Long answers grow upward and stay above the transparent keyboard.');
    await page.screenshot({ path: `/tmp/gravity-answer-editing-${name}.png` });
    assert.deepEqual(errors, []);
  } finally { await browser.close(); }
}
