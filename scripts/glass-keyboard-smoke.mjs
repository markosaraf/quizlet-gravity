// Run with: node scripts/glass-keyboard-smoke.mjs
// Exercise the real component with browser input, without accounts or database writes.
import assert from 'node:assert/strict';
import { build } from 'esbuild';
import { chromium, webkit } from '@playwright/test';
import { createServer } from 'node:http';
import { mkdtemp, readFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

const directory = await mkdtemp(join(tmpdir(), 'gravity-keyboard-'));
await build({
  stdin: { contents: `
    import React, {useRef, useState, useEffect} from 'react';
    import {createRoot} from 'react-dom/client';
    import {flushSync} from 'react-dom';
    import {GlassKeyboard} from './src/components/gravity/GlassKeyboard';
    import './src/gravity/gravity.css';
    function Fixture() {
      const inputRef=useRef(null);
      const [value,setValue]=useState(''),[mode,setMode]=useState('text');
      const [submitted,setSubmitted]=useState(''),[generation,setGeneration]=useState(0);
      useEffect(()=>{window.keyboardTest={reset(text='',mode='text') {
        flushSync(()=>{setValue(text);setMode(mode);setSubmitted('');setGeneration(n=>n+1);});
        inputRef.current.focus();inputRef.current.setSelectionRange(text.length,text.length);
      }};},[]);
      return <><div className="GravityGameplayView-typingPrompt"><div className="GravityTypingPrompt"><div className="GravityTypingPrompt-inner"><div className="GravityTypingPrompt-inputWrapper"><textarea className="GravityTypingPrompt-input" aria-label="Answer" ref={inputRef} value={value} inputMode="none" onChange={e=>setValue(e.target.value)}/></div></div></div></div>
        <output data-testid="submitted">{submitted}</output>
        <GlassKeyboard key={generation} inputRef={inputRef} mode={mode} specialChars={['ä','é','ñ']} onChange={setValue}
          onSubmit={()=>{setSubmitted(inputRef.current.value);setValue('');}}/></>;
    }
    createRoot(document.getElementById('root')).render(<Fixture/>);
  `, loader: 'jsx', resolveDir: process.cwd() },
  external: ['/assets/*', '/*.svg'], bundle: true, outfile: join(directory, 'fixture.js'), jsx: 'automatic',
});
const server = createServer(async (req, res) => {
  if (req.url?.startsWith('/assets/') && !req.url.includes('..')) {
    try { res.end(await readFile(join(process.cwd(), 'public', req.url))); } catch { res.statusCode=404;res.end(); }
  } else if (req.url === '/fixture.js' || req.url === '/fixture.css') {
    res.setHeader('Content-Type', req.url.endsWith('.js') ? 'text/javascript' : 'text/css');
    res.end(await readFile(join(directory, req.url.slice(1))));
  } else {
    res.setHeader('Content-Type', 'text/html');
    res.end('<!doctype html><meta name="viewport" content="width=device-width,initial-scale=1"><link rel="stylesheet" href="/fixture.css"><div id="root"></div><script src="/fixture.js"></script>');
  }
});
await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
const url = `http://127.0.0.1:${server.address().port}`;
try {
  for (const [name, engine] of [['Chromium', chromium], ['WebKit', webkit]]) {
    const browser = await engine.launch({headless:true});
    try {
      const page = await browser.newPage({viewport:{width:390,height:844},hasTouch:true});
      page.setDefaultTimeout(10000);
      const errors=[]; page.on('pageerror', e=>errors.push(e.message));
      await page.goto(url); await page.waitForFunction(()=>!!window.keyboardTest);
      const answer=page.getByRole('textbox',{name:'Answer'});
      const key=label=>page.getByRole('button',{name:label,exact:true});
      const mainKey=label=>page.locator('.letter-grid').getByRole('button',{name:label,exact:true});
      const reset=(text='',mode='text')=>page.evaluate(([text,mode])=>window.keyboardTest.reset(text,mode),[text,mode]);
      const cdp=name==='Chromium'?await page.context().newCDPSession(page):null;
      async function point(label,id) {
        const box=await key(label).boundingBox();assert.ok(box,label);
        return {id,x:box.x+box.width/2,y:box.y+box.height/2};
      }
      async function overlap(first,second) {
        if(cdp) {
          const a=await point(first,1),b=await point(second,2);
          await cdp.send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[a]});
          await cdp.send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[a,b]});
          await cdp.send('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[b]});
          await cdp.send('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[]});
        } else {
          // WebKit automation has no native multi-touch API: exercise both pointer IDs.
          for (const [label,id,primary] of [[first,1,true],[second,2,false]]) {
            await key(label).dispatchEvent('pointerdown',{pointerId:id,pointerType:'touch',isPrimary:primary,button:0,buttons:1});
          }
          for (const [label,id] of [[first,1],[second,2]]) {
            await key(label).dispatchEvent('pointerup',{pointerId:id,pointerType:'touch',button:0,buttons:0});
          }
        }
      }
      await overlap('a','b');
      assert.equal(await answer.inputValue(),'ab',`${name}: overlapping two-finger taps must preserve both letters`);
      await reset();
      for(let i=0;i<10;i++) await overlap('a','b');
      assert.equal(await answer.inputValue(),'ab'.repeat(10),`${name}: sustained alternating taps`);
      await reset();
      for(let i=0;i<6;i++) await key('a').tap();
      assert.equal(await answer.inputValue(),'aaaaaa',`${name}: single taps must not double-insert`);
      await reset('', 'decimal');
      await key('7').waitFor();await overlap('7','8');
      assert.equal(await answer.inputValue(),'78',`${name}: numeric overlap`);
      await key('Delete').tap();assert.equal(await answer.inputValue(),'7',`${name}: delete once`);
      await key('Submit answer').tap();
      assert.equal(await page.getByTestId('submitted').innerText(),'7',`${name}: submit latest input`);
      assert.equal(await answer.inputValue(),'');
      await reset('', 'text');await key('a').waitFor();
      await key('Shift').tap();await key('a').tap();await key('b').tap();
      assert.equal(await answer.inputValue(),'Ab',`${name}: shift applies once`);
      await reset();await mainKey('é').tap();
      await mainKey('ñ').tap();assert.equal(await answer.inputValue(),'ñ',`${name}: accent layout`);
      await reset();await key('a').waitFor();await key('a').focus();await page.keyboard.press('Enter');
      assert.equal(await answer.inputValue(),'a',`${name}: accessible keyboard activation`);
      await reset('abcd');await answer.evaluate(el=>el.setSelectionRange(1,3));await key('x').tap();
      assert.equal(await answer.inputValue(),'axd',`${name}: selected text replacement`);
      await reset('abcdefghij');
      // Holding Delete repeats, and releasing it must stop all future deletion.
      const box=await key('Delete').boundingBox();
      await page.mouse.move(box.x+box.width/2,box.y+box.height/2);await page.mouse.down();
      await page.waitForTimeout(600);await page.mouse.up();
      const remaining=await answer.inputValue();assert.ok(remaining.length<9,`${name}: held delete repeats`);
      await page.waitForTimeout(150);assert.equal(await answer.inputValue(),remaining,`${name}: delete stops on release`);
      await reset('1111111111');
      const initial = await answer.boundingBox();
      // Measure a character using the browser font, then tap between digits 2 and 3.
      const tap = await answer.evaluate(el => {
        const style=getComputedStyle(el),canvas=document.createElement('canvas'),context=canvas.getContext('2d');
        context.font=style.font;
        const box=el.getBoundingClientRect();
        return {x:box.x+parseFloat(style.borderLeftWidth)+parseFloat(style.paddingLeft)+context.measureText('11').width,
          y:box.y+parseFloat(style.borderTopWidth)+parseFloat(style.paddingTop)+parseFloat(style.lineHeight)/2};
      });
      await page.touchscreen.tap(tap.x,tap.y);await page.waitForTimeout(40);
      assert.equal(await answer.evaluate(el=>el.selectionStart),2,`${name}: touch places caret between digits`);
      await key('x').tap();assert.equal(await answer.inputValue(),'11x11111111');
      await reset('1111111111'.repeat(5));
      const grown=await answer.boundingBox(), keyboard=await page.locator('.glass-keyboard').boundingBox();
      assert.ok(grown.height>initial.height,`${name}: wrapped answer grows`);
      assert.ok(Math.abs(grown.y+grown.height-initial.y-initial.height)<2,`${name}: answer grows upward`);
      assert.ok(grown.y+grown.height<keyboard.y,`${name}: answer stays above keyboard`);
      assert.equal(await answer.evaluate(el=>el.scrollHeight<=el.clientHeight+1),true,`${name}: wrapped lines visible`);
      const special=await page.locator('.glass-special-characters').boundingBox();
      assert.ok(special.y+special.height<grown.y,`${name}: special characters move above growing answer`);
      await reset('11111\n11111');
      const rowPoint=await answer.evaluate(el=>{
        const s=getComputedStyle(el),ctx=document.createElement('canvas').getContext('2d');ctx.font=s.font;
        const r=el.getBoundingClientRect();return {x:r.x+parseFloat(s.borderLeftWidth)+parseFloat(s.paddingLeft)+ctx.measureText('11').width,
          y:r.y+parseFloat(s.borderTopWidth)+parseFloat(s.paddingTop)+parseFloat(s.lineHeight)*1.5};
      });
      await page.touchscreen.tap(rowPoint.x,rowPoint.y);await page.waitForTimeout(40);
      assert.equal(await answer.evaluate(el=>el.selectionStart),8,`${name}: tapping the second line positions the caret`);
      await reset('abc');assert.equal((await answer.boundingBox()).height,initial.height,`${name}: deletion shrinks field`);
      await key('space').tap();assert.equal(await answer.inputValue(),'abc ',`${name}: tap space inserts once`);
      await reset('abcdef');
      const space=await key('space').boundingBox(), sx=space.x+space.width/2,sy=space.y+space.height/2;
      async function slideSpace(moves, hold=350, cancel=false) {
        if(cdp) {
          const pt=x=>({id:10,x,y:sy});
          await cdp.send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[pt(sx)]});
          await page.waitForTimeout(hold);
          for(const delta of moves) await cdp.send('Input.dispatchTouchEvent',{type:'touchMove',touchPoints:[pt(sx+delta)]});
          await cdp.send('Input.dispatchTouchEvent',{type:cancel?'touchCancel':'touchEnd',touchPoints:[]});
        } else {
          await page.mouse.move(sx,sy);await page.mouse.down();await page.waitForTimeout(hold);
          for(const delta of moves) await page.mouse.move(sx+delta,sy);
          if(cancel) await key('space').dispatchEvent('pointercancel',{pointerId:1});
          await page.mouse.up();
        }
      }
      await slideSpace([-36]);
      assert.equal(await answer.inputValue(),'abcdef',`${name}: held space never inserts a space`);
      assert.equal(await answer.evaluate(el=>el.selectionStart),3,`${name}: slide left moves caret`);
      await key('x').tap();assert.equal(await answer.inputValue(),'abcxdef',`${name}: insert at dragged caret`);
      await slideSpace([24]);assert.equal(await answer.evaluate(el=>el.selectionStart),6,`${name}: slide right moves caret`);
      await reset('A👨‍👩‍👧‍👦éB');
      await slideSpace([-24]);assert.equal(await answer.evaluate(el=>el.selectionStart),12,`${name}: caret respects grapheme boundaries`);
      await reset('abc');await slideSpace([],50,true);
      assert.equal(await answer.inputValue(),'abc',`${name}: cancelled space does not insert`);
      await reset('a');await overlap('space','b');
      assert.equal(await answer.inputValue(),'a b',`${name}: overlapping space and letter preserve order`);
      await reset('1'.repeat(300));
      const capped=await answer.boundingBox();
      assert.ok(capped.height<220,`${name}: long answers leave room for the game`);
      assert.ok(await answer.evaluate(el=>el.scrollHeight>el.clientHeight),`${name}: long answers scroll`);
      assert.deepEqual(errors,[],`${name}: browser errors`);
      console.log(`PASS ${name}: overlapping taps, sustained typing, numbers, deletion, submit, shift, accents, accessible activation, touch caret, upward resizing and spacebar cursor gestures.`);
    } finally { await browser.close(); }
  }
} finally { await new Promise(resolve=>server.close(resolve)); await rm(directory,{recursive:true,force:true}); }
