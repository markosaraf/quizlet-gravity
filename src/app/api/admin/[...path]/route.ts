import {welcomeEmailSettings,scheduleWelcomeEmails} from '@/lib/community/welcome-emails';
import {safelyProcessGameIndexing} from '@/lib/community/game-indexing';
import {after,NextRequest,NextResponse} from 'next/server';
import {randomUUID} from 'node:crypto';
import {auth} from '@/lib/community/auth';
import {communitySettings} from '@/lib/community/settings';
import {db} from '@/lib/community/db';
import {revokeAppleAccess} from '@/lib/community/apple';
import {isAdmin} from '@/lib/community/admin';
import {adminLeaderboardQuery,leaderboardPageSize} from '@/lib/community/leaderboard';
import {adminGamesQuery} from '@/lib/community/admin-games';
import {notificationSettings,notificationReadiness} from '@/lib/community/notification-settings';
export const runtime='nodejs';
const json=(data:unknown,status=200)=>NextResponse.json(data,{status,headers:{'Cache-Control':'no-store'}});
type Context={params:Promise<{path:string[]}>};
export async function GET(request:NextRequest,{params}:Context){
 try{
  const session=await auth.api.getSession({headers:request.headers});
  const admin=!!session&&!session.user.isAnonymous&&await isAdmin(session.user.id);
  const {path}=await params;
  if(path.join('/')==='status')return json({admin});
  if(!admin)return json({error:'Administrator access required.'},403);
  if(path.join('/')==='notifications'){
   const {rows}=await db.query("SELECT status,count(*)::int AS count FROM leaderboard_notifications WHERE created_at>now()-interval '7 days' GROUP BY status");
   return json({...await notificationSettings(),ready:notificationReadiness(),deliveries:Object.fromEntries(rows.map(r=>[r.status,r.count]))});
  }
  if(path.join('/')==='welcome-emails')return json(await welcomeEmailSettings());
  if(path.join('/')==='settings')return json(await communitySettings());
  const offset=Math.max(0,Math.min(100000,Math.floor(Number(request.nextUrl.searchParams.get('offset'))||0)));
  const q=(request.nextUrl.searchParams.get('q')||'').trim().slice(0,120);
  const pattern='%'+q.replace(/[\\%_]/g,'\\$&')+'%';
  if(path.join('/')==='game-overview'){
   const {rows}=await db.query(adminGamesQuery,[q,pattern,offset,request.nextUrl.searchParams.get('withScores')==='true']);
   return json({games:rows.slice(0,24).map(({catalogue_total,...game})=>game),total:Number(rows[0]?.catalogue_total||0),hasMore:rows.length>24});
  }
  if(path[0]==='leaderboards'&&path.length===2){
   if(!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(path[1]))return json({error:'Invalid game.'},400);
   // Administrators must see the full board, including personally blocked players.
   const {rows}=await db.query(adminLeaderboardQuery,[path[1],offset,null,leaderboardPageSize(request.nextUrl.searchParams.get('limit')),false]);
   return json(rows[0]);
  }
  if(path.join('/')==='reports'){
   const {rows}=await db.query(`SELECT r.id,r.target_kind,r.target_id,r.reason,r.created_at,s.title,s.public_id,coalesce(u."displayUsername",u.username,u.name) AS username FROM content_reports r LEFT JOIN shared_sets s ON r.target_kind='set' AND s.id::text=r.target_id LEFT JOIN "user" u ON r.target_kind='user' AND u.id=r.target_id WHERE r.status='open' ORDER BY r.created_at,r.id LIMIT 51 OFFSET $1`,[offset]);
   return json({reports:rows.slice(0,50),hasMore:rows.length>50});
  }
  if(path.join('/')==='users'){
   const audience=request.nextUrl.searchParams.get('audience')||'all';
   if(!['all','accounts','guests','unused-guests'].includes(audience))return json({error:'Choose a valid user filter.'},400);
   const {rows:counts}=await db.query(`SELECT count(*)::int AS total,count(*) FILTER(WHERE NOT coalesce(u."isAnonymous",false))::int AS accounts,count(*) FILTER(WHERE u."isAnonymous")::int AS guests FROM "user" u WHERE NOT EXISTS(SELECT 1 FROM deleted_users d WHERE d.user_id=u.id)`);
   const {rows}=await db.query(`SELECT u.id,coalesce(u."displayUsername",u.username,u.name) AS username,CASE WHEN coalesce(u."isAnonymous",false) THEN NULL ELSE u.email END AS email,u."isAnonymous" AS guest,u."createdAt" AS created_at,EXISTS(SELECT 1 FROM community_admins a WHERE a.user_id=u.id) AS admin FROM "user" u WHERE NOT EXISTS(SELECT 1 FROM deleted_users d WHERE d.user_id=u.id) AND ($4='all' OR ($4='accounts' AND NOT coalesce(u."isAnonymous",false)) OR ($4='guests' AND u."isAnonymous") OR ($4='unused-guests' AND u."isAnonymous" AND NOT EXISTS(SELECT 1 FROM high_scores h WHERE h.user_id=u.id) AND NOT EXISTS(SELECT 1 FROM shared_sets s WHERE s.created_by=u.id))) AND ($1='' OR coalesce(u."displayUsername",u.username,u.name) ILIKE $2 ESCAPE '\\' OR (NOT coalesce(u."isAnonymous",false) AND u.email ILIKE $2 ESCAPE '\\')) ORDER BY u."createdAt" DESC,u.id LIMIT 51 OFFSET $3`,[q,pattern,offset,audience]);
   return json({users:rows.slice(0,50),hasMore:rows.length>50,...counts[0]});
  }
  if(path.join('/')==='sets'){
   const {rows}=await db.query(`SELECT s.id,s.public_id,s.title,s.source_url,s.term_count,s.created_at,coalesce(u."displayUsername",u.username,u.name,'Deleted user') AS creator FROM shared_sets s LEFT JOIN "user" u ON u.id=s.created_by WHERE $1='' OR s.title ILIKE $2 ESCAPE '\\' ORDER BY s.created_at DESC,s.id LIMIT 51 OFFSET $3`,[q,pattern,offset]);
   return json({sets:rows.slice(0,50),hasMore:rows.length>50});
  }
  return json({error:'Not found'},404);
 }catch{return json({error:'Unable to load moderation tools.'},500);}
}
export async function DELETE(request:NextRequest,{params}:Context){
 const origin=request.headers.get('origin');
 if(request.headers.get('sec-fetch-site')==='cross-site'||(origin&&origin!==request.nextUrl.origin))return json({error:'Origin not allowed'},403);
 const session=await auth.api.getSession({headers:request.headers});
 if(!session||session.user.isAnonymous||!await isAdmin(session.user.id))return json({error:'Administrator access required.'},403);
 const {path}=await params;
 if(path.length!==2||!['users','sets'].includes(path[0])||!path[1]||path[1].length>128)return json({error:'Not found'},404);
 if(path[0]==='sets'&&!/^[0-9a-f-]{36}$/i.test(path[1]))return json({error:'Invalid set.'},400);
 const client=await db.connect();
 try{
  await client.query('BEGIN');
  if(path[0]==='users'){
   const {rows}=await client.query('SELECT id,email FROM "user" WHERE id=$1 FOR UPDATE',[path[1]]);
   if(!rows.length){await client.query('ROLLBACK');return json({error:'User not found.'},404);}
   const admins=await client.query('SELECT 1 FROM community_admins WHERE user_id=$1',[path[1]]);
   if(admins.rows.length){await client.query('ROLLBACK');return json({error:'Administrator accounts cannot be deleted here.'},400);}
   await revokeAppleAccess(client,path[1]);
   await client.query('DELETE FROM session WHERE "userId"=$1',[path[1]]);
   await client.query('DELETE FROM account WHERE "userId"=$1',[path[1]]);
   await client.query('DELETE FROM verification WHERE identifier=$1 OR value=$2',[rows[0].email,path[1]]);
   await client.query(`UPDATE "user" SET name='Deleted user',username=NULL,"displayUsername"=NULL,email=$2,"emailVerified"=false,image=NULL,"isAnonymous"=false,"updatedAt"=now() WHERE id=$1`,[path[1],randomUUID()+'@deleted.invalid']);
   await client.query('INSERT INTO deleted_users(user_id) VALUES($1) ON CONFLICT DO NOTHING',[path[1]]);
  }else{
   const result=await client.query('DELETE FROM shared_sets WHERE id=$1 RETURNING id',[path[1]]);
   if(!result.rows.length){await client.query('ROLLBACK');return json({error:'Set not found.'},404);}
  }
  await client.query('INSERT INTO moderation_log(actor_id,action,target_id) VALUES($1,$2,$3)',[session.user.id,path[0]==='users'?'delete_user':'delete_set',path[1]]);
  await client.query('COMMIT');if(path[0]==='sets')after(()=>safelyProcessGameIndexing().then(()=>{}));return json({deleted:true});
 }catch{await client.query('ROLLBACK');return json({error:'Unable to delete. Please retry.'},500);}finally{client.release();}
}

