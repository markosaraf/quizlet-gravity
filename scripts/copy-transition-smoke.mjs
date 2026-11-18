// Reproduce typing through the asteroid-impact -> solution-field handoff.
import assert from 'node:assert/strict';
import { build } from 'esbuild';
import { chromium, webkit } from '@playwright/test';
import { createServer } from 'node:http';
import { mkdtemp, readFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
const directory = await mkdtemp(join(tmpdir(), 'gravity-copy-transition-'));
await build({stdin:{contents:`
 import React, {useState, useRef, useEffect} from 'react';
 import {createRoot} from 'react-dom/client';
 import {flushSync} from 'react-dom';
 import {CopyTermView} from './src/components/gravity/CopyTermView';
 import {TypingPrompt} from './src/components/gravity/TypingPrompt';
 import {GAME_STATES} from './src/lib/gravity/constants';
 import './src/gravity/gravity.css';
 function Fixture() {
   const [text,setText]=useState(''),[copy,setCopy]=useState(false),[generation,setGeneration]=useState(0);
   const mainRef=useRef(null),copyRef=useRef(null);
   const submit=()=>{};
   useEffect(()=>{window.transitionTest={reset(value) {
     flushSync(()=>{setCopy(false);setText(value);setGeneration(n=>n+1);});
   },impact() {flushSync(()=>setCopy(true));}};});
   return <div className="GravityGameplayView"><div className="GravityGameplayView-inner">
     {copy&&<div className="GravityGameplayView-copyTermWrapper"><CopyTermView key={generation}
       term={{word:'prompt',definition:'abcdefghijklmnopqrstuvxyz'}} showingSide="word" previouslyTypedText={text}
       specialChars={[]} insertRef={copyRef} onSubmit={submit} liveTermId="transition-term"/></div>}
     <div className="GravityGameplayView-typingPrompt"><TypingPrompt gameState={copy?GAME_STATES.COPY_ANSWER:GAME_STATES.FREE_FALL}
       textValue={text} placeholderText="Answer" expectedAnswer="abcdefghijklmnopqrstuvxyz" specialChars={[]}
       insertRef={mainRef} onInsertChar={()=>{}} onChange={setText} onSubmit={()=>{}}/></div>
   </div></div>;
 }
 createRoot(document.getElementById('root')).render(<Fixture/>);
`,loader:'jsx',resolveDir:process.cwd()},bundle:true,outfile:join(directory,'fixture.js'),jsx:'automatic',external:['/assets/*','/*.svg']});
const server=createServer(async(req,res)=>{
 if(req.url==='/fixture.js'||req.url==='/fixture.css'){
   res.setHeader('Content-Type',req.url.endsWith('.js')?'text/javascript':'text/css');
   res.end(await readFile(join(directory,req.url.slice(1))));
 }else if(req.url?.startsWith('/assets/')&&!req.url.includes('..')){
   try{res.end(await readFile(join(process.cwd(),'public',req.url)));}catch{res.statusCode=404;res.end();}
 }else{
   res.setHeader('Content-Type','text/html');
   res.end('<!doctype html><html data-gravity-input="touch"><meta name="viewport" content="width=device-width,initial-scale=1"><link rel="stylesheet" href="/fixture.css"><div id="root"></div><script src="/fixture.js"></script></html>');
 }
});
await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
let failed=false;
try{
 for(const [name,engine]of [['Chromium',chromium],['WebKit',webkit]]){
  const browser=await engine.launch();
  try{
   const page=await browser.newPage({viewport:{width:390,height:844},hasTouch:true,isMobile:true});
   const errors=[];page.on('pageerror',e=>errors.push(e.message));
   await page.goto(`http://127.0.0.1:${server.address().port}`);
   await page.waitForFunction(()=>!!window.transitionTest);
   const field=page.locator('.GravityCopyTermView-input');
   for(const prefix of ['abc','', 'café 👋']){
    const value=await page.evaluate(prefix=>{
      window.transitionTest.reset(prefix);window.transitionTest.impact();
      // Dispatch in the same task: no automation wait can hide the 500ms race.
      for(const [i,key]of [...'xyz'].entries()){
        const button=document.querySelector('.glass-keyboard button[aria-label="'+key+'"]');
        button.dispatchEvent(new PointerEvent('pointerdown',{bubbles:true,button:0,pointerId:i+1,pointerType:'touch',isPrimary:i===0}));
        button.dispatchEvent(new PointerEvent('pointerup',{bubbles:true,button:0,pointerId:i+1,pointerType:'touch'}));
      }
      return document.querySelector('.GravityCopyTermView-input').value;
    },prefix);
    assert.equal(value,prefix+'xyz',name+': keys during impact must append to carried text');
    // A deliberate edit in the first half-second must survive the old focus timer.
    const tap = await field.evaluate(el => {
      const style=getComputedStyle(el),ctx=document.createElement('canvas').getContext('2d');ctx.font=style.font;
      const box=el.getBoundingClientRect();
      return {x:box.x+parseFloat(style.borderLeftWidth)+parseFloat(style.paddingLeft)+ctx.measureText(el.value[0]).width,
        y:box.y+parseFloat(style.borderTopWidth)+parseFloat(style.paddingTop)+parseFloat(style.lineHeight)/2};
    });
    await page.touchscreen.tap(tap.x,tap.y);
    await page.waitForTimeout(550);
    await page.getByRole('button',{name:'q',exact:true}).tap();
    const expected=(prefix+'xyz').slice(0,1)+'q'+(prefix+'xyz').slice(1);
    assert.equal(await field.inputValue(),expected,name+': delayed focus must not override deliberate editing');
   }
   assert.deepEqual(errors,[]);
   console.log('PASS '+name+': impact-time typing, carried Unicode/empty text, continued typing and deliberate caret edits.');
  }catch(e){failed=true;console.error('FAIL '+name+': '+e.message);}finally{await browser.close();}
 }
}finally{await new Promise(resolve=>server.close(resolve));await rm(directory,{recursive:true,force:true});}
if(failed)process.exitCode=1;
