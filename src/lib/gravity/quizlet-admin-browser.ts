import {randomUUID,createHash} from 'node:crypto';
import {EncryptJWT,jwtDecrypt} from 'jose';
import {QuizletMapError} from './quizlet-map';
import {parseQuizletClass} from './quizlet-class';

export const QUIZLET_CONNECTION_COOKIE='quizlet-admin-connection';
export type QuizletConnection={profile:string;id?:string;liveUrl?:string;until?:number;username?:string};
type Deps={fetchImpl?:typeof fetch;apiKey?:string};
function cookieKey(secret=process.env.BETTER_AUTH_SECRET){
 if(!secret)throw new QuizletMapError('Quizlet sign-in is not configured.',503);
 return createHash('sha256').update('quizlet-class-connection:'+secret).digest();
}
export async function sealConnection(connection:QuizletConnection,userId:string,secret?:string){
 return new EncryptJWT({connection}).setProtectedHeader({alg:'dir',enc:'A256GCM'}).setSubject(userId).setAudience('quizlet-admin-class-search').setIssuedAt().setExpirationTime('30d').encrypt(cookieKey(secret));
}
export async function readConnection(token:string|undefined,userId:string,secret?:string):Promise<QuizletConnection|null>{
 if(!token)return null;
 try{
  const {payload}=await jwtDecrypt(token,cookieKey(secret),{audience:'quizlet-admin-class-search',subject:userId});
  const c=payload.connection as QuizletConnection;
  if(!c||typeof c.profile!=='string'||!/^qg-admin-[a-f0-9-]{36}$/.test(c.profile))return null;
  return c;
 }catch{return null;}
}
export function connected(c:QuizletConnection|null):c is QuizletConnection&{id:string;until:number;username:string}{
 return !!(c?.id&&c.username&&c.until&&c.until>Date.now());
}
export function connectionStatus(c:QuizletConnection|null){
 const active=!!(c?.id&&c.until&&c.until>Date.now());
 return {connected:connected(c),username:active?c?.username??null:null,liveUrl:active?c?.liveUrl??null:null,expiresAt:active?c?.until:null};
}
async function browserAPI(path:string,body?:unknown,method='POST',deps:Deps={}){
 const key=(deps.apiKey??process.env.FIRECRAWL_API_KEY??'').trim();
 if(!key)throw new QuizletMapError('Quizlet browser sign-in is not configured.',503);
 const r=await(deps.fetchImpl??fetch)(`https://api.firecrawl.dev/v2/interact${path}`,{method,headers:{Authorization:`Bearer ${key}`,'Content-Type':'application/json'},...(body===undefined?{}:{body:JSON.stringify(body)}),signal:AbortSignal.timeout(55000),cache:'no-store'});
 if(!r.ok){await r.body?.cancel();throw new QuizletMapError(r.status===404?'The Quizlet browser session expired. Open sign-in again.':r.status===409?'A sign-in window is already using this saved session. Finish or close it first.':'The Quizlet browser is unavailable. Please try again later.',r.status===404?428:[402,429].includes(r.status)?429:502);}
 const text=await r.text();if(text.length>12*1024*1024)throw new QuizletMapError('The Quizlet browser response was too large.');
 let data;try{data=JSON.parse(text);}catch{throw new QuizletMapError('The Quizlet browser returned invalid data.');}
 if(data.success!==true||data.error||data.killed||(data.exitCode!==undefined&&data.exitCode!==null&&data.exitCode!==0))throw new QuizletMapError('Could not read the Quizlet browser. Reopen it and check the page.',502);
 return data;
}
export function safeLiveUrl(value:unknown):string{
 if(typeof value!=='string')throw new QuizletMapError('No interactive sign-in window was returned.');
 const u=new URL(value);
 if(u.protocol!=='https:'||!(u.hostname==='firecrawl.dev'||u.hostname.endsWith('.firecrawl.dev'))||u.username||u.password)throw new QuizletMapError('Invalid sign-in window.');
 return u.href;
}
async function execute(id:string,code:string,deps:Deps){
 const data=await browserAPI(`/${encodeURIComponent(id)}/execute`,{code,language:'node',timeout:40},'POST',deps);
 const output=data.stdout??data.result;
 if(typeof output!=='string')throw new QuizletMapError('Could not read Quizlet sign-in status.');
 const line=output.split('\n').find((s:string)=>s.startsWith('QG_RESULT:'));
 try{return JSON.parse(line!.slice(10));}catch{throw new QuizletMapError('Could not read Quizlet sign-in status.');}
}
// Only current-account data counts as authentication. Creator/class-member models do not.
export function readQuizletPage(){
 const validOrigin=['https://quizlet.com','https://www.quizlet.com'].includes(location.origin);
 const text=document.body?.innerText??'';
 const blocked=/security check|verify (?:that )?you(?:’|'| a)?re (?:a human|not a bot)|access denied|unusual traffic/i.test(text);
 let p:any={},redux:any={};
 try{p=JSON.parse(document.querySelector('#__NEXT_DATA__')?.textContent??'{}').props?.pageProps??{};redux=JSON.parse(p.dehydratedReduxStateKey??'{}');}catch{}
 const global=p.dehydratedState?.queries?.find((q:any)=>q.queryKey==='global-app-data'||Array.isArray(q.queryKey)&&q.queryKey[0]==='global-app-data')?.state?.data;
 const user=global?.user??redux.core?.user;
 const authenticated=validOrigin&&!blocked&&!!user&&/^[1-9]\d*$/.test(String(user.id))&&typeof user.username==='string'&&!!user.username;
 // Return only class feed data needed by the parser, not cookies or other account data.
 const classPage={props:{pageProps:{data:{class:p.data?.class},dehydratedReduxStateKey:JSON.stringify({classItems:redux.classItems})}}};
 return {blocked,authenticated,username:authenticated?user.username.slice(0,100):null,classPage};
}
const readCode=`console.log('QG_RESULT:'+JSON.stringify(await page.evaluate(${readQuizletPage.toString()})));`;
export async function startQuizletConnection(previous:QuizletConnection|null,deps:Deps={}):Promise<QuizletConnection>{
 if(previous?.id&&previous.until&&previous.until>Date.now())return previous;
 const profile=previous?.profile??`qg-admin-${randomUUID()}`;
 const data=await browserAPI('',{ttl:900,activityTtl:900,profile:{name:profile,saveChanges:true}},'POST',deps);
 if(typeof data.id!=='string')throw new QuizletMapError('Could not start the Quizlet browser.');
 try{
  const liveUrl=safeLiveUrl(data.interactiveLiveViewUrl??data.liveViewUrl);
  await execute(data.id,`await page.goto('https://quizlet.com/login',{waitUntil:'domcontentloaded',timeout:30000});console.log('QG_RESULT:{}');`,deps);
  return {profile,id:data.id,liveUrl,until:Math.min(Date.now()+900000,Date.parse(data.expiresAt)||Infinity)};
 }catch(error){await browserAPI(`/${encodeURIComponent(data.id)}`,undefined,'DELETE',deps).catch(()=>{});throw error;}
}
export async function verifyQuizletConnection(c:QuizletConnection,deps:Deps={}){
 if(!c.id||!c.until||c.until<=Date.now())throw new QuizletMapError('Open Quizlet sign-in first.',428);
 const result=await execute(c.id,readCode,deps);
 if(result.blocked)throw new QuizletMapError('Quizlet is showing a security check. Complete it in the sign-in window. Class search stays locked until sign-in is verified.',428);
 if(!result.authenticated||typeof result.username!=='string')throw new QuizletMapError('Sign in to Quizlet in the opened browser first, then select Check sign-in. A separate Safari login does not connect this browser.',428);
 return {...c,username:result.username};
}
export async function endQuizletConnection(c:QuizletConnection,deps:Deps={}){
 if(c.id&&c.until&&c.until>Date.now())await browserAPI(`/${encodeURIComponent(c.id)}`,undefined,'DELETE',deps);
 return {profile:c.profile};
}
export async function discoverConnectedClass(id:unknown,c:QuizletConnection,deps:Deps={}){
 if(typeof id!=='string'||! /^[1-9]\d{0,15}$/.test(id))throw new QuizletMapError('Choose a Quizlet class.',400);
 if(!connected(c))throw new QuizletMapError('Sign in to Quizlet before searching classes.',428);
 const result=await execute(c.id,`await page.goto(${JSON.stringify(`https://quizlet.com/class/${id}/`)},{waitUntil:'domcontentloaded',timeout:30000});${readCode}`,deps);
 if(!result.authenticated||result.blocked)throw new QuizletMapError('Quizlet sign-in could not be verified. Reopen the sign-in window and check your connection.',428);
 const html='<script id="__NEXT_DATA__">'+JSON.stringify(result.classPage).replace(/</g,'\\u003c')+'</script>';
 const parsed=parseQuizletClass(html,id);
 if(!parsed.sets.length)parsed.notice='No public games were found in this class. Quizlet may not have loaded its class materials.';
 return parsed;
}
