'use client';
import {useEffect,useState} from 'react';
import {NotificationInbox} from './NotificationInbox';
import {authClient} from '@/lib/community/auth-client';

type AdminSettings={overtakenEmailEnabled:boolean;overtakenPushEnabled:boolean;ready:{email:boolean;android:boolean;apple:boolean};deliveries?:Record<string,number>};
export function AdminNotificationSettings(){
 const [settings,setSettings]=useState<AdminSettings|null>(null),[error,setError]=useState(''),[busy,setBusy]=useState(false);
 useEffect(()=>{let active=true;fetch('/api/admin/notifications').then(async r=>{const d=await r.json();if(!r.ok)throw Error(d.error);if(active)setSettings(d);}).catch(e=>{if(active)setError(e.message)});return()=>{active=false};},[]);
 async function toggle(key:'overtakenEmailEnabled'|'overtakenPushEnabled'){
  if(!settings)return;setBusy(true);setError('');try{const r=await fetch('/api/admin/notifications',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({[key]:!settings[key]})});const d=await r.json();if(!r.ok)throw Error(d.error);setSettings(d);}catch(e){setError((e as Error).message)}finally{setBusy(false)}
 }
 return <section aria-labelledby="notification-settings-title">
  <h2 id="notification-settings-title">Leaderboard notifications</h2>
  <p>Notify players when someone overtakes their best score. Each player can turn off their own notifications.</p>
  {([{key:'overtakenEmailEnabled',label:'Email notifications'},{key:'overtakenPushEnabled',label:'App push notifications'}] as const).map(({key,label})=><div key={key} style={{margin:'16px 0'}}>
   <h3>{label}</h3><button role="switch" aria-label={label} aria-checked={settings?.[key]===true} disabled={!settings||busy} onClick={()=>void toggle(key)}>{!settings?'Loading…':settings[key]?'On':'Off'}</button>
  </div>)}
  {settings&&!settings.ready.apple&&<p>Apple push setup is still pending.</p>}
  {settings&&!settings.ready.android&&<p>Android push setup is still pending.</p>}
  {settings?.deliveries&&<p>Last 7 days: {settings.deliveries.sent||0} sent | {settings.deliveries.pending||0} pending | {(settings.deliveries.failed||0)+(settings.deliveries.uncertain||0)} need attention</p>}
  {error&&<p role="alert">{error}</p>}
 </section>;
}

type Preferences={emailEnabled:boolean;pushEnabled:boolean;canEmail:boolean};
export function NotificationPreferences(){
 const {data:session,isPending}=authClient.useSession();
 const userId=session?.user.id;
 const [preferences,setPreferences]=useState<Preferences|null>(null),[busy,setBusy]=useState(false),[error,setError]=useState(''),[native,setNative]=useState(false),[deviceStatus,setDeviceStatus]=useState('');
 useEffect(()=>{
  setNative(navigator.userAgent.includes('QuizletGravityApp'));
  const receive=(event:Event)=>{const status=(event as CustomEvent).detail?.status;setDeviceStatus(status==='enabled'?'Notifications are enabled on this device.':status==='denied'?'Notifications are blocked in this device’s system settings.':'Could not register this device. Sign in and try again.');};
  window.addEventListener('quizlet-native-notifications',receive);return()=>window.removeEventListener('quizlet-native-notifications',receive);
 },[]);
 useEffect(()=>{let active=true;setPreferences(null);if(userId)fetch('/api/notifications/preferences').then(async r=>{const d=await r.json();if(!r.ok)throw Error(d.error);if(active)setPreferences(d)}).catch(e=>{if(active)setError(e.message)});return()=>{active=false}},[userId]);
 async function toggle(key:'emailEnabled'|'pushEnabled'){
  if(!preferences)return;setBusy(true);setError('');try{const r=await fetch('/api/notifications/preferences',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({[key]:!preferences[key]})});const d=await r.json();if(!r.ok)throw Error(d.error);setPreferences(d);}catch(e){setError((e as Error).message)}finally{setBusy(false)}
 }
 return <main className="community-page" style={{maxWidth:720}}><h1>Notifications</h1>
  <p>Choose how you hear about players overtaking you on a leaderboard.</p>
  {isPending?<p>Loading…</p>:!session?<p>Sign in or choose a guest name using the account button to manage notifications.</p>:<>
   {preferences?.canEmail&&<section><h2>Leaderboard emails</h2><button role="switch" aria-label="Leaderboard emails" aria-checked={preferences.emailEnabled} disabled={busy} onClick={()=>void toggle('emailEnabled')}>{preferences.emailEnabled?'On':'Off'}</button></section>}
   <section><h2>Push notifications</h2><button role="switch" aria-label="Leaderboard push notifications" aria-checked={preferences?.pushEnabled===true} disabled={!preferences||busy} onClick={()=>void toggle('pushEnabled')}>{!preferences?'Loading…':preferences.pushEnabled?'On':'Off'}</button>
   {native&&preferences?.pushEnabled?<p><a className="community-account-games" href="/native/notifications">Enable notifications on this device</a></p>:<p>Enable device notifications in the Android, iOS or Mac app.</p>}
   {deviceStatus&&<p role="status">{deviceStatus}</p>}</section><NotificationInbox/>
  </>}{error&&<p role="alert">{error}</p>}
 </main>;
}
