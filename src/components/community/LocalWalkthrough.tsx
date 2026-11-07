'use client';
import {useEffect,useLayoutEffect,useRef,useState} from 'react';
import {usePathname} from 'next/navigation';
import './local-walkthrough.css';

function targetFor(selector:string){return document.querySelector<HTMLElement>(selector)||(selector==='.d-gallery .d-game'?document.querySelector<HTMLElement>('[data-tour="games"]'):null);}
type Box={x:number;y:number;width:number;height:number};
const VERSION:number=2;
const steps=[
 {title:'Learn from existing games',targets:['.d-gallery .d-game','[data-tour="games"]']},
 {title:'Learn by copying and pasting a game link from Quizlet.com.',targets:['[data-tour="import-game"]']},
 {title:'Create your own game: Learn & play',targets:['[data-tour="create-game-bottom"]','[data-tour="create"]']},
];
export function LocalWalkthrough({hasUser,openAccount,onClose}:{hasUser:boolean;openAccount:()=>void;onClose:()=>void}){
 const path=usePathname();
 const [debug,setDebug]=useState(false),[showTargets,setShowTargets]=useState(false),[showHeads,setShowHeads]=useState(false);
 useEffect(()=>{setDebug(new URLSearchParams(window.location.search).has('arrowDebug'));},[]);
 const [step,setStep]=useState(0),[done,setDone]=useState(false),[ready,setReady]=useState(false);
 const [geometry,setGeometry]=useState<{key:string;targets:Box[];panel:Box}>({key:"",targets:[],panel:{x:0,y:0,width:360,height:180}});
 const panelRef=useRef<HTMLDivElement>(null),okRef=useRef<HTMLButtonElement>(null),targetRef=useRef<HTMLButtonElement>(null);
 const directory=path==='/'||path==='/sets';
 const usernameStep=VERSION===1||step===3;
 const active=directory&&!done&&!(usernameStep&&hasUser);
 const title=usernameStep?'Choose a username':steps[step].title;
 const selectors=usernameStep?['[data-tour="username"]']:steps[step].targets;
 const stepCount=hasUser?3:4;
 const key=selectors.join('|');
 useEffect(()=>{
  if(!active)return;
  document.body.classList.add('local-tour-active');
  let timeout:ReturnType<typeof setTimeout>;
  const prepare=()=>{
   const elements=selectors.map(s=>targetFor(s));
   if(elements.some(e=>!e)){timeout=setTimeout(prepare,120);return;}
   setReady(true);timeout=setTimeout(()=>okRef.current?.focus({preventScroll:true}),80);
  };
  timeout=setTimeout(prepare,200);
  return()=>{clearTimeout(timeout);document.body.classList.remove('local-tour-active');};
 },[active,key,step]); // Target selectors are stable for a step.
 useLayoutEffect(()=>{
  if(!active||!ready)return;
  function measure(){
   const targets=selectors.map(s=>targetFor(s)?.getBoundingClientRect()).filter((b):b is DOMRect=>!!b).map(b=>({x:b.x,y:b.y,width:b.width,height:Math.min(b.height,220)}));
   const nav=document.querySelector('.community-nav')?.getBoundingClientRect();
   const width=Math.min(390,window.innerWidth-32),height=panelRef.current?.offsetHeight||180;
   const x=usernameStep?Math.max(16,window.innerWidth-width-24):(window.innerWidth-width)/2;
   const preferredY=targets[0]&&targets[0].y>window.innerHeight*.55?targets[0].y-height-80:(nav?.bottom||70)+100;
   const y=Math.max(16,Math.min(preferredY,window.innerHeight-height-24));
   setGeometry({key,targets,panel:{x,y,width,height}});
  }
  measure();window.addEventListener('resize',measure);window.addEventListener('scroll',measure,{passive:true});
  const observer=new ResizeObserver(measure);if(panelRef.current)observer.observe(panelRef.current);
  return()=>{observer.disconnect();window.removeEventListener('resize',measure);window.removeEventListener('scroll',measure);};
 },[active,ready,key,title,geometry.key]);
 useEffect(()=>{
  if(!debug||showTargets||!active||!ready)return;
  const elements=selectors.map(selector=>targetFor(selector)).filter((el):el is HTMLElement=>!!el);
  const previous=elements.map(el=>el.style.opacity);
  elements.forEach(el=>{el.style.opacity='0';});
  return()=>{elements.forEach((el,i)=>{el.style.opacity=previous[i];});};
 },[debug,showTargets,active,ready,key]);
 if(!active||!ready||geometry.key!==key)return null;
 const {panel,targets}=geometry;
 function next(){
  if(usernameStep){setDone(true);onClose();openAccount();return;}
  if(step===2&&hasUser){setDone(true);onClose();return;}
  setReady(false);setStep(n=>n+1);
 }
 function activateTarget(index:number){
  if(usernameStep){setDone(true);onClose();openAccount();return;}
  const element=targetFor(selectors[index]);
  setDone(true);onClose();
  if(element instanceof HTMLInputElement){
   requestAnimationFrame(()=>{element.focus({preventScroll:true});});
  }else element?.click();
 }
 function dismissIntro(){
  if(usernameStep)return;
  if(hasUser){setDone(true);onClose();}
  else{setReady(false);setStep(3);}
 }
 return <div className="local-tour-layer" onKeyDown={e=>{
  if(e.key!=='Tab')return;
  e.preventDefault();
  const buttons=Array.from(e.currentTarget.querySelectorAll<HTMLButtonElement>('button'));
  const index=buttons.indexOf(document.activeElement as HTMLButtonElement);
  buttons[(index+(e.shiftKey?-1:1)+buttons.length)%buttons.length]?.focus({preventScroll:true});
 }}>
  <div className="local-tour-veil" onClick={dismissIntro}/>
  {debug&&<div style={{position:'fixed',bottom:70,left:10,zIndex:5,background:'#fff',color:'#111',padding:'10px 14px',border:'1px solid #d4af37',borderRadius:8,fontSize:13,maxWidth:'calc(100vw - 20px)'}}>
   <label><input type="checkbox" checked={showTargets} onChange={e=>setShowTargets(e.target.checked)}/> Show target buttons</label>{' '}
   <label><input type="checkbox" checked={showHeads} onChange={e=>setShowHeads(e.target.checked)}/> Show arrowheads</label>
   <div>Gold dot = curve endpoint · Arrowhead extends beyond it</div>
  </div>}
  <svg className="local-tour-arrows" width="100%" height="100%" aria-hidden="true">
   {targets.map((t,i)=>{
    const above=t.y+t.height<panel.y;
    const startX=panel.x+panel.width*(targets.length>1?(i===0?.25:.75):.5);
    const startY=above?panel.y+1:panel.y+panel.height-1;
    // Touch the outside edge of the 2px highlight stroke, without entering it.
    const tipX=t.x+t.width*.5,tipY=above?t.y+t.height+6:t.y-6;
    let endX=tipX,endY=tipY,handleX=0,handleY=0,ux=0,uy=0;
    // Keep mirrored handles and solve the shaft endpoint beneath the fixed tip.
    for(let iteration=0;iteration<24;iteration++){
     const dx=endX-startX,dy=endY-startY;
     const side=Math.abs(dx)>20?Math.sign(dx):(startX>window.innerWidth/2?-1:1);
     const bend=Math.min(90,Math.max(35,Math.abs(dx)*.18));
     handleX=dx*.25-side*bend;handleY=dy*.4;
     const length=Math.hypot(handleX,handleY)||1;
     ux=handleX/length;uy=handleY/length;
     endX=tipX-ux*15;endY=tipY-uy*15;
    }
    const control1X=startX+handleX,control1Y=startY+handleY;
    const control2X=endX-handleX,control2Y=endY-handleY;
    const baseX=endX-ux*8,baseY=endY-uy*8,headWidth=9;
    const head=`${tipX},${tipY} ${baseX-uy*headWidth},${baseY+ux*headWidth} ${baseX+uy*headWidth},${baseY-ux*headWidth}`;
    return <g key={i}>
     <rect x={t.x-5} y={t.y-5} width={t.width+10} height={t.height+10} rx="9" fill="none" stroke="#d4af37" strokeWidth="2"/>
     <path data-arrow-shaft d={`M${startX},${startY} C${control1X},${control1Y} ${control2X},${control2Y} ${endX},${endY}`} stroke="#d4af37" strokeWidth="4" strokeLinecap="butt" fill="none"/>
     {(!debug||showHeads)&&<polygon data-arrow-head points={head} fill="#d4af37"/>}
     {debug&&!showHeads&&<circle cx={endX} cy={endY} r="3" fill="#d4af37"/>}
    </g>;
   })}
  </svg>
  {targets.map((target,index)=><button key={selectors[index]} ref={index===0?targetRef:undefined} className="local-tour-target-button" aria-label={usernameStep?'Choose username':selectors[index].includes('d-gallery')?'Open highlighted game':selectors[index].includes('games')?'Games':selectors[index].includes('create')?'Create game':'Enter Quizlet game link'} onClick={()=>activateTarget(index)} style={{left:target.x,top:target.y,width:target.width,height:target.height}}/>)}
  <div ref={panelRef} className="local-tour-card" role="dialog" aria-modal="true" aria-labelledby="local-tour-heading" style={{left:panel.x,top:panel.y,width:panel.width}}>
   {VERSION===2&&<div className="local-tour-progress" aria-label={`Step ${step+1} of ${stepCount}`}>{Array.from({length:stepCount},(_,i)=><span key={i} className={i===step?'current':''}/>)}</div>}
   <h2 id="local-tour-heading">{title}</h2>
   <button ref={okRef} onClick={next}>OK</button>
  </div>
 </div>;
}
