import {NextRequest,NextResponse} from 'next/server';
import {auth} from '@/lib/community/auth';
import {isAdmin} from '@/lib/community/admin';
import {ImportGuard} from '@/lib/gravity/quizlet-import-guard';
import {QuizletMapError} from '@/lib/gravity/quizlet-map';
import {QUIZLET_CONNECTION_COOKIE,readConnection,sealConnection,connectionStatus,startQuizletConnection,verifyQuizletConnection,endQuizletConnection} from '@/lib/gravity/quizlet-admin-browser';
export const runtime='nodejs';
export const maxDuration=120;
const guard=new ImportGuard();
const busy=new Set<string>();
const json=(data:unknown,status=200)=>NextResponse.json(data,{status,headers:{'Cache-Control':'private, no-store','Referrer-Policy':'no-referrer'}});
export async function GET(request:NextRequest){return handle(request,'status');}
export async function POST(request:NextRequest){return handle(request,request.nextUrl.searchParams.get('action')??'');}
async function handle(request:NextRequest,action:string){
 if(request.headers.get('sec-fetch-site')==='cross-site'||request.method==='POST'&&request.headers.get('origin')!==request.nextUrl.origin)return json({error:'Origin not allowed.'},403);
 try{
  const session=await auth.api.getSession({headers:request.headers});
  if(!session||session.user.isAnonymous||!await isAdmin(session.user.id))return json({error:'Administrator access required.'},403);
  const c=await readConnection(request.cookies.get(QUIZLET_CONNECTION_COOKIE)?.value,session.user.id);
  if(action==='status')return json(connectionStatus(c));
  if(!['start','verify','end'].includes(action))return json({error:'Unknown action.'},400);
  if(!guard.allow(session.user.id))return json({error:'Please wait a minute before checking again.'},429);
  if(busy.has(session.user.id))return json({error:"Sign-in is busy. Please retry shortly."},429);
  busy.add(session.user.id);
  const task=guard.run(session.user.id,async()=>{
   if(action==='start')return startQuizletConnection(c);
   if(!c)throw new QuizletMapError('Open Quizlet sign-in first.',428);
   return action==='verify'?verifyQuizletConnection(c):endQuizletConnection(c);
  });
  if(!task){busy.delete(session.user.id);return json({error:'Sign-in is busy. Please retry shortly.'},429);}
  const updated=await task.finally(()=>busy.delete(session.user.id));
  const response=json(connectionStatus(updated));
  response.cookies.set(QUIZLET_CONNECTION_COOKIE,await sealConnection(updated,session.user.id),{httpOnly:true,secure:process.env.NODE_ENV==='production',sameSite:'strict',path:'/api/admin',maxAge:30*86400});
  return response;
 }catch(e){return json({error:e instanceof QuizletMapError?e.message:'Could not connect to Quizlet. Please retry.'},e instanceof QuizletMapError?e.status:500);}
}
