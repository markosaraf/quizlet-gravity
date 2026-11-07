'use client';
import {useEffect,useState} from 'react';
import Link from 'next/link';
import {useRouter} from 'next/navigation';
import {authClient} from '@/lib/community/auth-client';
import {sharedSetPath} from '@/lib/community/set-links';
export function useAdmin(){
 const {data:session}=authClient.useSession();
 const id=session?.user.id;
 const [checked,setChecked]=useState({id:'',admin:false});
 useEffect(()=>{let active=true;if(id)fetch('/api/admin/status').then(r=>r.json()).then(r=>{if(active)setChecked({id,admin:r.admin===true});}).catch(()=>{});return()=>{active=false;};},[id]);
 return !!id&&checked.id===id&&checked.admin;
}
async function remove(kind:'users'|'sets',id:string){
 const response=await fetch(`/api/admin/${kind}/${encodeURIComponent(id)}`,{method:'DELETE'});
 const result=await response.json();if(!response.ok)throw Error(result.error||'Unable to delete.');
}
export function DeleteSetButton({id,title}:{id:string;title:string}){
 const admin=useAdmin();const router=useRouter();const [busy,setBusy]=useState(false);const [error,setError]=useState('');
 if(!admin)return null;
 return <><button disabled={busy} onClick={async()=>{if(!confirm(`Delete “${title}” and its leaderboard? This cannot be undone.`))return;setBusy(true);try{await remove('sets',id);router.push('/sets');}catch(e){setError((e as Error).message);setBusy(false);}}}>Delete game</button>{error&&<p role="alert">{error}</p>}</>;
}
interface UserRow{id:string;username:string;email:string|null;guest:boolean;admin:boolean;created_at:string}
interface SetRow{id:string;public_id:string;title:string;source_url:string|null;term_count:number;creator:string}
export function AdminUsers(){
 const admin=useAdmin();const [kind,setKind]=useState<'users'|'sets'>('users');const [q,setQ]=useState('');const [offset,setOffset]=useState(0);const [version,setVersion]=useState(0);
 const [data,setData]=useState<{users?:UserRow[];sets?:SetRow[];total?:number;accounts?:number;guests?:number;hasMore?:boolean}>({});
 const [error,setError]=useState('');const [loading,setLoading]=useState(true);const [busy,setBusy]=useState('');
 useEffect(()=>{let active=true;if(!admin)return;const timer=setTimeout(()=>{setLoading(true);fetch(`/api/admin/${kind}?q=${encodeURIComponent(q)}&offset=${offset}`).then(async r=>{const value=await r.json();if(!r.ok)throw Error(value.error);if(active){setData(value);setError('');}}).catch(e=>{if(active)setError(e.message);}).finally(()=>{if(active)setLoading(false);});},200);return()=>{active=false;clearTimeout(timer);};},[admin,kind,q,offset,version]);
 async function deleteItem(id:string,name:string){if(!confirm(kind==='users'?`Delete user “${name}”? Their login and personal details will be removed. Existing scores will say “Deleted user”.`:`Delete “${name}” and its leaderboard? This cannot be undone.`))return;setBusy(id);try{await remove(kind,id);setVersion(v=>v+1);}catch(e){setError((e as Error).message);}finally{setBusy('');}}
 if(!admin)return <main className="community-page"><h1>Users</h1><p>Sign in with your administrator account to manage users and games.</p></main>;
 return <main className="community-page"><TutorialSettings/><ReportQueue/><h1>{kind==='users'?'Users':'Manage games'}</h1><div className="community-tabs"><button aria-pressed={kind==='users'} onClick={()=>{setKind('users');setOffset(0);setQ('');}}>Users</button><button aria-pressed={kind==='sets'} onClick={()=>{setKind('sets');setOffset(0);setQ('');}}>Games</button></div>{kind==='users'&&data.total!==undefined&&<p><strong>{data.total} users</strong> · {data.accounts} accounts · {data.guests} guests</p>}<label>Search {kind}<input type="search" value={q} onChange={e=>{setQ(e.target.value);setOffset(0);}}/></label>{error&&<p role="alert">{error}</p>}{loading?<p>Loading…</p>:<ul className="admin-list">{kind==='users'?data.users?.map(u=><li key={u.id}><div><strong>{u.username}</strong>{u.email&&<small>{u.email}</small>}<small>{u.admin?'Administrator':u.guest?'Guest':'Account'}</small></div><button disabled={!!busy||u.admin} onClick={()=>deleteItem(u.id,u.username)}>{busy===u.id?'Deleting…':'Delete user'}</button></li>):data.sets?.map(s=><li key={s.id}><div><Link href={sharedSetPath(s)}>{s.title}</Link><small>{s.term_count} terms · {s.creator}</small></div><button disabled={!!busy} onClick={()=>deleteItem(s.id,s.title)}>{busy===s.id?'Deleting…':'Delete game'}</button></li>)}</ul>}<div className="community-pagination"><button disabled={!offset||loading} onClick={()=>setOffset(Math.max(0,offset-50))}>Previous</button><button disabled={!data.hasMore||loading} onClick={()=>setOffset(offset+50)}>Next</button></div></main>;
}

