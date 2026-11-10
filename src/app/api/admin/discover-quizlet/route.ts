import {NextRequest,NextResponse} from 'next/server';
import {unstable_cache} from 'next/cache';
import {auth} from '@/lib/community/auth';
import {isAdmin} from '@/lib/community/admin';
import {db} from '@/lib/community/db';
import {sharedSetPath} from '@/lib/community/set-links';
import {ImportGuard} from '@/lib/gravity/quizlet-import-guard';
import {discoverQuizletSets,mapOptions,QuizletMapError} from '@/lib/gravity/quizlet-map';
import {creatorUsername,discoverQuizletCreator} from '@/lib/gravity/quizlet-creator';
import {classQuery,searchQuizletClasses,discoverQuizletClass} from '@/lib/gravity/quizlet-class';
import {QUIZLET_CONNECTION_COOKIE,readConnection,connected,discoverConnectedClass} from '@/lib/gravity/quizlet-admin-browser';
export const runtime='nodejs';
export const maxDuration=60;
const guard=new ImportGuard();
const json=(data:unknown,status=200)=>NextResponse.json(data,{status,headers:{'Cache-Control':'no-store',...(status===429?{'Retry-After':'60'}:{})}});
export async function POST(request:NextRequest){
 if(request.headers.get('sec-fetch-site')==='cross-site'||request.headers.get('origin')!==request.nextUrl.origin)return json({error:'Origin not allowed.'},403);
 try{
  const session=await auth.api.getSession({headers:request.headers});
  if(!session||session.user.isAnonymous||!await isAdmin(session.user.id))return json({error:'Administrator access required.'},403);
  if(!request.headers.get('content-type')?.startsWith('application/json'))return json({error:'Send JSON.'},415);
  const reader=request.body?.getReader();if(!reader)return json({error:'Enter a topic or leave it empty.'},400);
  let text='',bytes=0;const decoder=new TextDecoder();
  try{while(true){const {done,value}=await reader.read();if(done)break;bytes+=value.byteLength;if(bytes>2048){await reader.cancel();return json({error:'Request too large.'},413);}text+=decoder.decode(value,{stream:true});}}finally{reader.releaseLock();}
  let input:unknown;try{input=JSON.parse(text+decoder.decode());}catch{return json({error:'Send valid JSON.'},400);}
  const value=input&&typeof input==='object'?input as Record<string,unknown>:{};
  const classMode=value.mode==='class';
  const query=classMode?classQuery(value.query):null;
  const classId=classMode&&value.classId!==undefined?value.classId:null;
  const creatorMode=!!input&&typeof input==='object'&&'mode' in input&&input.mode==='creator';
  const username=creatorMode?creatorUsername((input as Record<string,unknown>).username):null;
  const options=creatorMode||classMode?null:mapOptions(input);
  if(!guard.allow(session.user.id))return json({error:'Please wait a minute before discovering more games.'},429);
  if(classMode){
   const connection=await readConnection(request.cookies.get(QUIZLET_CONNECTION_COOKIE)?.value,session.user.id);
   if(!connected(connection))return json({error:'Sign in to Quizlet before searching classes.',requiresQuizletLogin:true},428);
   const task=guard.run<Awaited<ReturnType<typeof discoverQuizletClass>>|Awaited<ReturnType<typeof searchQuizletClasses>>>(JSON.stringify({userId:session.user.id,browser:connection.id,query,classId}),()=>classId!==null
    ?discoverConnectedClass(classId,connection)
    :unstable_cache(()=>searchQuizletClasses(query),['quizlet-class-search-v1',query!],{revalidate:300})());
   if(!task)return json({error:'Discovery is busy. Please retry in a moment.'},429);
   const result=await task;
   if('classes' in result)return json(result);
   const {rows}=result.sets.length?await db.query('SELECT quizlet_id,public_id,title,source_url FROM shared_sets WHERE quizlet_id=ANY($1::text[])',[result.sets.map(s=>s.setId)]):{rows:[]};
   const existing=new Map(rows.map(s=>[s.quizlet_id,sharedSetPath(s)] as const));
   return json({...result,sets:result.sets.map(s=>({...s,sharePath:existing.get(s.setId)??null}))});
  }
  const task=guard.run(JSON.stringify({username,options}),()=>username
   ?unstable_cache(()=>discoverQuizletCreator(username),['quizlet-creator-v2',username.toLowerCase()],{revalidate:300})()
   :unstable_cache(()=>discoverQuizletSets(options!),['quizlet-map-v1',options!.topic,String(options!.limit)],{revalidate:300})());
  if(!task)return json({error:'Discovery is busy. Please retry in a moment.'},429);
  const result=await task;
  const {rows}=result.sets.length?await db.query('SELECT quizlet_id,public_id,title,source_url FROM shared_sets WHERE quizlet_id=ANY($1::text[])',[result.sets.map(s=>s.setId)]):{rows:[]};
  const existing=new Map(rows.map(s=>[s.quizlet_id,sharedSetPath(s)] as const));
  return json({...result,sets:result.sets.map(s=>({...s,sharePath:existing.get(s.setId)??null}))});
 }catch(error){return json({error:error instanceof QuizletMapError?error.message:'Could not load discovery. Please retry.',...(error instanceof QuizletMapError&&error.status===428?{requiresQuizletLogin:true}:{})},error instanceof QuizletMapError?error.status:500);}
}
