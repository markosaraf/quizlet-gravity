'use client';

import {useState} from 'react';
import * as Dialog from '@radix-ui/react-dialog';
import {Copy,Mail,MessageCircle,Share2,UserRound,X} from 'lucide-react';
import {challengeShare,nativeShareHref,shareLinks} from '@/lib/gravity/challenge-share';
import type {Difficulty} from '@/lib/gravity/constants';
import './ChallengePrompt.css';

const modeNames:Record<Difficulty,string>={SLOTH:'Sloth',BEGINNER:'Easy',INTERMEDIATE:'Medium',EXPERT:'Hard',MAD_MAX:'Mad Max'};

export function ChallengePrompt({points,level,title,mode,playerName,onContinue}:{
 points:number;level:number;title:string;mode:Difficulty;playerName:string;onContinue:()=>void;
}){
 const [sharing,setSharing]=useState(false),[copied,setCopied]=useState(false),[error,setError]=useState('');
 const share=challengeShare(title,points,window.location.pathname);
 const native=/QuizletGravityApp/.test(navigator.userAgent);
 const nativeReady=native&&/NativeShare\/1/.test(navigator.userAgent);
 const apple=/Mac|iPhone|iPad|iPod/.test(navigator.platform);
 async function copy(){
  try{await navigator.clipboard.writeText(share.url);setCopied(true);setError('');}
  catch{setError('Select and copy the link below.');}
 }
 function openShare(){
  setError('');
  setSharing(true);
 }
 function openService(event:React.MouseEvent<HTMLAnchorElement>,name:string){
  if(native&&!nativeReady&&(name==='Messages'||name==='Viber')){
   event.preventDefault();
   setError(`This app version cannot open ${name} directly. Copy the link, or use the updated app’s sharing panel.`);
  }
 }

 return <Dialog.Root open onOpenChange={open=>{if(!open)onContinue();}}>
  <Dialog.Portal>
   <Dialog.Overlay className="challenge-overlay"/>
   <Dialog.Content className="challenge-card" aria-describedby="challenge-description">
    <Dialog.Close className="challenge-close" aria-label="Continue to results"><X size={22}/></Dialog.Close>
    <Dialog.Title className="challenge-title">{sharing?'Share your challenge':`${points.toLocaleString('en-US')} points!`}</Dialog.Title>
    <Dialog.Description id="challenge-description" className="challenge-description">
     {sharing?'Choose where to challenge a friend.':'Can your friends beat your score?'}
    </Dialog.Description>
    {!sharing?<>
     <p className="challenge-game">{title}</p>
     <div className="challenge-match">
      <div><span className="challenge-avatar" aria-hidden="true">{playerName.trim().charAt(0).toUpperCase()||<UserRound/>}</span><strong>{playerName||'You'}</strong><span>{points.toLocaleString('en-US')} points</span><small>Level {level} | {modeNames[mode]}</small></div>
      <span className="challenge-versus">vs</span>
      <div><span className="challenge-avatar" aria-hidden="true"><UserRound size={38}/></span><strong>Your friend</strong><span>—</span></div>
     </div>
     {nativeReady?<a className="challenge-primary" href={nativeShareHref(share)} onClick={onContinue}><Share2 size={20}/>Share now</a>:
      <button className="challenge-primary" onClick={openShare}><Share2 size={20}/>Share now</button>}
     {error&&<><p role="alert">{error}</p><button className="challenge-copy" onClick={()=>void copy()}><Copy size={18}/>{copied?'Link copied':'Copy link'}</button><input aria-label="Game link" readOnly value={share.url} onFocus={e=>e.target.select()}/></>}
     <Dialog.Close className="challenge-later">Not now</Dialog.Close>
    </>:<>
     <p className="challenge-caption">{share.text}</p>
     <div className="challenge-copy-row"><input aria-label="Game link" readOnly value={share.url} onFocus={e=>e.target.select()}/><button className="challenge-copy" onClick={()=>void copy()}><Copy size={18}/>{copied?'Copied':'Copy link'}</button></div>
     <div className="challenge-services">{shareLinks(share,apple).map(service=><a key={service.name} href={service.href} onClick={event=>openService(event,service.name)} target={service.href.startsWith('https:')?'_blank':undefined} rel="noopener noreferrer" aria-label={'Share via '+service.name}>
      <span className="challenge-service-icon">{service.icon==='email'?<Mail/>:service.icon==='messages'?<MessageCircle/>:<img src={'/assets/share/'+service.icon+'.svg'} alt="" width={28} height={28}/>}</span><span>{service.name}</span>
     </a>)}</div>
     <p className="challenge-hint">{native&&!nativeReady?'Direct Viber and Messages sharing requires the updated app.':'Messages and Viber need a compatible app on this device.'}</p>
     {error&&<p role="alert">{error}</p>}
     <span role="status" className="challenge-status">{copied?'Link copied.':''}</span>
     <Dialog.Close className="challenge-later">Continue to results</Dialog.Close>
    </>}
   </Dialog.Content>
  </Dialog.Portal>
 </Dialog.Root>;
}
