'use client';
import {useRouter} from 'next/navigation';
import {SafetyActions} from './Safety';
import {DeleteSetButton} from './Admin';
import {useEffect,useState,useMemo} from 'react';
import {AccountDialog,Leaderboard,type SetRecord} from './Community';
import {hasVisiblePlayerName,requiresPlayerName} from '@/lib/community/usernames';
import {authClient} from '@/lib/community/auth-client';
import {GravityApp} from '@/components/gravity/GravityApp';
import {importedCardsToTerms} from '@/lib/gravity/import-cards';
import '@/gravity/gravity.css';
export function SharedSet({id,initialSet}:{id:string;initialSet:SetRecord}){
 const router=useRouter();
 // The server already loaded the public learning material. Do not replace it
 // with a client API request: crawlers may be unable to fetch /api/ resources.
 const set=initialSet;
 const [playing,setPlaying]=useState(false);const [accountOpen,setAccountOpen]=useState(false);const [copied,setCopied]=useState(false);const {data:session}=authClient.useSession();
 const intentKey='gravity-play-intent:'+id;
 const ready=!!session&&hasVisiblePlayerName(session.user.username)&&!requiresPlayerName(session.user);
 function clearIntent(){try{sessionStorage.removeItem(intentKey);}catch{/* Storage can be disabled. */}}
 function play(){
  if(ready){clearIntent();setPlaying(true);return;}
  // Keep this click across a Google/Apple sign-in redirect in the same tab.
  try{sessionStorage.setItem(intentKey,String(Date.now()));}catch{/* Inline sign-in still works. */}
  setAccountOpen(true);
 }
 useEffect(()=>{
  let pending=accountOpen;
  try{const saved=Number(sessionStorage.getItem(intentKey));if(saved>0){if(Date.now()-saved<15*60*1000)pending=true;else sessionStorage.removeItem(intentKey);}}catch{/* Storage can be disabled. */}
  if(!pending)return;
  if(ready){try{sessionStorage.removeItem(intentKey);}catch{/* Storage can be disabled. */}setAccountOpen(false);setPlaying(true);}
  else setAccountOpen(true);
 },[intentKey,ready,accountOpen]);
 const gameSet=useMemo(()=>set?{set:{id:set.id,title:set.title,wordLang:'en',defLang:'en'},terms:importedCardsToTerms(set.cards)!}:null,[set]);
 if(playing&&gameSet)return <GravityApp shared={gameSet}/>;
 return <main className="community-page">
  <h1>{set.title}</h1><small>{set.term_count} terms</small>
  {set.source_url?<p>Original Quizlet set creator: {set.creator_url?<a href={set.creator_url} target="_blank" rel="noreferrer">{set.creator_name}</a>:set.creator_name||'Unavailable'} · <a href={set.source_url} target="_blank" rel="noreferrer">Original set</a>{!set.quizlet_id&&<><br/>Quizlet Gravity set creator: {set.added_by}</>}</p>:<p>Quizlet Gravity set creator: {set.added_by}</p>}
  <details>
   <summary>Preview terms</summary>
   <div className="community-terms">
    <table aria-label="Terms and definitions">
     <thead><tr><th scope="col">Term</th><th scope="col">Definition</th></tr></thead>
     <tbody>{set.cards.map((c,i)=><tr key={i}>
      <td>{c.term}{c.termImage&&<img src={c.termImage} alt="Term image" loading="lazy"/>}</td>
      <td>{c.definition}{c.definitionImage&&<img src={c.definitionImage} alt="Definition image" loading="lazy"/>}</td>
     </tr>)}</tbody>
    </table>
   </div>
  </details>
  <div className="community-actions">
   <button onClick={()=>{navigator.clipboard.writeText(location.href).then(()=>setCopied(true)).catch(()=>alert('Copy this page’s URL from your address bar.'));}}>{copied?'Link copied':'Copy game link'}</button>
   <button onClick={play}>Play &amp; learn</button>
   <DeleteSetButton id={set.id} title={set.title}/>
  </div>
  <AccountDialog initialMode="signup" open={accountOpen&&!requiresPlayerName(session?.user)} onOpenChange={open=>{setAccountOpen(open);if(!open)clearIntent();}} onDone={()=>{clearIntent();setAccountOpen(false);setPlaying(true);}}/>
  <Leaderboard id={id}/>
  <SafetyActions kind="set" id={set.id} userId={set.created_by} onBlocked={()=>{router.push('/sets');}}/>
 </main>;
}
