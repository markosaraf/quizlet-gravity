import assert from 'node:assert/strict';
import {build} from 'esbuild';
import {chromium,webkit} from '@playwright/test';
import {createServer} from 'node:http';
import {readFile} from 'node:fs/promises';

const bundle=await build({stdin:{resolveDir:process.cwd(),loader:'tsx',contents:`
 import React from 'react';import{createRoot}from'react-dom/client';
 import{CopyTermView}from'./src/components/gravity/CopyTermView';
 document.documentElement.dataset.gravityInput='touch';
 createRoot(document.getElementById('root')).render(<div className="gravity-root"><div className="GravityGameplayView-copyTermWrapper"><CopyTermView term={{id:'1',luid:'term-1',word:'1',definition:'Q',_wordImageUrl:'/photo.svg',_imageUrl:'/photo.svg'}} showingSide="word" specialChars={[]} previouslyTypedText="" insertRef={{current:null}} liveTermId="image-test-1" onSubmit={()=>{}}/></div></div>);
`},bundle:true,write:false,loader:{'.css':'empty'},jsx:'automatic',platform:'browser'});
const server=createServer(async(req,res)=>{
 if(req.url==='/fixture.js'){res.setHeader('Content-Type','text/javascript');return res.end(bundle.outputFiles[0].contents);}
 if(req.url==='/gravity.css'||req.url==='/keyboard.css'){res.setHeader('Content-Type','text/css');return res.end(await readFile(req.url==='/gravity.css'?'src/gravity/gravity.css':'src/components/gravity/GlassKeyboard.css'));}
 if(req.url==='/photo.svg'){res.setHeader('Content-Type','image/svg+xml');return res.end('<svg xmlns="http://www.w3.org/2000/svg" width="400" height="520"><rect width="400" height="520" fill="#777"/></svg>');}
 if(req.url.startsWith('/assets/')){try{return res.end(await readFile('public'+req.url));}catch{res.statusCode=404;return res.end();}}
 res.setHeader('Content-Type','text/html');res.end('<!doctype html><meta name="viewport" content="width=device-width,initial-scale=1"><link rel="stylesheet" href="/gravity.css"><link rel="stylesheet" href="/keyboard.css"><style>*{box-sizing:border-box}body{margin:0}img{display:block;max-width:100%;height:auto}.gravity-root{position:relative;height:100vh;background:#151b35}</style><div id="root"></div><script src="/fixture.js"></script>');
});
await new Promise(r=>server.listen(0,'127.0.0.1',r));
try{for(const[name,engine]of[['Chromium',chromium],['WebKit',webkit]]){
 const browser=await engine.launch();try{
  const page=await browser.newPage({viewport:{width:390,height:844}});const errors=[];page.on('pageerror',e=>errors.push(e.message));
  await page.goto('http://127.0.0.1:'+server.address().port);await page.waitForFunction(()=>document.querySelectorAll('.GravityCopyTermView-definitionImage').length===2&&[...document.images].every(i=>i.complete));
  for(const width of[320,390,768]){
   await page.setViewportSize({width,height:844});
   const images=await page.locator('.GravityCopyTermView-definitionImage').evaluateAll(es=>es.map(e=>{const image=e.getBoundingClientRect(),parent=e.parentElement.getBoundingClientRect();return{offset:(image.left+image.right-parent.left-parent.right)/2,height:image.height,width:image.width,left:image.left,right:image.right};}));
   for(const i of images){assert(Math.abs(i.offset)<1,'Prompt and solution images must be horizontally centred');assert(i.left>=0&&i.right<=width);assert(Math.abs(i.height-190)<1,'Keep the existing displayed image height');}
  }
  assert.deepEqual(errors,[]);console.log('PASS '+name+': real solution component centres prompt and answer images at 320, 390 and 768px, with touch keyboard and unchanged image size.');
 }finally{await browser.close();}
}}finally{await new Promise(r=>server.close(r));}
