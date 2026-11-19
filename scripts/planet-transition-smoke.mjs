import assert from 'node:assert/strict';
import {build} from 'esbuild';
import {chromium,webkit,devices} from '@playwright/test';
import {createServer} from 'node:http';
import {readFile} from 'node:fs/promises';

// Real gameplay, real store and controls; no production account or scores.
const bundle=await build({stdin:{resolveDir:process.cwd(),loader:'tsx',contents:`
 import React from 'react';import{createRoot}from'react-dom/client';
 import{GravityApp}from'./src/components/gravity/GravityApp';
 import{gravityStore}from'./src/lib/gravity/store';
 const game={set:{id:'animation-test',title:'Animation test',wordLang:'en',defLang:'en'},terms:Array.from({length:12},(_,i)=>({id:String(i),luid:'term-'+i,word:'Question '+i,definition:String(i)}))};
 window.fixture={store:gravityStore};
 createRoot(document.getElementById('root')).render(<GravityApp localGame={game} autoPlay exitHref='/sets'/>);
`},bundle:true,write:false,loader:{'.css':'empty'},jsx:'automatic',platform:'browser',define:{'process.env.NODE_ENV':'"production"','process.env':'{}'}});
const server=createServer(async(req,res)=>{
 if(req.url==='/fixture.js'){res.setHeader('Content-Type','text/javascript');return res.end(bundle.outputFiles[0].contents)}
 if(req.url==='/gravity.css'){res.setHeader('Content-Type','text/css');return res.end(await readFile('src/gravity/gravity.css'))}
 if(req.url.startsWith('/api/community')){res.setHeader('Content-Type','application/json');return res.end(JSON.stringify({specialLettersEnabled:true,specialCharactersEnabled:true}))}
 if(req.url.startsWith('/assets/')){try{return res.end(await readFile('public'+req.url))}catch{res.statusCode=404;return res.end()}}
 res.setHeader('Content-Type','text/html');res.end('<!doctype html><html data-theme="light"><meta name="viewport" content="width=device-width,initial-scale=1"><link rel="stylesheet" href="/gravity.css"><style>*{box-sizing:border-box}body{margin:0}</style><div id="root"></div><script src="/fixture.js"></script></html>');
});
await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
try{
 for(const[name,engine,device]of[['Desktop WebKit',webkit,{viewport:{width:1700,height:1100},deviceScaleFactor:2}],['iOS WebKit',webkit,devices['iPhone 13']],['Android Chromium',chromium,devices['Pixel 7']]]){
 const browser=await engine.launch();try{
  const page=await browser.newPage(device),errors=[];page.on('pageerror',e=>errors.push(e.message));
  await page.goto('http://127.0.0.1:'+server.address().port);
  try { await page.waitForFunction(()=>window.fixture?.store.getSnapshot()?.gameState==='FREE_FALL',{},{timeout:20000}); }
  catch(error) { console.log({errors,state:await page.evaluate(()=>({state:window.fixture?.store.getSnapshot()?.gameState,loaded:window.fixture?.store.getSnapshot()?.planetsLoaded,text:document.body.innerText.slice(0,500)}))});throw error; }
  assert.equal(await page.locator('.GravityModeControls-newSetButton').count(),0);
  assert.equal(await page.locator('.GravitySiteHeader [aria-label="New game"]').count(),0);
  assert(await page.getByText('Exit',{exact:true}).count()>0);
  for(const level of[2,3]){
   await page.evaluate(level=>{
    window.trace=[];const epoch=window.traceEpoch=(window.traceEpoch||0)+1;const store=window.fixture.store;
    window.phaseStart=performance.now();window.phaseEnd=null;const unsubscribe=store.subscribe(()=>{if(store.getSnapshot().gameState==='FREE_FALL'){window.phaseEnd=performance.now();unsubscribe();}});
    function sample(){if(window.traceEpoch!==epoch)return;const area=document.querySelector('.GravityGameplayView-inner').getBoundingClientRect();const planets=[...document.querySelectorAll('.GravityPlanet')];const first=planets[level-1].getBoundingClientRect(),second=planets[level].getBoundingClientRect(),third=planets[level+1].getBoundingClientRect();const badge=document.querySelector('.GravityLevelUpBadge');const style=getComputedStyle(badge);window.trace.push({t:performance.now(),w:area.width,x:third.x-area.x,size:third.width,error:Math.abs((third.x+third.width/2)-(second.x+second.width/2)-.17*area.width),leaders:Math.abs(first.x-area.x+.5*area.width)<.02&&Math.abs(first.width-2*area.width)<.02&&Math.abs(second.x-area.x-.7*area.width)<.02&&Math.abs(second.width-.1*area.width)<.02,badge:Number(style.opacity),badgeZ:Number(style.zIndex),planetZ:Number(getComputedStyle(planets[level]).zIndex),state:store.getSnapshot().gameState});requestAnimationFrame(sample)}sample();store._advanceLevel();
   },level);
   await page.waitForFunction(()=>window.fixture.store.getSnapshot().gameState==='LEVEL_UP');
   const badgeTiming=await page.locator('.GravityLevelUpBadge').evaluate(e=>({duration:getComputedStyle(e).animationDuration,delay:getComputedStyle(e).animationDelay}));
   assert.deepEqual(badgeTiming,{duration:'1.5s',delay:'0.5s'});
   await page.waitForFunction(()=>window.fixture.store.getSnapshot().gameState==='FREE_FALL');
   const rows=await page.evaluate(()=>{++window.traceEpoch;return trace}),w=rows[0].w;
   const start=rows.findIndex(r=>r.state==='LEVEL_UP'),active=rows.slice(start),visible=active.filter(r=>r.x<w),moving=visible.slice(1).map((r,i)=>({dx:r.x-visible[i].x,dt:r.t-visible[i].t})).filter(r=>Math.abs(r.dx)>.01);
   assert(moving.length>=8,`${name}: continuous entry needs intermediate frames`);
   assert(moving.every(r=>r.dx<=.02&&Math.abs(r.dx)<.3*(.1*w+8)),`${name}: entry jumped`);
   if(w<=620)assert(Math.max(...visible.map(r=>r.error))<.3,`${name}: mobile pace differs`);
   const arrive=active.find(r=>Math.abs(r.x-.9*w)<.02),leaders=active.find(r=>r.leaders);assert(arrive&&leaders);assert(Math.abs(arrive.t-leaders.t)<40,`${name}: arrivals differ`);
   const badge=active.find(r=>r.badge>.5);assert(badge&&badge.badgeZ>badge.planetZ,`${name}: badge is behind planets`);
   const phase=await page.evaluate(()=>phaseEnd-phaseStart);
   assert(phase>=2290&&phase<2600,`${name}: phase should be 2300ms, measured ${phase}ms`);
   console.log(`PASS ${name}, level ${level}: continuous slide, synchronized arrival${w<=620?', matched mobile pace':''}, original badge and 2300ms phase; New game controls absent.`);
  }
  await page.evaluate(()=>window.fixture.store.restartGame());await page.waitForFunction(()=>window.fixture.store.getSnapshot().gameState==='OPTIONS');
  assert.equal(await page.locator('.GravityPlanet:not(.is-hidden)').count(),0);
  assert.deepEqual(errors,[]);
 }finally{await browser.close()}
 }
}finally{await new Promise(resolve=>server.close(resolve))}
