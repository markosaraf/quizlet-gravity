'use client';

import {useEffect,useRef,useState} from 'react';
import {revealResultRow} from './result-scroll';
import {authClient} from '@/lib/community/auth-client';
import {STRINGS} from '@/lib/gravity/strings';
import {SafetyActions} from './Safety';
import './leaderboard.css';

type Entry = {player_id:string;username:string;guest:boolean;score:number;level:number;mode:string;rank:number;is_current:boolean};
type Page = {entries:Entry[];total:number;current_rank:number|null;offset:number;page_size:number;hasMore:boolean};
const PAGE_SIZE=5;
const modeLabels:Record<string,string>={
 SLOTH:STRINGS.options.difficulty_selector.sloth,
 BEGINNER:STRINGS.options.difficulty_selector.easy,
 INTERMEDIATE:STRINGS.options.difficulty_selector.medium,
 EXPERT:STRINGS.options.difficulty_selector.hard,
 MAD_MAX:STRINGS.options.difficulty_selector.mad_max,
};

export function Leaderboard({id,refresh=0,compact=false,aroundPlayer=false,ready=true}:{
 id:string;refresh?:string|number;compact?:boolean;aroundPlayer?:boolean;ready?:boolean;
}){
 const {data:session}=authClient.useSession();
 const [offset,setOffset]=useState<number|null>(null);
 const [retry,setRetry]=useState(0);
 const [result,setResult]=useState<{key:string;page?:Page;error?:string}|null>(null);
 const sectionRef=useRef<HTMLElement>(null);
 const revealedResult=useRef<string|null>(null);
 // Key the result to its request so old rows never flash under a new page number.
 const requestKey=JSON.stringify([id,offset,refresh,retry,session?.user.id,aroundPlayer]);
 useEffect(()=>{
  if(!ready)return;
  const controller=new AbortController();
  const params=new URLSearchParams({limit:String(PAGE_SIZE),offset:String(offset??0)});
  if(aroundPlayer&&offset===null)params.set('around','me');
  fetch(`/api/community/sets/${id}/leaderboard?${params}`,{signal:controller.signal,cache:'no-store'})
   .then(async response=>{const body=await response.json();if(!response.ok)throw Error(body.error||'Could not load the leaderboard.');return body as Page;})
   .then(page=>{if(!controller.signal.aborted)setResult({key:requestKey,page});})
   .catch(error=>{if(!controller.signal.aborted)setResult({key:requestKey,error:error.message});});
  return()=>controller.abort();
 },[id,offset,ready,requestKey,aroundPlayer]);
 const current=result?.key===requestKey?result:null;
 const page=current?.page;
 const revealKey=JSON.stringify([id,refresh]);
 useEffect(()=>{
  if(!compact||!aroundPlayer||offset!==null||!page?.entries.some(entry=>entry.is_current)||revealedResult.current===revealKey)return;
  // Allow the keyboard to close first. Never override a user's own scrolling.
  const cancel=()=>{revealedResult.current=revealKey;window.clearTimeout(timer);};
  const timer=window.setTimeout(()=>{
   revealedResult.current=revealKey;
   if(sectionRef.current)revealResultRow(sectionRef.current);
  },300);
  const events=['pointerdown','touchstart','wheel','keydown'] as const;
  events.forEach(event=>window.addEventListener(event,cancel,{passive:true}));
  return()=>{
   window.clearTimeout(timer);
   events.forEach(event=>window.removeEventListener(event,cancel));
  };
 },[compact,aroundPlayer,offset,page,revealKey]);
 const loading=!ready||!current;
 const pageNumber=page?Math.floor(page.offset/PAGE_SIZE)+1:1;
 const pageCount=page?Math.max(1,Math.ceil(page.total/PAGE_SIZE)):1;
 return <section ref={sectionRef} className={`shared-leaderboard${compact?' shared-leaderboard--compact':''}`} aria-label="Leaderboard" aria-busy={loading}>
  <h2>Leaderboard</h2>
  {page?.current_rank!=null?<p className="shared-leaderboard-summary">Your best: rank {page.current_rank} of {page.total}</p>:!compact?<p className="shared-leaderboard-summary">Each player’s best score.</p>:null}
  {loading?<p role="status">{ready?'Loading leaderboard…':'Saving your score…'}</p>:current?.error?<div role="alert"><p>{current.error}</p><button onClick={()=>setRetry(n=>n+1)}>Retry leaderboard</button></div>:page?<>
   <ol className="shared-leaderboard-list" start={page.offset+1}>
    {page.entries.map(entry=><li key={entry.player_id} className={`shared-leaderboard-row${entry.is_current?' is-current':''}`} aria-current={entry.is_current?'true':undefined}>
     <span className="shared-leaderboard-rank" aria-label={`Rank ${entry.rank}`}>{entry.rank}</span>
     <div className="shared-leaderboard-player"><span className="shared-leaderboard-name">{entry.username}</span>{entry.is_current?<span className="shared-leaderboard-you">You</span>:null}
      <small>Level {entry.level} · {modeLabels[entry.mode.toUpperCase()]||entry.mode}</small>
     </div>
     <strong className="shared-leaderboard-score">{entry.score.toLocaleString()}<small>points</small></strong>
     {!compact&&!entry.is_current&&entry.username!=='Deleted user'?<div className="shared-leaderboard-safety"><SafetyActions kind="user" id={entry.player_id} userId={entry.player_id} onBlocked={()=>setRetry(n=>n+1)}/></div>:null}
    </li>)}
   </ol>
   {page.total===0?<p>Be the first to finish a game.</p>:<nav className="shared-leaderboard-pagination" aria-label="Leaderboard pages">
    <button aria-label="Previous leaderboard page" disabled={page.offset===0} onClick={()=>setOffset(Math.max(0,page.offset-PAGE_SIZE))}><svg viewBox="0 0 24 24" aria-hidden="true"><path d="m14 6-6 6 6 6"/></svg></button>
    <span aria-live="polite">{pageNumber} of {pageCount}</span>
    <button aria-label="Next leaderboard page" disabled={!page.hasMore} onClick={()=>setOffset(page.offset+PAGE_SIZE)}><svg viewBox="0 0 24 24" aria-hidden="true"><path d="m10 6 6 6-6 6"/></svg></button>
   </nav>}
  </>:null}
 </section>;
}