interface ReportRow{id:string;target_kind:'set'|'user';target_id:string;reason:string;created_at:string;title?:string;public_id?:string;username?:string}
function ReportQueue(){
 const [rows,setRows]=useState<ReportRow[]>([]);const [offset,setOffset]=useState(0);const [more,setMore]=useState(false);const [version,setVersion]=useState(0);const [error,setError]=useState('');const [busy,setBusy]=useState('');
 useEffect(()=>{let active=true;fetch('/api/admin/reports?offset='+offset).then(async r=>{const d=await r.json();if(!r.ok)throw Error(d.error);if(active){setRows(d.reports);setMore(d.hasMore);}}).catch(e=>{if(active)setError(e.message);});return()=>{active=false;};},[offset,version]);
 async function resolve(r:ReportRow,removeContent:boolean){
  if(removeContent&&!confirm('Remove this '+r.target_kind+' and resolve the report?'))return;
  setBusy(r.id);try{
   if(removeContent)await remove(r.target_kind==='set'?'sets':'users',r.target_id);
   const response=await fetch('/api/admin/reports/'+r.id+'/resolve',{method:'POST'});if(!response.ok)throw Error('Could not resolve report.');setVersion(v=>v+1);
  }catch(e){setError((e as Error).message);}finally{setBusy('');}
 }
 return <section><h2>Content reports</h2><p>Review reports promptly. Remove abusive content and accounts where appropriate.</p>{error&&<p role="alert">{error}</p>}{!rows.length?<p>No open reports.</p>:<ul className="admin-list">{rows.map(r=><li key={r.id}><div><strong>{r.target_kind==='set'&&r.public_id?<Link href={sharedSetPath({public_id:r.public_id,title:r.title||'Set'})}>{r.title}</Link>:r.username||'Removed content'}</strong><small>{r.reason} · {new Date(r.created_at).toLocaleDateString()}</small></div><button disabled={!!busy} onClick={()=>resolve(r,true)}>Remove {r.target_kind}</button><button disabled={!!busy} onClick={()=>resolve(r,false)}>Resolve</button></li>)}</ul>}<div className="community-pagination"><button disabled={!offset||!!busy} onClick={()=>setOffset(Math.max(0,offset-50))}>Previous reports</button><button disabled={!more||!!busy} onClick={()=>setOffset(offset+50)}>Next reports</button></div></section>;
}

function TutorialSettings(){
 const [enabled,setEnabled]=useState<boolean|null>(null),[busy,setBusy]=useState(false),[error,setError]=useState('');
 useEffect(()=>{let active=true;fetch('/api/admin/settings').then(async r=>{const d=await r.json();if(!r.ok)throw Error(d.error);if(active)setEnabled(d.tutorialEnabled);}).catch(e=>{if(active)setError(e.message);});return()=>{active=false;};},[]);
 async function toggle(){setBusy(true);setError('');try{const r=await fetch('/api/admin/settings',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({tutorialEnabled:!enabled})});const d=await r.json();if(!r.ok)throw Error(d.error);setEnabled(d.tutorialEnabled);}catch(e){setError((e as Error).message);}finally{setBusy(false);}}
 return <section aria-labelledby="tutorial-setting-title"><h2 id="tutorial-setting-title">Tutorial</h2><p>Show the Tutorial button on the games page.</p><button role="switch" aria-label="Show tutorial button" aria-checked={enabled===true} disabled={enabled===null||busy} onClick={()=>void toggle()}>{enabled===null?'Loading…':enabled?'On':'Off'}</button>{error&&<p role="alert">{error}</p>}</section>;
}
