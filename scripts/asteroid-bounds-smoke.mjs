// Real asteroid layout in Chromium and WebKit, without accounts or database writes.
import assert from 'node:assert/strict';
import {build} from 'esbuild';
import {chromium,webkit,expect} from '@playwright/test';
import {createServer} from 'node:http';
import {readFile} from 'node:fs/promises';

const result=await build({stdin:{resolveDir:process.cwd(),loader:'tsx',contents:`
 import React,{useState,useEffect} from 'react';import{createRoot}from'react-dom/client';import{flushSync}from'react-dom';
 import{Asteroid}from'./src/components/gravity/Asteroid';
 import{GameplayTextToggle,useGameplayTextSize}from'./src/components/gravity/GameplayTextToggle';
 window.spawnLane=0.99999;Math.random=()=>window.spawnLane;window.missed=0;window.animationStarts=0;
 document.addEventListener('animationstart',e=>{if(e.target.matches('.GravityTerm'))window.animationStarts++;});
 function Fixture(){
  const textSize=useGameplayTextSize();
  const[c,set]=useState({width:400,left:20,text:'These are contextual influences on dispositional characteristics and narrative descriptions which rely on life circumstances and change over time.',definition:'Definition',side:'word',lang:'en',image:'',manualSize:'normal',meteor:false,animated:false,state:'FREE_FALL',life:800,generation:0});
  useEffect(()=>{window.asteroidTest={update(next,remount=false){if(next.lane!==undefined)window.spawnLane=next.lane;flushSync(()=>set(old=>({...old,...next,generation:remount?old.generation+1:old.generation})));}};},[]);
  const size=c.manualSize??textSize.size;const scale=size==='large'?1.33:size==='small'?0.75:1;
  return <div className="gravity-root" data-game-text-size={size}><GameplayTextToggle step={textSize.step} onToggle={textSize.toggle}/><div id="area" className={c.animated?'':'static-fixture'} style={{width:c.width,marginLeft:c.left}}>
   <Asteroid key={c.generation} liveTermId={'term-fixture-live-'+c.generation} term={{id:'1',luid:'term-1',word:c.text,definition:c.definition,_wordImageUrl:c.image,_imageUrl:c.image}} showingSide={c.side} promptLang={c.lang} gameState={c.state} isMeteor={c.meteor} textScale={scale} termLife={c.life} onMissed={()=>window.missed++}/>
  </div></div>;
 }
 createRoot(document.getElementById('root')).render(<Fixture/>);
`},bundle:true,write:false,jsx:'automatic',platform:'browser'});
const server=createServer(async(req,res)=>{try{
 if(req.url==='/fixture.js'){res.setHeader('Content-Type','text/javascript');return res.end(result.outputFiles[0].contents);}
 if(req.url==='/gravity.css'){res.setHeader('Content-Type','text/css');return res.end(await readFile('src/gravity/gravity.css'));}
 if(req.url.startsWith('/assets/')&&!req.url.includes('..'))return res.end(await readFile('public'+req.url));
 if(req.url==='/wide.svg'){res.setHeader('Content-Type','image/svg+xml');return setTimeout(()=>res.end('<svg xmlns="http://www.w3.org/2000/svg" width="1600" height="400"><rect width="1600" height="400" fill="#5266aa"/></svg>'),120);}
 res.setHeader('Content-Type','text/html');res.end('<!doctype html><meta name="viewport" content="width=device-width,initial-scale=1"><link rel="stylesheet" href="/gravity.css"><style>*{box-sizing:border-box}body{margin:0}#area{position:relative;height:1800px;overflow:hidden}.static-fixture .GravityTerm{animation:none!important;top:40px!important;opacity:1!important}</style><div id="root"></div><script src="/fixture.js"></script>');
 }catch{res.statusCode=404;res.end();}
});
await new Promise(r=>server.listen(0,'127.0.0.1',r));
const url='http://127.0.0.1:'+server.address().port;
try{for(const[name,engine]of[['Chromium',chromium],['WebKit',webkit]]){
 const browser=await engine.launch();try{
  const page=await browser.newPage({viewport:{width:800,height:900}});const errors=[];page.on('pageerror',e=>errors.push(e.message));
  await page.goto(url);await page.waitForFunction(()=>!!window.asteroidTest);
  const update=(value,remount=false)=>page.evaluate(([value,remount])=>window.asteroidTest.update(value,remount),[value,remount]);
  async function bounds(label){
   await page.evaluate(()=>new Promise(r=>requestAnimationFrame(()=>requestAnimationFrame(r))));
   const data=await page.evaluate(()=>{
    const area=document.querySelector('#area').getBoundingClientRect(),rock=document.querySelector('.GravityTerm'),r=rock.getBoundingClientRect(),text=rock.querySelector('.GravityTerm-text'),t=text.getBoundingClientRect();
    const range=document.createRange();range.selectNodeContents(text);
    const lines=[...range.getClientRects()].filter(x=>x.width>0).map(x=>({left:x.left,right:x.right}));
    const image=rock.querySelector('img')?.getBoundingClientRect();
    return{start:Math.max(0,area.left),end:Math.min(innerWidth,area.right),rock:{left:r.left,right:r.right,top:r.top,bottom:r.bottom,width:r.width,height:r.height},text:{left:t.left,right:t.right,top:t.top,bottom:t.bottom},lines,image:image?{left:image.left,right:image.right}:null,font:parseFloat(getComputedStyle(text).fontSize),overflow:text.scrollWidth>text.clientWidth+1};
   });
   for(const box of[data.text,...data.lines,...(data.image?[data.image]:[])]){
    assert(box.left>=data.start+11, name+' '+label+' left '+JSON.stringify(data));
    assert(box.right<=data.end-11,name+' '+label+' right '+JSON.stringify(data));
   }
   assert(Math.abs(data.rock.width-data.rock.height)<1,name+' '+label+' asteroid keeps original square proportions');
   assert(!data.overflow,name+' '+label+' text wraps without clipping');
   assert(data.text.top>=data.rock.top&&data.text.bottom<=data.rock.bottom+1,name+' '+label+' rock contains all text');
   return data;
  }
  await bounds('first asteroid with narrow actual container');
  // Check the entire horizontal range, including the rightmost legal position.
  // Original Gravity used one independent Math.random() per asteroid; do not
  // replace that with forced alternating lanes merely to avoid random clusters.
  await page.setViewportSize({width:1792,height:1000});
  for(const size of ['normal','large','small']) {
   let previous=-Infinity;
   for(const lane of [0,0.1,0.25,0.5,0.75,0.9,0.99999]) {
    await update({width:1597,left:195,text:'Continued development and improvement of a person’s emotional maturity and ability to handle life’s experiences',manualSize:size,image:'',lane},true);
    const data=await bounds('full range '+size+' '+lane);
    const expected=data.start+12+lane*(data.end-data.start-24-(data.text.right-data.text.left));
    assert(Math.abs(data.text.left-expected)<1,'Random lane must cover the entire safe range without a left/right bias');
    assert(data.text.left>previous,'Every higher random lane must land farther right');
    previous=data.text.left;
    if(lane===0) assert(Math.abs(data.text.left-data.start-12)<1,'Reach left margin');
    if(lane===0.99999) assert(Math.abs(data.end-data.text.right-12)<1,'Reach right margin');
   }
  }
  console.log('PASS '+name+': full left-to-right range at normal, larger and smaller sizes, including both 12px margins.');
  const samples=['Short word','VeryLongUnbrokenWord'.repeat(22),'These are contextual influences on dispositional characteristics and narrative descriptions which rely on life circumstances and change over time. '.repeat(3),'日本語の長い学習問題と説明文です。'.repeat(12)];
  for(const width of[320,390,768,1280]){
   await page.setViewportSize({width,height:900});
   for(const [index,text]of samples.entries()){
    await update({width:width-40,left:20,text,lang:index===3?'ja':'en',manualSize:'normal',image:'',lane:index%2?0:0.99999},true);
    const normal=await bounds(width+' normal '+index);
    await update({manualSize:'large'});const large=await bounds(width+' enlarged '+index);
    assert(Math.abs(large.font/normal.font-1.33)<0.02,'Text enlargement must remain 33%');
   }
  }
  // The same asteroid must react to parent-only changes and viewport resizing.
  await update({width:700,left:20,text:samples[1],manualSize:'large',lane:0.99999},true);await bounds('wide start');
  await update({width:280});await bounds('container-only shrink');
  await update({width:700});await page.setViewportSize({width:390,height:900});await bounds('partially clipped parent after window shrink');
  await update({width:350,left:-90});await bounds('partially clipped left edge');
  await update({width:350,left:20,text:samples[0],image:'/wide.svg',meteor:true,side:'definition',definition:samples[2]},true);
  await page.waitForFunction(()=>document.querySelector('.GravityTerm img')?.naturalWidth===1600);await bounds('loaded image plus long definition');
  // The actual button cycles larger → normal → smaller → normal; both rock
  // and text scale together, and the next click's label stays truthful.
  await update({width:350,left:20,text:'Read this question',image:'',side:'word',meteor:false,manualSize:null},true);
  const baseline=await bounds('cycle normal');
  for(const factor of[1.33,1,0.75,1,1.33,1,0.75,1]){
   await page.locator('.GravityTextSizeToggle').click();const current=await bounds('cycle '+factor);
   assert(Math.abs(current.font/baseline.font-factor)<0.02,'Text scale follows cycle');
   assert(Math.abs(current.rock.width/baseline.rock.width-factor)<0.02,'Asteroid size follows cycle without distortion');
  }
  await update({text:samples[2].slice(0,145),manualSize:'normal'},true);
  await bounds('representative sentence');
  await page.screenshot({path:'/tmp/quizlet-asteroid-'+name.toLowerCase()+'.png'});
  console.log('PASS '+name+': first spawn, short/long/unbroken/CJK text, 320–1280px, larger/normal/smaller cycle for text and rock, parent/window resizing, both edges, image and red asteroid.');
  // Resizing and changing text size must not restart the falling clock.
  await page.evaluate(()=>{window.missed=0;window.animationStarts=0;});
  await update({animated:true,width:350,left:20,image:'',text:'Timed asteroid',manualSize:'normal',side:'word',state:'FREE_FALL',life:1000},true);
  await expect.poll(()=>page.evaluate(()=>window.animationStarts)).toBe(1);
  await page.waitForTimeout(150);await update({width:300,manualSize:'large'});await update({state:'PAUSED'});
  await page.waitForTimeout(1100);assert.equal(await page.evaluate(()=>window.missed),0,'Paused asteroid must not miss');
  await update({state:'FREE_FALL'});await expect.poll(()=>page.evaluate(()=>window.missed)).toBe(1);
  assert.equal(await page.evaluate(()=>window.animationStarts),1,'Resize/text toggle must not restart fall');
  assert.deepEqual(errors,[]);console.log('PASS '+name+': pause/resume, original fall duration, one impact callback and no browser errors.');
 }finally{await browser.close();}
}}finally{await new Promise(r=>server.close(r));}
