'use client';

import {useEffect,useState} from 'react';

const changed='gravity-header-blue-changed';
const colours={startup:'#4255FF',midpoint:'rgb(66, 85, 217.5)',previous:'#4255B4'};
type HeaderBlue=keyof typeof colours;
const labels:Record<HeaderBlue,string>={startup:'Startup blue',midpoint:'In-between blue',previous:'Previous blue'};
function selection(config:{startupHeaderBlueEnabled?:boolean;midpointHeaderBlueEnabled?:boolean}):HeaderBlue{return config.midpointHeaderBlueEnabled?'midpoint':config.startupHeaderBlueEnabled!==false?'startup':'previous';}
function apply(value:HeaderBlue){document.documentElement.style.setProperty('--gravity-header-blue',colours[value]);}

/** Shared by website pages and the website inside all installed app versions. */
export function HeaderAppearance(){
 useEffect(()=>{
  let active=true,revision=0;
  const refresh=async()=>{
   const request=++revision;
   try{const response=await fetch('/api/community/config',{cache:'no-store'});if(!response.ok)return;
    const config=await response.json();if(active&&request===revision&&typeof config.startupHeaderBlueEnabled==='boolean')apply(selection(config));
   }catch{/* Keep the last applied colour if the connection is unavailable. */}
  };
  const update=(event:Event)=>{revision++;apply((event as CustomEvent<HeaderBlue>).detail);};
  const visible=()=>{if(document.visibilityState==='visible')void refresh();};
  void refresh();window.addEventListener('focus',refresh);window.addEventListener(changed,update);document.addEventListener('visibilitychange',visible);
  return()=>{active=false;window.removeEventListener('focus',refresh);window.removeEventListener(changed,update);document.removeEventListener('visibilitychange',visible);};
 },[]);
 return null;
}

export function HeaderColourSettings(){
 const [selected,setSelected]=useState<HeaderBlue|null>(null),[busy,setBusy]=useState(false),[error,setError]=useState('');
 useEffect(()=>{let active=true;fetch('/api/admin/settings').then(async response=>{const data=await response.json();if(!response.ok)throw Error(data.error||'Unable to load header colour.');if(active)setSelected(selection(data));}).catch(e=>{if(active)setError(e.message);});return()=>{active=false;};},[]);
 async function choose(value:HeaderBlue){
  if(selected===null||busy||value===selected)return;
  setBusy(true);setError('');
  try{const response=await fetch('/api/admin/settings',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({startupHeaderBlueEnabled:value!=='previous',midpointHeaderBlueEnabled:value==='midpoint'})});const data=await response.json();if(!response.ok)throw Error(data.error||'Unable to save header colour.');
   if(typeof data.startupHeaderBlueEnabled!=='boolean'||typeof data.midpointHeaderBlueEnabled!=='boolean')throw Error('Unable to confirm header colour.');
   setSelected(selection(data));window.dispatchEvent(new CustomEvent(changed,{detail:selection(data)}));
  }catch(e){setError((e as Error).message);}finally{setBusy(false);}
 }
 return <section aria-labelledby="header-colour-title"><h2 id="header-colour-title">Header blue</h2><p>Choose the header blue for everyone on the website and in the apps.</p>
  <div className="community-tabs" role="group" aria-label="Header blue">{(['startup','midpoint','previous'] as const).map(value=><button key={String(value)} aria-pressed={selected===value} disabled={selected===null||busy} onClick={()=>void choose(value)}><span aria-hidden="true" style={{display:'inline-block',width:16,height:16,verticalAlign:'middle',marginRight:8,borderRadius:3,background:colours[value]}}/>{labels[value]}</button>)}</div>
  {error&&<p role="alert">{error}</p>}
 </section>;
}
