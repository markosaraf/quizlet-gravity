import {normalizeQuizletUrl} from './quizlet-parser.ts';

export interface DiscoveredQuizletSet {setId:string; url:string; title:string; description:string}
export class QuizletMapError extends Error {
 constructor(message:string,public status=502){super(message);}
}
export function mapOptions(input:unknown):{topic:string;limit:number}{
 if(!input||typeof input!=='object'||Array.isArray(input))throw new QuizletMapError('Enter a topic or leave it empty.',400);
 const value=input as Record<string,unknown>;
 if(typeof value.topic!=='string'||value.topic.length>120||/[\u0000-\u001f]/.test(value.topic))throw new QuizletMapError('Use a topic of up to 120 characters.',400);
 if(![100,500,1000].includes(value.limit as number))throw new QuizletMapError('Choose 100, 500 or 1,000 links.',400);
 return {topic:value.topic.trim(),limit:value.limit as number};
}
/** Keep provider relevance order, restrict to actual set pages and deduplicate by Quizlet ID. */
export function quizletMapLinks(links:unknown):DiscoveredQuizletSet[]{
 if(!Array.isArray(links))throw new QuizletMapError('Discovery returned an unexpected response. Please retry.');
 const sets=new Map<string,DiscoveredQuizletSet>();
 for(const link of links.slice(0,1000)){
  if(!link||typeof link.url!=='string'||link.url.length>2048)continue;
  try{
   const parsed=new URL(link.url);
   if(!['quizlet.com','www.quizlet.com'].includes(parsed.hostname)||!['http:','https:'].includes(parsed.protocol)||parsed.username||parsed.password||parsed.port)continue;
   const set=normalizeQuizletUrl(link.url);
   if(sets.has(set.setId))continue;
   sets.set(set.setId,{...set,title:typeof link.title==='string'&&link.title.trim()?link.title.trim().slice(0,250):`Quizlet set ${set.setId}`,description:typeof link.description==='string'?link.description.slice(0,400):''});
  }catch{/* Profiles, classes, folders and non-Quizlet links are not games. */}
 }
 return [...sets.values()];
}
export async function discoverQuizletSets(options:{topic:string;limit:number},deps:{fetchImpl?:typeof fetch;apiKey?:string}={}){
 const key=(deps.apiKey??process.env.FIRECRAWL_API_KEY??'').trim();
 if(!key)throw new QuizletMapError('Quizlet discovery is not configured.',503);
 try{
  const response=await (deps.fetchImpl??fetch)('https://api.firecrawl.dev/v2/map',{
   method:'POST',headers:{'Content-Type':'application/json',Authorization:`Bearer ${key}`},
   body:JSON.stringify({url:'https://quizlet.com',sitemap:'skip',limit:options.limit,...(options.topic?{search:options.topic}:{})}),
   signal:AbortSignal.timeout(50000),cache:'no-store',
  });
  if(!response.ok){await response.body?.cancel();throw new QuizletMapError(response.status===402||response.status===429?'Discovery has reached its current provider limit. Please try later.':'Quizlet discovery is unavailable. Please retry.',response.status===402||response.status===429?429:502);}
  const reader=response.body?.getReader();if(!reader)throw new QuizletMapError('Discovery returned no data.');
  let bytes=0,text='';const decoder=new TextDecoder();
  try{while(true){const {done,value}=await reader.read();if(done)break;bytes+=value.byteLength;if(bytes>2*1024*1024){await reader.cancel();throw new QuizletMapError('Discovery response was too large. Choose fewer links.');}text+=decoder.decode(value,{stream:true});}}finally{reader.releaseLock();}
  const payload=JSON.parse(text+decoder.decode());
  if(payload.success!==true)throw new QuizletMapError('Quizlet discovery could not finish. Please retry.');
  const sets=quizletMapLinks(payload.links);
  return {sets,linksScanned:payload.links.length};
 }catch(error){
  if(error instanceof QuizletMapError)throw error;
  throw new QuizletMapError(error instanceof Error&&['TimeoutError','AbortError'].includes(error.name)?'Discovery timed out. Try a more specific topic or fewer links.':'Quizlet discovery is unavailable. Please retry.');
 }
}
