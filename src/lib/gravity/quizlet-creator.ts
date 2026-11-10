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
 return {creatorId:page.user.id as number,creator:{username:page.user.username,url:`https://quizlet.com/user/${encodeURIComponent(page.user.username)}/sets`,complete:false} as QuizletCreator,sets:quizletMapLinks(links),linksScanned:links.length};
}

const PAGE_SIZE=100;
const MAX_SETS=1000;

/** Public creator listing, not the abbreviated logged-out profile feed. */
export function parseQuizletCreatorPage(raw:string,creatorId:number,page:number,expectedTotal?:number){
 let payload;
 try{payload=JSON.parse(raw);}catch{throw new QuizletMapError('Quizlet returned invalid creator-list data.');}
 const response=payload?.responses?.length===1?payload.responses[0]:null;
 const paging=response?.paging;
 const items=response?.models?.set;
 if(!paging||!Number.isSafeInteger(paging.total)||paging.total<0||paging.page!==page||paging.perPage!==PAGE_SIZE||
    (expectedTotal!==undefined&&paging.total!==expectedTotal)||!Array.isArray(items)||
    items.length!==Math.max(0,Math.min(PAGE_SIZE,paging.total-(page-1)*PAGE_SIZE)))throw new QuizletMapError('Quizlet returned incomplete creator-list pages.');
 const ids=new Set<string>();
 const links:{url:string;title:string;description:string}[]=[];
 for(const set of items){
  if(!set||set.creatorId!==creatorId||!Number.isSafeInteger(set.id)||set.id<1||typeof set.title!=='string'||ids.has(String(set.id)))throw new QuizletMapError('Quizlet returned inconsistent creator-list data.');
  ids.add(String(set.id));
  if(set.accessType===2&&!set.passwordUse)links.push({url:`https://quizlet.com/${set.id}/`,title:set.title,description:typeof set.numTerms==='number'?`${set.numTerms} terms`:''});
 }
 const more=page*PAGE_SIZE<paging.total;
 if(more&&(typeof paging.token!=='string'||!paging.token||paging.token.length>2048))throw new QuizletMapError('Quizlet did not provide the next creator-list page.');
 return {sets:quizletMapLinks(links),ids:[...ids],total:paging.total as number,nextToken:more?paging.token as string:null};
}

export async function discoverQuizletCreator(rawUsername:unknown,deps:{fetchImpl?:typeof fetch;apiKey?:string}={}){
 const username=creatorUsername(rawUsername);
 const key=(deps.apiKey??process.env.FIRECRAWL_API_KEY??'').trim();
 if(!key)throw new QuizletMapError('Quizlet discovery is not configured.',503);
 // All pages share one deadline, leaving time for the route's database lookup.
 const signal=AbortSignal.timeout(50000);
 const scrape=async(url:string)=>{
  const response=await (deps.fetchImpl??fetch)('https://api.firecrawl.dev/v2/scrape',{
   method:'POST',headers:{'Content-Type':'application/json',Authorization:`Bearer ${key}`},
   body:JSON.stringify({url,formats:['rawHtml'],onlyMainContent:false,timeout:45000,maxAge:300000}),signal,cache:'no-store',
  });
  if(!response.ok){await response.body?.cancel();throw new QuizletMapError([402,429].includes(response.status)?'Discovery has reached its current provider limit. Please try later.':'Could not load the Quizlet profile. Please retry.',[402,429].includes(response.status)?429:502);}
  const reader=response.body?.getReader();if(!reader)throw new QuizletMapError('Discovery returned no data.');
  let text='',bytes=0;const decoder=new TextDecoder();
  try{while(true){const {done,value}=await reader.read();if(done)break;bytes+=value.byteLength;if(bytes>12*1024*1024){await reader.cancel();throw new QuizletMapError('Quizlet returned an unsupported profile.');}text+=decoder.decode(value,{stream:true});}}finally{reader.releaseLock();}
  const payload=JSON.parse(text+decoder.decode());
  if(payload.data?.metadata?.statusCode===404)throw new QuizletMapError('No public Quizlet profile was found for that username.',404);
  if(payload.success!==true||payload.data?.metadata?.statusCode!==200||payload.data?.metadata?.error||typeof payload.data?.rawHtml!=='string')throw new QuizletMapError('Could not read this public Quizlet profile. Check the username and try again.',422);
  return payload.data.rawHtml as string;
 };
 try{
  const profile=parseQuizletCreator(await scrape(`https://quizlet.com/user/${encodeURIComponent(username)}/sets`),username);
  const sets=new Map(profile.sets.map(set=>[set.setId,set]));
  const seen=new Set<string>();
  let total:number|undefined,token:string|null=null,complete=false;
  try{
   for(let page=1;page<=MAX_SETS/PAGE_SIZE;page++){
    const url=new URL('https://quizlet.com/webapi/3.4/sets');
    url.search=new URLSearchParams({'filters[creatorId]':String(profile.creatorId),perPage:String(PAGE_SIZE),page:String(page),...(token?{pagingToken:token}:{})}).toString();
    const batch=parseQuizletCreatorPage(await scrape(url.href),profile.creatorId,page,total);
    if(batch.ids.some(id=>seen.has(id)))throw new QuizletMapError('Quizlet repeated a creator-list page.');
    batch.ids.forEach(id=>seen.add(id));
    batch.sets.forEach(set=>sets.set(set.setId,set));
    total=batch.total;token=batch.nextToken;
    if(!token){complete=seen.size===total&&profile.sets.every(set=>seen.has(set.setId));break;}
   }
  }catch{
   // Keep verified results if a later page fails, but never label them complete.
   complete=false;
  }
  return {creator:{...profile.creator,complete},sets:[...sets.values()],linksScanned:Math.max(seen.size,profile.linksScanned)};
 }catch(error){
  if(error instanceof QuizletMapError)throw error;
  throw new QuizletMapError('Could not load the Quizlet profile. Please retry.');
 }
}
