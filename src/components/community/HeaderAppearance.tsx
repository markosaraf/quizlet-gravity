'use client';

import {useEffect,useState} from 'react';

const changed='gravity-header-blue-changed';
const colours={startup:'#4255FF',previous:'#4255B4'};
function apply(startup:boolean){document.documentElement.style.setProperty('--gravity-header-blue',startup?colours.startup:colours.previous);}

/** Shared by website pages and the website inside all installed app versions. */
export function HeaderAppearance(){
 useEffect(()=>{
  let active=true,revision=0;
  const refresh=async()=>{
   const request=++revision;
   try{const response=await fetch('/api/community/config',{cache:'no-store'});if(!response.ok)return;
    const config=await response.json();if(active&&request===revision&&typeof config.startupHeaderBlueEnabled==='boolean')apply(config.startupHeaderBlueEnabled);
   }catch{/* Keep the last applied colour if the connection is unavailable. */}
  };
  const update=(event:Event)=>{revision++;apply((event as CustomEvent<boolean>).detail);};
  const visible=()=>{if(document.visibilityState==='visible')void refresh();};
  void refresh();window.addEventListener('focus',refresh);window.addEventListener(changed,update);document.addEventListener('visibilitychange',visible);
  return()=>{active=false;window.removeEventListener('focus',refresh);window.removeEventListener(changed,update);document.removeEventListener('visibilitychange',visible);};
 },[]);
 return null;
}

export function HeaderColourSettings(){
 const [startup,setStartup]=useState<boolean|null>(null),[busy,setBusy]=useState(false),[error,setError]=useState('');
 useEffect(()=>{let active=true;fetch('/api/admin/settings').then(async response=>{const data=await response.json();if(!response.ok)throw Error(data.error||'Unable to load header colour.');if(active)setStartup(data.startupHeaderBlueEnabled!==false);}).catch(e=>{if(active)setError(e.message);});return()=>{active=false;};},[]);
 async function choose(value:boolean){
  if(startup===null||busy||value===startup)return;
  setBusy(true);setError('');
  try{const response=await fetch('/api/admin/settings',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({startupHeaderBlueEnabled:value})});const data=await response.json();if(!response.ok)throw Error(data.error||'Unable to save header colour.');
   if(typeof data.startupHeaderBlueEnabled!=='boolean')throw Error('Unable to confirm header colour.');
   setStartup(data.startupHeaderBlueEnabled);window.dispatchEvent(new CustomEvent(changed,{detail:data.startupHeaderBlueEnabled}));
  }catch(e){setError((e as Error).message);}finally{setBusy(false);}
 }
 return <section aria-labelledby="header-colour-title"><h2 id="header-colour-title">Header blue</h2><p>Choose the header blue for everyone on the website and in the apps.</p>
  <div className="community-tabs" role="group" aria-label="Header blue">{([true,false] as const).map(value=><button key={String(value)} aria-pressed={startup===value} disabled={startup===null||busy} onClick={()=>void choose(value)}><span aria-hidden="true" style={{display:'inline-block',width:16,height:16,verticalAlign:'middle',marginRight:8,borderRadius:3,background:value?colours.startup:colours.previous}}/>{value?'Startup blue':'Previous blue'} ({value?colours.startup:colours.previous})</button>)}</div>
  {error&&<p role="alert">{error}</p>}
 </section>;
}
