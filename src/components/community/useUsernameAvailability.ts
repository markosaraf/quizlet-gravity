'use client';
import {useEffect,useState} from 'react';
import {authClient} from '@/lib/community/auth-client';
import {normalizePlayerName,validNameForSaving} from '@/lib/community/usernames';

export const usernameTakenMessage='This username is already taken. Choose another.';
export async function checkUsernameAvailable(value:string,currentUsername?:string|null){
 if(!validNameForSaving(value))throw Error('Choose a name with 3–24 characters, including a letter or number.');
 if(currentUsername&&normalizePlayerName(value)===normalizePlayerName(currentUsername))return;
 const result=await authClient.isUsernameAvailable({username:value});
 if(result.error)throw Error(result.error.message||'Could not check this username. Please try again.');
 if(result.data?.available!==true)throw Error(usernameTakenMessage);
}

export function useUsernameAvailability(value:string,enabled:boolean,currentUsername?:string|null){
 const [checked,setChecked]=useState({value:'',currentUsername,enabled,error:''});
 const shouldCheck=enabled&&validNameForSaving(value)&&(!currentUsername||normalizePlayerName(value)!==normalizePlayerName(currentUsername));
 useEffect(()=>{
  if(!shouldCheck)return;
  let active=true;
  const timer=setTimeout(()=>{void checkUsernameAvailable(value,currentUsername).then(()=>{if(active)setChecked({value,currentUsername,enabled,error:''});},error=>{if(active)setChecked({value,currentUsername,enabled,error:error instanceof Error?error.message:'Could not check this username. Please try again.'});});},450);
  return()=>{active=false;clearTimeout(timer);};
 },[value,currentUsername,enabled,shouldCheck]);
 const current=checked.value===value&&checked.currentUsername===currentUsername&&checked.enabled===enabled;
 return {checking:shouldCheck&&!current,error:shouldCheck&&current?checked.error:''};
}
