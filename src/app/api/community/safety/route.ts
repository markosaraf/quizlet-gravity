import {NextRequest,NextResponse} from 'next/server';
import {z} from 'zod';
import {auth} from '@/lib/community/auth';
import {db} from '@/lib/community/db';
export const runtime='nodejs';
const json=(data:unknown,status=200)=>NextResponse.json(data,{status,headers:{'Cache-Control':'no-store'}});
const input=z.discriminatedUnion('action',[
 z.object({action:z.literal('report'),kind:z.enum(['set','user']),id:z.string().min(1).max(128),reason:z.enum(['harassment','hate','sexual','violence','spam','privacy','other'])}),
 z.object({action:z.enum(['block','unblock']),id:z.string().min(1).max(128)}),
]);
export async function GET(request:NextRequest){
 const session=await auth.api.getSession({headers:request.headers});
 if(!session)return json({error:'Choose a username or sign in first.'},401);
 try{const {rows}=await db.query(`SELECT b.blocked_id AS id,coalesce(u."displayUsername",u.username,u.name) AS username FROM user_blocks b JOIN "user" u ON u.id=b.blocked_id WHERE b.blocker_id=$1 ORDER BY b.created_at DESC LIMIT 200`,[session.user.id]);return json({blocked:rows});}
 catch{return json({error:'Unable to load blocked users.'},500);}
}
export async function POST(request:NextRequest){
 if(request.headers.get('sec-fetch-site')==='cross-site'||request.headers.get('origin')!==request.nextUrl.origin)return json({error:'Origin not allowed'},403);
 const session=await auth.api.getSession({headers:request.headers});
 if(!session)return json({error:'Choose a username or sign in first.'},401);
 if(!session.user.isAnonymous&&!session.user.emailVerified)return json({error:'Confirm your email first.'},403);
 try{
  if(!request.headers.get('content-type')?.includes('application/json'))return json({error:'JSON required'},415);
  const reader=request.body?.getReader();if(!reader)return json({error:'Body required'},400);
  let size=0,raw='';const decoder=new TextDecoder();try{while(true){const {done,value}=await reader.read();if(done)break;size+=value.length;if(size>2048){await reader.cancel();return json({error:'Request too large'},413);}raw+=decoder.decode(value,{stream:true});}}finally{reader.releaseLock();}
  const v=input.parse(JSON.parse(raw+decoder.decode()));
  if(v.action!=='unblock'){
   const {rows}=await db.query(`INSERT INTO api_limits(key,count,expires_at) VALUES($1,1,now()+interval '1 minute') ON CONFLICT(key) DO UPDATE SET count=CASE WHEN api_limits.expires_at<now() THEN 1 ELSE api_limits.count+1 END,expires_at=CASE WHEN api_limits.expires_at<now() THEN now()+interval '1 minute' ELSE api_limits.expires_at END RETURNING count`,['safety:'+session.user.id]);
   if(rows[0].count>10)return json({error:'Please wait a minute before trying again.'},429);
  }
  if(v.action==='unblock'){await db.query('DELETE FROM user_blocks WHERE blocker_id=$1 AND blocked_id=$2',[session.user.id,v.id]);return json({saved:true});}
  const isSet=v.action==='report'&&v.kind==='set';
  if(isSet&&!z.string().uuid().safeParse(v.id).success)return json({error:'Invalid set'},400);
  const target=await db.query(isSet?'SELECT id FROM shared_sets WHERE id=$1':'SELECT id FROM "user" WHERE id=$1 AND NOT EXISTS(SELECT 1 FROM deleted_users WHERE user_id=$1)',[v.id]);
  if(!target.rows.length)return json({error:'This item is no longer available.'},404);
  if(v.action==='report'){
   await db.query(`INSERT INTO content_reports(reporter_id,target_kind,target_id,reason) VALUES($1,$2,$3,$4) ON CONFLICT(reporter_id,target_kind,target_id) WHERE status='open' DO NOTHING`,[session.user.id,v.kind,v.id,v.reason]);
   return json({saved:true});
  }
  if(v.id===session.user.id)return json({error:'You cannot block yourself.'},400);
  await db.query('INSERT INTO user_blocks(blocker_id,blocked_id) VALUES($1,$2) ON CONFLICT DO NOTHING',[session.user.id,v.id]);
  return json({saved:true});
 }catch(e){return json({error:e instanceof z.ZodError||e instanceof SyntaxError?'Check your request.':'Unable to save. Please retry.'},e instanceof z.ZodError||e instanceof SyntaxError?400:500);}
}
