import {QuizletMapError,quizletMapLinks} from './quizlet-map.ts';

export interface QuizletCreator {username:string;url:string;complete:boolean}
export function creatorUsername(value:unknown):string{
 if(typeof value!=='string'||! /^[a-z0-9_-]{2,50}$/i.test(value.trim()))throw new QuizletMapError('Enter the exact Quizlet username (letters, numbers, underscores or hyphens).',400);
 return value.trim();
}

/** Only use createdSets whose creator ID matches the requested public profile. */
export function parseQuizletCreator(html:string,requested:string){
 const username=creatorUsername(requested);
 if(typeof html!=='string'||Buffer.byteLength(html)>10*1024*1024)throw new QuizletMapError('Quizlet returned an unsupported profile.');
 const scripts=[...html.matchAll(/<script\b[^>]*\bid=["']__NEXT_DATA__["'][^>]*>([\s\S]*?)<\/script\s*>/gi)];
 if(scripts.length!==1)throw new QuizletMapError('Could not read this public Quizlet profile. Check the username and try again.',422);
 let page;
 try{page=JSON.parse(scripts[0][1])?.props?.pageProps;}catch{throw new QuizletMapError('Quizlet returned invalid profile data.');}
 if(typeof page?.user?.username!=='string'||page.user.username.toLowerCase()!==username.toLowerCase()||!Number.isSafeInteger(page.user.id)||page.user.id<1||!Array.isArray(page.createdSets)||page.modelView!=='created')throw new QuizletMapError('No matching public Quizlet creator profile was found.',404);
 const owned=page.createdSets.filter((set:Record<string,unknown>|null)=>set&&set.creatorId===page.user.id&&set.accessType===2&&!set.passwordUse);
 const links=owned.flatMap((set:Record<string,unknown>)=>{
  if(!Number.isSafeInteger(set.id)||Number(set.id)<1||typeof set.title!=='string')return [];
  // Construct the URL from the verified numeric ID, never trust arbitrary source URLs.
  return [{url:`https://quizlet.com/${set.id}/`,title:set.title,description:typeof set.numTerms==='number'?`${set.numTerms} terms`:''}];
 });
 return {creator:{username:page.user.username,url:`https://quizlet.com/user/${encodeURIComponent(page.user.username)}/sets`,complete:page.isFeedFinished===true&&links.length<=1000} as QuizletCreator,sets:quizletMapLinks(links),linksScanned:links.length};
}

export async function discoverQuizletCreator(rawUsername:unknown,deps:{fetchImpl?:typeof fetch;apiKey?:string}={}){
 const username=creatorUsername(rawUsername);
 const key=(deps.apiKey??process.env.FIRECRAWL_API_KEY??'').trim();
 if(!key)throw new QuizletMapError('Quizlet discovery is not configured.',503);
 try{
  const response=await (deps.fetchImpl??fetch)('https://api.firecrawl.dev/v2/scrape',{
   method:'POST',headers:{'Content-Type':'application/json',Authorization:`Bearer ${key}`},
   body:JSON.stringify({url:`https://quizlet.com/user/${encodeURIComponent(username)}/sets`,formats:['rawHtml'],onlyMainContent:false,timeout:45000,maxAge:300000}),signal:AbortSignal.timeout(50000),cache:'no-store',
  });
  if(!response.ok){await response.body?.cancel();throw new QuizletMapError([402,429].includes(response.status)?'Discovery has reached its current provider limit. Please try later.':'Could not load the Quizlet profile. Please retry.',[402,429].includes(response.status)?429:502);}
  const reader=response.body?.getReader();if(!reader)throw new QuizletMapError('Discovery returned no data.');
  let text='',bytes=0;const decoder=new TextDecoder();
  try{while(true){const {done,value}=await reader.read();if(done)break;bytes+=value.byteLength;if(bytes>12*1024*1024){await reader.cancel();throw new QuizletMapError('Quizlet returned an unsupported profile.');}text+=decoder.decode(value,{stream:true});}}finally{reader.releaseLock();}
  const payload=JSON.parse(text+decoder.decode());
  if(payload.data?.metadata?.statusCode===404)throw new QuizletMapError('No public Quizlet profile was found for that username.',404);
  if(payload.success!==true||payload.data?.metadata?.statusCode!==200||payload.data?.metadata?.error||typeof payload.data?.rawHtml!=='string')throw new QuizletMapError('Could not read this public Quizlet profile. Check the username and try again.',422);
  return parseQuizletCreator(payload.data.rawHtml,username);
 }catch(error){
  if(error instanceof QuizletMapError)throw error;
  throw new QuizletMapError('Could not load the Quizlet profile. Please retry.');
 }
}
