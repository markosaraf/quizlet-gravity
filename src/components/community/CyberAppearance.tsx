'use client';
import {createContext,useContext,useEffect,useRef,useState,type ReactNode} from 'react';
import {authClient} from '@/lib/community/auth-client';
import {cyberMode,defaultCyberSettings,isCyberMode,type CyberMode,type CyberSettings} from '@/lib/community/cyber-font';
import './CyberAppearance.css';
const changed='gravity-cyber-settings-changed';
type Appearance={settings:CyberSettings;mode:CyberMode;busy:boolean;error:string;choose:(mode:CyberMode)=>Promise<void>};
const Context=createContext<Appearance|null>(null);
export function CyberAppearanceProvider({children}:{children:ReactNode}){
 const {data:session}=authClient.useSession();const id=session?.user.id;
 const [settings,setSettings]=useState(defaultCyberSettings);
 const [personal,setPersonal]=useState<{id:string;mode:CyberMode|null}|null>(null);
 const [busy,setBusy]=useState(false),[error,setError]=useState('');
 const currentId=useRef(id);currentId.current=id;
 useEffect(()=>{
  let active=true,revision=0;
  async function refresh(){const request=++revision;try{const r=await fetch('/api/community/config',{cache:'no-store'});if(!r.ok)return;const value=await r.json();if(active&&request===revision)setSettings({...defaultCyberSettings,...value});}catch{}}
  const update=(event:Event)=>{revision++;setSettings((event as CustomEvent<CyberSettings>).detail);};
  const visible=()=>{if(document.visibilityState==='visible')void refresh();};
  void refresh();window.addEventListener(changed,update);window.addEventListener('focus',refresh);document.addEventListener('visibilitychange',visible);
  const timer=setInterval(visible,60000);
  return()=>{active=false;clearInterval(timer);window.removeEventListener(changed,update);window.removeEventListener('focus',refresh);document.removeEventListener('visibilitychange',visible);};
 },[]);
 useEffect(()=>{
  if(!id)return;let active=true;
  const refresh=async()=>{try{const r=await fetch('/api/community/font-preference',{cache:'no-store'});if(!r.ok)return;const value=await r.json();if(active)setPersonal({id,mode:isCyberMode(value.mode)?value.mode:null});}catch{}};
  void refresh();window.addEventListener('focus',refresh);
  return()=>{active=false;window.removeEventListener('focus',refresh);};
 },[id]);
 const mode=cyberMode(settings,id&&personal?.id===id?personal.mode:null);
 useEffect(()=>{document.documentElement.dataset.cyberFont=mode;return()=>{delete document.documentElement.dataset.cyberFont;};},[mode]);
 async function choose(next:CyberMode){
  if(!id||busy)return;setBusy(true);setError('');
  try{const r=await fetch('/api/community/font-preference',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({mode:next})});const value=await r.json();if(!r.ok)throw Error(value.error||'Unable to save font.');if(currentId.current===id&&isCyberMode(value.mode))setPersonal({id,mode:value.mode});}
  catch(e){if(currentId.current===id)setError((e as Error).message);}finally{setBusy(false);}
 }
 return <Context.Provider value={{settings,mode,busy,error,choose}}>{children}</Context.Provider>;
}
export function RobotaxiFontButton(){
 const context=useContext(Context);const timer=useRef<ReturnType<typeof setTimeout>|null>(null),held=useRef(false);
 function cancel(){if(timer.current)clearTimeout(timer.current);timer.current=null;}
 useEffect(()=>cancel,[]);
 if(!context||!context.settings.cyberLogoEnabled)return null;
 const {mode,busy,error,choose}=context;
 function start(){cancel();held.current=false;if(busy)return;timer.current=setTimeout(()=>{held.current=true;void choose(mode==='all'?'off':'all');},2000);}
 return <><button type="button" className="robotaxi-font-button" aria-label="Cybertruck font" aria-pressed={mode!=='off'} disabled={busy}
  title="Click to toggle Cybertruck font while keeping Quizlet text. Hold for 2 seconds to toggle Cybertruck for all text."
  onPointerDown={e=>{if(e.button===0)start();}} onPointerUp={cancel} onPointerLeave={cancel} onPointerCancel={cancel} onBlur={cancel}
  onContextMenu={e=>e.preventDefault()} onKeyDown={e=>{if(e.key===' '&&!e.repeat)start();}} onKeyUp={cancel}
  onClick={()=>{cancel();if(held.current){held.current=false;return;}void choose(mode==='off'?'interface':'off');}}>
  <img src="/assets/robotaxi/gold.svg" alt="Robotaxi" width={88} height={36} draggable={false}/>
 </button>{error&&<span role="alert">{error}</span>}</>;
}
const options=[
 {key:'cyberNonQuizletEnabled',label:'Cybertruck for non-Quizlet text',description:'Use Blender-TSL for everyone, preserving the original Quizlet font.'},
 {key:'cyberLogoEnabled',label:'Show Robotaxi font switch to users',description:'Show the gold logo beside Your account. Click changes only that account. Hold for 2 seconds includes all text.'},
 {key:'cyberAllEnabled',label:'Cybertruck for all text',description:'Use Blender-TSL everywhere for everyone, including Quizlet text.'},
] as const;
export function CyberFontSettings(){
 const [settings,setSettings]=useState<CyberSettings|null>(null),[busy,setBusy]=useState(false),[error,setError]=useState('');
 useEffect(()=>{let active=true;fetch('/api/admin/settings').then(async r=>{const data=await r.json();if(!r.ok)throw Error(data.error);if(active)setSettings(data);}).catch(e=>{if(active)setError(e.message);});return()=>{active=false;};},[]);
 async function toggle(key:keyof CyberSettings){
  if(!settings||busy)return;setBusy(true);setError('');
  const value=!settings[key];const update:Partial<CyberSettings>={[key]:value};
  if(value&&key==='cyberAllEnabled')update.cyberNonQuizletEnabled=false;
  if(value&&key==='cyberNonQuizletEnabled')update.cyberAllEnabled=false;
  try{const r=await fetch('/api/admin/settings',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(update)});const data=await r.json();if(!r.ok)throw Error(data.error);setSettings(data);window.dispatchEvent(new CustomEvent(changed,{detail:data}));}
  catch(e){setError((e as Error).message);}finally{setBusy(false);}
 }
 return <section aria-labelledby="cyber-font-settings"><h2 id="cyber-font-settings">Cybertruck font</h2><p>The global options set the default. When the logo is visible, each signed-in user can override it for their own account. Hiding the logo restores the global default.</p>
  <ul className="admin-list">{options.map(option=><li key={option.key}><div><strong>{option.label}</strong><small>{option.description}</small></div><button type="button" role="switch" aria-label={option.label} aria-checked={settings?.[option.key]===true} disabled={!settings||busy} onClick={()=>void toggle(option.key)}>{!settings?'Loading…':settings[option.key]?'On':'Off'}</button></li>)}</ul>
  {error&&<p role="alert">{error}</p>}
 </section>;
}
