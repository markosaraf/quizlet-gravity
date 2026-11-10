import {QuizletMapError,quizletMapLinks} from './quizlet-map.ts';

export interface QuizletClass {id:string;title:string;url:string;description:string}
export function classQuery(value:unknown):string {
 if(typeof value!=='string'||!value.trim()||value.length>160||/[\u0000-\u001f]/.test(value))throw new QuizletMapError('Enter a class name or public Quizlet class URL.',400);
 return value.trim();
}
export function classFromLink(link:{url?:unknown;title?:unknown;description?:unknown}):QuizletClass|null {
 if(typeof link?.url!=='string')return null;
 try {
  const u=new URL(link.url);
  const match=u.pathname.match(/^\/class\/([1-9]\d{0,15})(?:\/(?:materials)?)?\/?$/);
  if(!['quizlet.com','www.quizlet.com'].includes(u.hostname)||u.protocol!=='https:'||u.username||u.password||u.port||!match)return null;
  return {id:match[1],url:`https://quizlet.com/class/${match[1]}/`,title:typeof link.title==='string'?link.title.slice(0,250):`Quizlet class ${match[1]}`,description:typeof link.description==='string'?link.description.slice(0,400):''};
 }catch{return null;}
}
async function provider(endpoint:string,body:unknown,deps:{fetchImpl?:typeof fetch;apiKey?:string}) {
 const key=(deps.apiKey??process.env.FIRECRAWL_API_KEY??'').trim();
 if(!key)throw new QuizletMapError('Quizlet discovery is not configured.',503);
 const response=await (deps.fetchImpl??fetch)(`https://api.firecrawl.dev/v2/${endpoint}`,{method:'POST',headers:{'Content-Type':'application/json',Authorization:`Bearer ${key}`},body:JSON.stringify(body),signal:AbortSignal.timeout(50000),cache:'no-store'});
 if(!response.ok){await response.body?.cancel();throw new QuizletMapError('Class discovery is temporarily unavailable. Please try later.',[402,429].includes(response.status)?429:502);}
 const reader=response.body?.getReader();if(!reader)throw new QuizletMapError('Class discovery returned no data.');
 let text='',bytes=0;const decoder=new TextDecoder();
 try{while(true){const {done,value}=await reader.read();if(done)break;bytes+=value.byteLength;if(bytes>12*1024*1024){await reader.cancel();throw new QuizletMapError('Class discovery response was too large.');}text+=decoder.decode(value,{stream:true});}}finally{reader.releaseLock();}
 let payload;try{payload=JSON.parse(text+decoder.decode());}catch{throw new QuizletMapError('Class discovery returned invalid data.');}
 if(payload.success!==true)throw new QuizletMapError('Could not load public classes. Please retry.');
 return payload;
}
export async function searchQuizletClasses(value:unknown,deps:{fetchImpl?:typeof fetch;apiKey?:string}={}) {
 const query=classQuery(value),direct=classFromLink({url:query});
 if(direct)return {classes:[direct]};
 const payload=await provider('search',{query:`site:quizlet.com/class/ ${query.replace(/["\\]/g,' ')}`,limit:20},deps);
 const links=Array.isArray(payload.data)?payload.data:payload.data?.web;
 if(!Array.isArray(links))throw new QuizletMapError('Could not read class search results.');
 const classes=new Map<string,QuizletClass>();
 for(const link of links){const item=classFromLink(link);if(item&&!classes.has(item.id))classes.set(item.id,item);}
 return {classes:[...classes.values()]};
}
/** Read only public sets explicitly included in the matching class feed. Never use unrelated page links. */
export function parseQuizletClass(html:string,id:string) {
 const scripts=[...html.matchAll(/<script\b[^>]*\bid=["']__NEXT_DATA__["'][^>]*>([\s\S]*?)<\/script\s*>/gi)];
 let p,r;
 try{if(scripts.length!==1)throw Error();p=JSON.parse(scripts[0][1]).props.pageProps;r=JSON.parse(p.dehydratedReduxStateKey);}catch{throw new QuizletMapError('Quizlet is not exposing this class’s public materials. Open the class on Quizlet and import individual public set links.',422);}
 const c=p.data?.class,feed=r?.classItems;
 if(String(c?.id)!==id||String(feed?.currentClassId)!==id||typeof c?.title!=='string')throw new QuizletMapError('No matching public Quizlet class was found.',404);
 const items=feed.models?.set;
 const publicSets=items&&typeof items==='object'?Object.values(items).filter((s:any)=>s&&s.accessType===2&&!s.passwordUse):[];
 // Without explicit feed entries we cannot verify membership of any set model.
 const listedIds=new Set((Array.isArray(feed.feed)?feed.feed:[]).flatMap((entry:any)=>entry?.setId?[String(entry.setId)]:[]));
 const links=publicSets.flatMap((s:any)=>Number.isSafeInteger(s.id)&&s.id>0&&listedIds.has(String(s.id))&&typeof s.title==='string'?[{url:`https://quizlet.com/${s.id}/`,title:s.title,description:typeof s.numTerms==='number'?`${s.numTerms} terms`:''}]:[]);
 const sets=quizletMapLinks(links);
 return {classroom:{id,title:c.title,url:`https://quizlet.com/class/${id}/`,description:typeof c.description==='string'?c.description:''},sets,linksScanned:sets.length,notice:sets.length?'Only publicly exposed class materials are shown. This list may be incomplete.':'Quizlet does not expose this class’s materials without signing in. Open the class on Quizlet and import individual public set links.'};
}
export async function discoverQuizletClass(id:unknown,deps:{fetchImpl?:typeof fetch;apiKey?:string}={}) {
 if(typeof id!=='string'||! /^[1-9]\d{0,15}$/.test(id))throw new QuizletMapError('Choose a Quizlet class.',400);
 const payload=await provider('scrape',{url:`https://quizlet.com/class/${id}/`,formats:['rawHtml'],onlyMainContent:false,timeout:45000,maxAge:300000},deps);
 if(payload.data?.metadata?.statusCode!==200||typeof payload.data?.rawHtml!=='string')throw new QuizletMapError('Quizlet is not exposing this class’s public materials. Open it on Quizlet to find individual public set links.',422);
 return parseQuizletClass(payload.data.rawHtml,id);
}
