import assert from 'node:assert/strict';
import {build} from 'esbuild';
import {chromium,webkit,expect} from '@playwright/test';
import {createServer} from 'node:http';
import {readFile} from 'node:fs/promises';
const bundle=await build({stdin:{resolveDir:process.cwd(),loader:'tsx',contents:`
 import React from 'react';import{createRoot}from'react-dom/client';
 import{GravityApp}from'./src/components/gravity/GravityApp';import{gravityStore}from'./src/lib/gravity/store';
 const game={set:{id:'sharing-test',title:'Einmaleins – can you beat this?',wordLang:'en',defLang:'en'},terms:[{id:'1',luid:'term-1',word:'1',definition:'1'}]};
 window.fixture={store:gravityStore};
 createRoot(document.getElementById('root')).render(<GravityApp localGame={game} autoPlay exitHref='/sets'/>);
`},bundle:true,write:false,loader:{'.css':'empty'},jsx:'automatic',platform:'browser',define:{'process.env.NODE_ENV':'"production"','process.env':'{}'}});
let enabled=true;
const server=createServer(async(req,res)=>{try{
 if(req.url==='/fixture.js'){res.setHeader('Content-Type','text/javascript');return res.end(bundle.outputFiles[0].contents)}
 const styles={'/gravity.css':'src/gravity/gravity.css','/community.css':'src/components/community/community.css','/challenge.css':'src/components/gravity/ChallengePrompt.css'};
 if(styles[req.url]){res.setHeader('Content-Type','text/css');return res.end(await readFile(styles[req.url]))}
 if(req.url.startsWith('/api/')){res.setHeader('Content-Type','application/json');return res.end(JSON.stringify(req.url.includes('/config')?{challengeShareEnabled:enabled}:null))}
 if(req.url.startsWith('/assets/')&&!req.url.includes('..')){if(req.url.endsWith('.svg'))res.setHeader('Content-Type','image/svg+xml');return res.end(await readFile('public'+req.url))}
 res.setHeader('Content-Type','text/html');res.end('<!doctype html><html data-theme="light"><meta name="viewport" content="width=device-width,initial-scale=1"><link rel="stylesheet" href="/gravity.css"><link rel="stylesheet" href="/community.css"><link rel="stylesheet" href="/challenge.css"><style>*{box-sizing:border-box}body{margin:0}</style><nav class="community-nav">Quizlet Gravity</nav><div id="root"></div><script src="/fixture.js"></script></html>');
}catch{res.statusCode=404;res.end()}});
await new Promise(r=>server.listen(0,'127.0.0.1',r));const base='http://127.0.0.1:'+server.address().port;
try{for(const[engineName,engine]of[['Chromium',chromium],['WebKit',webkit]]){
 const b=await engine.launch();try{for(const width of [390,1280]){
 const p=await b.newPage({viewport:{width,height:844}}),errors=[];p.on('pageerror',e=>errors.push(e.message));
 await p.addInitScript(()=>{Object.defineProperty(navigator,'clipboard',{value:{writeText:async text=>{window.copiedText=text}}})});
 const finish=async()=>{await p.waitForFunction(()=>window.fixture?.store.getSnapshot()?.gameState==='FREE_FALL');await p.evaluate(()=>{const s=window.fixture.store;s.data.points=146000;s.data.level=10;s._endGame()})};
 await p.goto(base+'/123/test-flash-cards?token=private#secret');await finish();
 await expect(p.getByRole('dialog')).toBeVisible();await expect(p.getByRole('heading',{name:'146,000 points!'})).toBeVisible();
 await expect(p.getByRole('heading',{name:'Congratulations!'})).toHaveCount(0);
 await expect(p.locator('.community-nav')).toHaveCSS('background-color','rgb(66, 85, 255)');
 await expect(p.locator('.GravitySiteHeader')).toHaveCSS('background-color','rgb(66, 85, 255)');
 await p.screenshot({path:'/tmp/qg-challenge-'+engineName+'-'+width+'.png'});
 await p.getByRole('button',{name:'Share now',exact:true}).click();
 await expect(p.locator('.challenge-services a')).toHaveCount(7);
 assert.equal(await p.getByRole('textbox',{name:'Game link'}).inputValue(),'https://www.quizletgravity.com/123/test-flash-cards');
 await p.getByRole('button',{name:'Copy link',exact:true}).click();assert.equal(await p.evaluate(()=>window.copiedText),'https://www.quizletgravity.com/123/test-flash-cards');
 assert.equal(await p.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false);
 for(const img of await p.locator('.challenge-service-icon img').all())await expect.poll(()=>img.evaluate(i=>i.naturalWidth)).toBeGreaterThan(0);
 await p.screenshot({path:'/tmp/qg-share-options-'+engineName+'-'+width+'.png'});
 await p.getByRole('button',{name:'Continue to results',exact:true}).last().click();await expect(p.getByRole('heading',{name:'Congratulations!'})).toBeVisible();
 await p.getByRole('button',{name:'Play again',exact:true}).click();await p.evaluate(()=>window.fixture.store.startGame());await finish();await expect(p.getByRole('dialog')).toBeVisible();await p.getByRole('button',{name:'Not now',exact:true}).click();await expect(p.getByRole('heading',{name:'Congratulations!'})).toBeVisible();
 enabled=false;await p.reload();await finish();await expect(p.getByRole('heading',{name:'Congratulations!'})).toBeVisible();await expect(p.getByRole('dialog')).toHaveCount(0);enabled=true;
 assert.deepEqual(errors,[]);await p.close();console.log('PASS',engineName,width,'challenge before results, all services/icons, copy, replay, toggle, header colours');
 }
 for(const available of [false,true]){
 const old=await b.newPage({viewport:{width:390,height:844},userAgent:'QuizletGravityApp Android/2.0.16'});
 await old.addInitScript(available=>{window.shareCalls=0;Object.defineProperty(navigator,'share',{value:available?async()=>{window.shareCalls++}:undefined,configurable:true})},available);
 await old.goto(base+'/123/test-flash-cards');await old.waitForFunction(()=>window.fixture?.store.getSnapshot()?.gameState==='FREE_FALL');await old.evaluate(()=>window.fixture.store._endGame());
 await old.getByRole('button',{name:'Share now',exact:true}).click();await expect(old.locator('.challenge-services a')).toHaveCount(7);
 for(const name of ['WhatsApp','Viber','X','Telegram','Messages','Email','LinkedIn'])await expect(old.getByRole('link',{name:'Share via '+name,exact:true})).toBeVisible();
 await expect(old.getByRole('button',{name:'Copy link',exact:true})).toBeVisible();assert.equal(await old.evaluate(()=>window.shareCalls),0);
 await old.getByRole('link',{name:'Share via Viber',exact:true}).click();await expect(old.getByRole('alert')).toContainText('cannot open Viber directly');
 await old.screenshot({path:'/tmp/qg-old-app-sharing-'+engineName+'-'+available+'.png'});await old.close();
 console.log('PASS',engineName,'older app shows all seven choices and copy, Web Share availability:',available);
 }
 const p=await b.newPage({userAgent:'QuizletGravityApp NativeShare/1'});let nativeUrl='';
 await p.route('**/native/share?**',async route=>{nativeUrl=route.request().url();await route.abort()});
 await p.goto(base+'/123/test-flash-cards');await p.waitForFunction(()=>window.fixture?.store.getSnapshot()?.gameState==='FREE_FALL');await p.evaluate(()=>window.fixture.store._endGame());
 await p.getByRole('link',{name:'Share now',exact:true}).click();await expect.poll(()=>nativeUrl).toContain('/native/share?');assert.equal(new URL(nativeUrl).searchParams.get('url'),'https://www.quizletgravity.com/123/test-flash-cards');await expect(p.locator('.challenge-services')).toHaveCount(0);await p.close();console.log('PASS',engineName,'app clicks native sharing route instead of website choices');
 }finally{await b.close()}
}}finally{await new Promise(r=>server.close(r))}
