'use client';

import * as Dialog from '@radix-ui/react-dialog';
import {useState, type FormEvent} from 'react';
import {authClient} from '@/lib/community/auth-client';
import {displayPlayerName, validNameForSaving} from '@/lib/community/usernames';

/** A social account may exist before its owner chooses a public player name. */
export function RequiredPlayerName() {
 const [name,setName]=useState('');
 const [busy,setBusy]=useState(false);
 const [error,setError]=useState('');
 async function save(event:FormEvent) {
  event.preventDefault();
  if(busy)return;
  const value=displayPlayerName(name);
  if(!validNameForSaving(value)) {
   setError('Choose a name with 3–24 characters, including a letter or number.');
   return;
  }
  setBusy(true);setError('');
  try {
   const result=await authClient.updateUser({username:value,displayUsername:value,name:value});
   if(result.error)throw Error(result.error.message||'This name could not be saved.');
   const refreshed=await authClient.getSession({query:{disableCookieCache:true}});
   if(refreshed.error)throw Error('Please try again to finish saving your name.');
  }catch(cause){setError(cause instanceof Error?cause.message:'Please try again.');}
  finally{setBusy(false);}
 }
 return <Dialog.Root open>
  <Dialog.Portal>
   <Dialog.Overlay className="community-dialog-overlay"/>
   <Dialog.Content className="community-dialog" onEscapeKeyDown={e=>e.preventDefault()} onPointerDownOutside={e=>e.preventDefault()}>
    <section className="community-panel">
     <Dialog.Title>Choose a name</Dialog.Title>
     <Dialog.Description>Your account needs a name. Choose how you appear on games and leaderboards.</Dialog.Description>
     <form onSubmit={save}>
      <label htmlFor="required-player-name">Name</label>
      <input id="required-player-name" autoComplete="username" required minLength={3} maxLength={24} value={name} onChange={e=>setName(e.target.value)} aria-describedby={error?'required-name-error':undefined}/>
      {error&&<p id="required-name-error" role="alert">{error}</p>}
      <button className="community-primary" disabled={busy||!validNameForSaving(name)}>{busy?'Saving…':'Save name'}</button>
     </form>
     <button disabled={busy} onClick={async()=>{setBusy(true);setError('');try{const result=await authClient.signOut();if(result.error)throw Error(result.error.message);}catch{setError('Could not sign out. Please try again.');}finally{setBusy(false);}}}>Sign out</button>
    </section>
   </Dialog.Content>
  </Dialog.Portal>
 </Dialog.Root>;
}