export async function POST(request:NextRequest,{params}:Context){
 if(request.headers.get('sec-fetch-site')==='cross-site'||request.headers.get('origin')!==request.nextUrl.origin)return json({error:'Origin not allowed'},403);
 const session=await auth.api.getSession({headers:request.headers});
 if(!session||session.user.isAnonymous||!await isAdmin(session.user.id))return json({error:'Administrator access required.'},403);
 const {path}=await params;
 if(path.join('/')==='notifications'){
  try{
   const input=await request.json();const fields={overtakenEmailEnabled:'overtaken_email',overtakenPushEnabled:'overtaken_push'} as const;
   if(!input||typeof input!=='object'||Array.isArray(input)||!Object.keys(input).length||Object.entries(input).some(([k,v])=>!Object.hasOwn(fields,k)||typeof v!=='boolean'))return json({error:'Choose on or off.'},400);
   const ready=notificationReadiness();
   if(input.overtakenEmailEnabled&&!ready.email)return json({error:'Email delivery is not configured yet.'},409);
   if(input.overtakenPushEnabled&&(!ready.android||!ready.apple))return json({error:'Finish Android and Apple push setup before enabling delivery.'},409);
   const entries=Object.entries(input);
   const client=await db.connect();try{await client.query('BEGIN');
    await client.query('INSERT INTO community_settings(key,enabled) SELECT * FROM unnest($1::text[],$2::boolean[]) ON CONFLICT(key) DO UPDATE SET enabled=EXCLUDED.enabled,updated_at=now()',[entries.map(([k])=>fields[k as keyof typeof fields]),entries.map(([,v])=>v)]);
    const off=entries.filter(([,v])=>!v).map(([k])=>k==='overtakenEmailEnabled'?'email':'push');
    if(off.length)await client.query("UPDATE leaderboard_notifications SET status='cancelled',last_error='disabled_by_admin',updated_at=now() WHERE status='pending' AND channel=ANY($1::text[])",[off]);
    await client.query('COMMIT');
   }catch(e){await client.query('ROLLBACK');throw e;}finally{client.release();}
   return json({...await notificationSettings(),ready});
  }catch{return json({error:'Unable to save notification settings.'},500);}
 }
 if(path.join('/')==='welcome-emails'){
  try{
   const input=await request.json();if(!input||Object.keys(input).length!==1||typeof input.enabled!=='boolean')return json({error:'Choose on or off.'},400);
   if(input.enabled&&(!notificationReadiness().email||!process.env.CRON_SECRET))return json({error:'Configure email delivery and scheduling first.'},409);
   await db.query('UPDATE welcome_email_settings SET enabled=$1,updated_at=now() WHERE id',[input.enabled]);
   let schedulingError=false;
   if(input.enabled)try{await scheduleWelcomeEmails();}catch{console.error('Welcome email scheduling failed after settings update');schedulingError=true;}
   return json({...await welcomeEmailSettings(),schedulingError});
  }catch{return json({error:'Unable to save welcome email settings.'},500);}
 }
 if(path.join('/')==='settings'){
  try{
   const input=await request.json();
   const fields={challengeShareEnabled:'challenge_share',quizletSearchEnabled:'quizlet_search',gamePageTotalEnabled:'game_page_total',tutorialEnabled:'tutorial',specialLettersEnabled:'special_letters',specialCharactersEnabled:'special_characters'} as const;
   if(!input||typeof input!=='object'||Array.isArray(input))return json({error:'Choose on or off.'},400);
   const entries=Object.entries(input);
   if(!entries.length||entries.some(([key,value])=>!Object.hasOwn(fields,key)||typeof value!=='boolean'))return json({error:'Choose on or off.'},400);
   const keys=entries.map(([key])=>fields[key as keyof typeof fields]);
   await db.query("INSERT INTO community_settings(key,enabled) SELECT * FROM unnest($1::text[],$2::boolean[]) ON CONFLICT(key) DO UPDATE SET enabled=EXCLUDED.enabled,updated_at=now()",[keys,entries.map(([,value])=>value)]);
   return json(await communitySettings());
  }catch{return json({error:'Unable to save settings.'},500);}
 }
 if(path.length!==3||path[0]!=='reports'||path[2]!=='resolve'||!/^[0-9a-f-]{36}$/i.test(path[1]))return json({error:'Not found'},404);
 try{await db.query("UPDATE content_reports SET status='resolved',resolved_at=now(),resolved_by=$2 WHERE id=$1",[path[1],session.user.id]);return json({saved:true});}
 catch{return json({error:'Unable to resolve report.'},500);}
}
