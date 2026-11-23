'use client';
import {createContext,useCallback,useContext,useEffect,useState,useRef,type ReactNode} from 'react';
import {usePathname} from 'next/navigation';
import Link from 'next/link';
import {authClient} from '@/lib/community/auth-client';

type Counts={unreadCount:number;refresh:()=>void};
const NotificationContext=createContext<Counts>({unreadCount:0,refresh:()=>{}});
function syncNative(){
 if(navigator.userAgent.includes('NotificationInbox/1'))window.location.assign(new URL('/native/notifications/sync',location.origin).href);
}
export function NotificationProvider({children}:{children:ReactNode}){
 const {data:session,isPending}=authClient.useSession();const userId=session?.user.id;const path=usePathname();
 const [state,setState]=useState<{owner?:string;count:number}>({count:0});
 const revision=useRef(0);
 useEffect(()=>{if(!isPending)syncNative();},[userId,isPending,state.owner,state.count]);
 const refresh=useCallback(()=>{
  if(!userId)return;
  const request=++revision.current;
  void fetch('/api/notifications/inbox?count=true',{cache:'no-store'}).then(async r=>{if(!r.ok)return;const data=await r.json();if(request===revision.current&&Number.isInteger(data.unreadCount))setState({owner:userId,count:data.unreadCount});}).catch(()=>{});
 },[userId]);
 useEffect(()=>{
  refresh();
  const visible=()=>{if(!document.hidden)refresh();};
  const timer=setInterval(visible,60000);window.addEventListener('focus',visible);document.addEventListener('visibilitychange',visible);window.addEventListener('quizlet-notifications-changed',visible);
  return()=>{clearInterval(timer);window.removeEventListener('focus',visible);document.removeEventListener('visibilitychange',visible);window.removeEventListener('quizlet-notifications-changed',visible);};
 },[refresh]);
 useEffect(()=>{
  if(isPending)return;
  const url=new URL(location.href),id=url.searchParams.get('notification'),token=url.searchParams.get('notificationToken');
  if(!id||(!userId&&!token)||!/^\/(?:[a-z]{2}(?:-[a-z]{2})?\/)?\d+\/[^/]+-flash-cards\/?$/i.test(path))return;
  let active=true;
  void fetch('/api/notifications/inbox',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({id,token})}).then(async r=>{
   if(!r.ok)return;const data=await r.json();if(!active)return;
   revision.current++;
   if(userId&&Number.isInteger(data.unreadCount))setState({owner:userId,count:data.unreadCount});
   syncNative();
   // Do not carry a recipient's signed notification token into shared game links.
   url.searchParams.delete('notification');url.searchParams.delete('notificationToken');history.replaceState(history.state,'',url.pathname+url.search+url.hash);
  }).catch(()=>{});
  return()=>{active=false;};
 },[path,userId,isPending]);
 return <NotificationContext.Provider value={{unreadCount:state.owner===userId?state.count:0,refresh}}>{children}</NotificationContext.Provider>;
}
export function NotificationBadge(){
 const {unreadCount}=useContext(NotificationContext);
 return unreadCount>0?<span className="notification-count" aria-label={`${unreadCount} unread notifications`}>{unreadCount>99?'99+':unreadCount}</span>:null;
}
type Item={id:string;actor_name:string;title:string;created_at:string;read_at:string|null;url:string};
export function NotificationInbox(){
 const {data:session}=authClient.useSession();const userId=session?.user.id;const {refresh}=useContext(NotificationContext);
 const [page,setPage]=useState(0),[version,setVersion]=useState(0);
 const [state,setState]=useState<{owner?:string;page:number;items:Item[];more:boolean}>({page:0,items:[],more:false});
 const [error,setError]=useState(''),[loading,setLoading]=useState(true);
 useEffect(()=>{const visible=()=>{if(!document.hidden)setVersion(v=>v+1);};window.addEventListener('focus',visible);document.addEventListener('visibilitychange',visible);return()=>{window.removeEventListener('focus',visible);document.removeEventListener('visibilitychange',visible);};},[]);
 useEffect(()=>{
  if(!userId)return;let active=true;
  void fetch('/api/notifications/inbox?offset='+page*25,{cache:'no-store'}).then(async r=>{const d=await r.json();if(!r.ok)throw Error(d.error);if(active){setState({owner:userId,page,items:d.notifications,more:d.hasMore});setError('');refresh();}}).catch(e=>{if(active)setError(e.message);}).finally(()=>{if(active)setLoading(false);});
  return()=>{active=false;};
 },[userId,page,version,refresh]);
 const current=state.owner===userId&&state.page===page;
 return <section className="notification-inbox" aria-labelledby="notification-inbox-heading"><h2 id="notification-inbox-heading">Leaderboard updates</h2>
  {error&&<p role="alert">{error} <button onClick={()=>setVersion(v=>v+1)}>Retry</button></p>}
  {loading||!current?<p>Loading notifications…</p>:!state.items.length?<p>No leaderboard notifications yet.</p>:<ul>{state.items.map(item=><li key={item.id} data-unread={!item.read_at}>
   <Link prefetch={false} href={item.url+'?notification='+encodeURIComponent(item.id)}>
    <span className="notification-row-message"><strong>{item.actor_name}</strong> has overtaken you in “{item.title}”.</span>
    <small><span className="notification-read-state">{item.read_at?'Opened':'Unread'}</span> | <time dateTime={item.created_at}>{new Date(item.created_at).toLocaleString()}</time></small>
   </Link>
  </li>)}</ul>}
  {(page>0||state.more)&&<div className="community-pagination"><button disabled={page===0||!current} onClick={()=>setPage(p=>p-1)}>Newer notifications</button><button disabled={!state.more||!current} onClick={()=>setPage(p=>p+1)}>Older notifications</button></div>}
 </section>;
}
