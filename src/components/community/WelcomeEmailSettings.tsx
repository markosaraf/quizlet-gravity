'use client';
import {useEffect,useState} from 'react';
type Settings={enabled:boolean;eligible_since:string;nextRun:string;sent:number;eligible:number;uncertain:number;failed:number;ready:boolean;last_scheduled_for:string|null;schedulingError?:boolean};
export function WelcomeEmailSettings(){
 const [settings,setSettings]=useState<Settings|null>(null),[busy,setBusy]=useState(false),[error,setError]=useState('');
 useEffect(()=>{let active=true;fetch('/api/admin/welcome-emails').then(async r=>{const value=await r.json();if(!r.ok)throw Error(value.error);if(active)setSettings(value);}).catch(e=>{if(active)setError(e.message);});return()=>{active=false;};},[]);
 async function toggle(){
  if(!settings||busy)return;setBusy(true);setError('');
  try{const r=await fetch('/api/admin/welcome-emails',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({enabled:!settings.enabled})});const value=await r.json();if(!r.ok)throw Error(value.error);setSettings(value);if(value.schedulingError)setError('Saved, but scheduling could not be confirmed. The scheduled job will retry.');}
  catch(e){setError((e as Error).message);}finally{setBusy(false);}
 }
 return <section aria-labelledby="welcome-email-title"><h2 id="welcome-email-title">Weekly welcome email</h2>
 <p>Send “Share the fun of Quizlet Gravity” once to new, verified accounts. Every Tuesday at 13:09, Zurich time.</p>
 <button role="switch" aria-label="Send weekly welcome emails" aria-checked={settings?.enabled===true} disabled={!settings||busy||(!settings.enabled&&!settings.ready)} onClick={()=>void toggle()}>{!settings?'Loading…':settings.enabled?'On':'Off'}</button>
 {settings&&<><p>{settings.eligible} eligible | {settings.sent} sent</p><p>New accounts since {new Date(settings.eligible_since).toLocaleString(undefined,{timeZone:'Europe/Zurich',timeZoneName:'short'})}. Previous recipients are excluded.</p>
 {settings.enabled&&<p>Next send: {new Date(settings.nextRun).toLocaleString(undefined,{timeZone:'Europe/Zurich',timeZoneName:'short'})}.</p>}
 {!settings.ready&&<p>Email delivery or scheduling is not configured.</p>}
 {(settings.uncertain>0||settings.failed>0)&&<p role="status">{settings.uncertain} deliveries need checking; {settings.failed} failed. Uncertain deliveries are not sent again automatically.</p>}</>}
 {error&&<p role="alert">{error}</p>}</section>;
}
