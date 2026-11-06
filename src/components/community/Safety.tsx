'use client';
import {useEffect,useState} from 'react';
import {authClient} from '@/lib/community/auth-client';
async function safety(body:unknown){
 const r=await fetch('/api/community/safety',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(body)});
 const data=await r.json();if(!r.ok)throw Error(data.error||'Please try again.');
}
export function SafetyActions({kind,id,userId,onBlocked}:{kind:'set'|'user';id:string;userId?:string|null;onBlocked?:()=>void}){
 const {data:session}=authClient.useSession();const [message,setMessage]=useState('');const [busy,setBusy]=useState(false);const [reason,setReason]=useState('spam');
 if(kind==='user'&&(id===session?.user.id))return null;
 return <details className="community-safety"><summary>{kind==='set'?'Report set or block contributor':'Report or block'}</summary>{!session?<p>Choose a username or sign in to report or block. You can also contact <a href="mailto:quizletgravity@gmail.com">quizletgravity@gmail.com</a>.</p>:<><form onSubmit={async e=>{e.preventDefault();setBusy(true);try{await safety({action:'report',kind,id,reason});setMessage('Report received. Thank you.');}catch(e){setMessage((e as Error).message);}finally{setBusy(false);}}}><label>Reason<select value={reason} onChange={e=>setReason(e.target.value)}><option value="spam">Spam</option><option value="harassment">Harassment</option><option value="hate">Hateful content</option><option value="sexual">Sexual content</option><option value="violence">Violent content</option><option value="privacy">Personal information</option><option value="other">Other concern</option></select></label><button disabled={busy}>Send report</button></form>{userId&&userId!==session.user.id&&<button disabled={busy} onClick={async()=>{if(!confirm('Hide this contributor’s sets and leaderboard entries? You can unblock them from your account.'))return;setBusy(true);try{await safety({action:'block',id:userId});setMessage('Contributor blocked.');onBlocked?.();}catch(e){setMessage((e as Error).message);}finally{setBusy(false);}}}>Block contributor</button>}</>}{message&&<p role="status">{message}</p>}</details>;
}
export function BlockedUsers(){
 const {data:session}=authClient.useSession();const [open,setOpen]=useState(false);const [rows,setRows]=useState<{id:string;username:string}[]>([]);const [error,setError]=useState('');const [busy,setBusy]=useState('');
 useEffect(()=>{if(!open||!session)return;let active=true;fetch('/api/community/safety').then(async r=>{const d=await r.json();if(!r.ok)throw Error(d.error);if(active)setRows(d.blocked);}).catch(e=>{if(active)setError(e.message);});return()=>{active=false;};},[open,session?.user.id]);
 if(!session)return null;
 return <details className="community-safety" onToggle={e=>setOpen(e.currentTarget.open)}><summary>Blocked contributors</summary>{error&&<p role="alert">{error}</p>}{!rows.length?<p>No blocked contributors.</p>:<ul>{rows.map(u=><li key={u.id}>{u.username} <button disabled={!!busy} onClick={async()=>{setBusy(u.id);try{await safety({action:'unblock',id:u.id});setRows(old=>old.filter(x=>x.id!==u.id));}catch(e){setError((e as Error).message);}finally{setBusy('');}}}>Unblock</button></li>)}</ul>}</details>;
}
