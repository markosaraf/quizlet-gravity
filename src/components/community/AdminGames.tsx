'use client';

import {useEffect,useState} from 'react';
import Link from 'next/link';
import {useAdmin} from './Admin';
import {Leaderboard} from './Leaderboard';
import {sharedSetPath} from '@/lib/community/set-links';
import './admin-games.css';

type Game={id:string;public_id:string;title:string;source_url:string|null;created_at:string;term_count:number;creator_name:string|null;added_by:string;player_count:number;top_score:number|null};
type Result={games:Game[];total:number;hasMore:boolean};

export function AdminGameCatalogue({query,leaderboards=false,showAllLeaderboards=false}:{query:string;leaderboards?:boolean;showAllLeaderboards?:boolean}){
 const [offset,setOffset]=useState(0);
 const [retry,setRetry]=useState(0);
 const [result,setResult]=useState<{key:string;data?:Result;error?:string}|null>(null);
 const [expanded,setExpanded]=useState<string|null>(null);
 const key=JSON.stringify([query,offset,retry,leaderboards]);
 useEffect(()=>{
  const controller=new AbortController();
  const timer=setTimeout(()=>{
   fetch(`/api/admin/game-overview?q=${encodeURIComponent(query)}&offset=${offset}${leaderboards?'&withScores=true':''}`,{signal:controller.signal,cache:'no-store'})
    .then(async response=>{const data=await response.json();if(!response.ok)throw Error(data.error||'Unable to load games.');return data as Result;})
    .then(data=>{if(!controller.signal.aborted)setResult({key,data});})
    .catch(error=>{if(!controller.signal.aborted)setResult({key,error:error.message});});
  },200);
  return()=>{clearTimeout(timer);controller.abort();};
 },[query,offset,key,leaderboards]);
 const current=result?.key===key?result:null;
 const data=current?.data;
 return <section className="admin-games" aria-label={leaderboards?'All game leaderboards':'Newest games'} aria-busy={!current}>
  {!current?<p role="status">Loading games…</p>:current.error?<div role="alert"><p>{current.error}</p><button type="button" onClick={()=>setRetry(n=>n+1)}>Retry</button></div>:data?<>
   <p>{data.total.toLocaleString()} {data.total===1?'game':'games'} · Newest first</p>
   {!data.games.length?<p>No matching games.</p>:<ol className="admin-game-list" start={offset+1}>
    {data.games.map(game=><li key={game.id}>
     <div className="admin-game-heading"><div>
      <time dateTime={game.created_at} title={new Date(game.created_at).toLocaleString(undefined,{timeZoneName:'short'})}>Created {new Date(game.created_at).toLocaleDateString(undefined,{day:'numeric',month:'long',year:'numeric'})}</time>
      <h2><Link href={sharedSetPath(game)}>{game.title}</Link></h2>
      <p>{game.term_count.toLocaleString()} terms · Added by {game.added_by}{game.creator_name&&<> · Quizlet creator: {game.creator_name}</>}</p>
      {leaderboards&&<p>{game.player_count.toLocaleString()} {game.player_count===1?'player':'players'}{game.top_score!==null?<> · Best score: {game.top_score.toLocaleString()}</>:' · No scores yet'}</p>}
     </div>{leaderboards&&!showAllLeaderboards&&<button type="button" aria-expanded={expanded===game.id} aria-controls={`board-${game.id}`} onClick={()=>setExpanded(value=>value===game.id?null:game.id)}>{expanded===game.id?'Hide leaderboard':'View leaderboard'}</button>}</div>
     {leaderboards&&(showAllLeaderboards||expanded===game.id)&&<div id={`board-${game.id}`}><Leaderboard id={game.id} adminView/></div>}
    </li>)}
   </ol>}
   <nav className="admin-games-pagination" aria-label="Game list pages"><button type="button" disabled={offset===0} onClick={()=>{setExpanded(null);setOffset(value=>Math.max(0,value-24));}}>Previous</button><span aria-live="polite">Page {Math.floor(offset/24)+1} of {Math.max(1,Math.ceil(data.total/24))}</span><button type="button" disabled={!data.hasMore} onClick={()=>{setExpanded(null);setOffset(value=>value+24);}}>Next</button></nav>
  </>:null}
 </section>;
}

export function AdminLeaderboards(){
 const admin=useAdmin();
 const [query,setQuery]=useState('');
 const [showAll,setShowAll]=useState(true);
 return <main className="community-page"><Link href="/sets">← Back to games</Link><h1>All leaderboards</h1>{admin?<><label>Search games by title or creator<input type="search" value={query} onChange={event=>setQuery(event.target.value)}/></label><button type="button" onClick={()=>setShowAll(value=>!value)}>{showAll?'Hide all leaderboards':'Show all leaderboards'}</button><AdminGameCatalogue key={query+String(showAll)} query={query} leaderboards showAllLeaderboards={showAll}/></>:<p>Sign in with your administrator account to see all leaderboards.</p>}</main>;
}
