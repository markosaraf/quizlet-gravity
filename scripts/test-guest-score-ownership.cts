// Real auth and native exchange, using only synthetic data in a disposable schema.
import assert from 'node:assert/strict';
import {randomBytes,createHash} from 'node:crypto';
import {Pool} from 'pg';
import {NextRequest} from 'next/server';

async function main(){
 if(!process.env.DATABASE_URL)throw Error('DATABASE_URL is required');
 const schema='guest_ownership_'+randomBytes(8).toString('hex');
 const url=new URL(process.env.DATABASE_URL);url.hostname=url.hostname.replace('-pooler.','.');
 const maintenance=new Pool({connectionString:url.href,connectionTimeoutMillis:15000});
 let pool:Pool|undefined;
 try{
  await maintenance.query(`CREATE SCHEMA "${schema}"`);
  for(const table of ['user','session','account','verification','rateLimit','shared_sets','game_runs','high_scores','native_handoffs','user_blocks','deleted_users','notification_preferences','leaderboard_notifications']){
   await maintenance.query(`CREATE TABLE "${schema}"."${table}" (LIKE public."${table}" INCLUDING ALL)`);
  }
  // Never fall back to public: a missing test table must fail, not use live data.
  url.searchParams.set('options',`-c search_path=${schema}`);
  process.env.DATABASE_URL=url.href;process.env.BETTER_AUTH_URL='http://localhost:3035';
  process.env.BETTER_AUTH_SECRET='isolated-guest-ownership-'+randomBytes(32).toString('hex');
  delete process.env.GMAIL_REFRESH_TOKEN;
  console.log('Disposable schema ready');
  const {db}=await import('../src/lib/community/db');pool=db;
  const {auth}=await import('../src/lib/community/auth');
  auth.options.emailVerification!.sendVerificationEmail=async()=>{throw Error('Test must not send emails');};
  console.log('Auth module loaded');
  const context=await auth.$context;
  console.log('Auth context ready');
  const {POST}=await import('../src/app/api/native/[action]/route');
  const {leaderboardQuery}=await import('../src/lib/community/leaderboard');
  const cookie=(r:Response)=>r.headers.getSetCookie().map(v=>v.split(';')[0]).join('; ');
  const password=randomBytes(20).toString('hex');
  const account=await context.internalAdapter.createUser({email:'account@example.test',emailVerified:true,name:'account',username:'account',isAnonymous:false});
  await context.internalAdapter.linkAccount({userId:account.id,accountId:account.id,providerId:'credential',password:await context.password.hash(password)});
  const set=(await db.query(`INSERT INTO shared_sets(fingerprint,title,cards,term_count,public_id) VALUES('fixture','Fixture','[{"term":"1","definition":"1"},{"term":"2","definition":"2"}]',2,'9999999999999999999') RETURNING id`)).rows[0];
  await db.query(`INSERT INTO high_scores(set_id,user_id,score,level,mode) VALUES($1,$2,100,1,'BEGINNER')`,[set.id,account.id]);
  async function guest(name:string){
   const response=await auth.api.signInAnonymous({asResponse:true});assert.equal(response.status,200);
   const data=await response.clone().json();
   await db.query(`UPDATE "user" SET name=$2,username=$2,"displayUsername"=$2 WHERE id=$1`,[data.user.id,name]);
   await db.query(`INSERT INTO game_runs(user_id,set_id,mode,finished_at,score,level) VALUES($1,$2,'MAD_MAX',now(),146710,10)`,[data.user.id,set.id]);
   await db.query(`INSERT INTO high_scores(set_id,user_id,score,level,mode) VALUES($1,$2,146710,10,'MAD_MAX')`,[set.id,data.user.id]);
   await db.query('UPDATE shared_sets SET created_by=$1 WHERE id=$2',[data.user.id,set.id]);
   return {id:data.user.id,cookie:cookie(response),name};
  }
  async function unchanged(g:{id:string;name:string}){
   const u=(await db.query('SELECT name,"isAnonymous" FROM "user" WHERE id=$1',[g.id])).rows[0];
   assert.deepEqual(u,{name:g.name,isAnonymous:true},'Guest identity survives sign-in');
   assert.equal((await db.query('SELECT score FROM high_scores WHERE user_id=$1',[g.id])).rows[0].score,146710);
   assert.equal((await db.query('SELECT score FROM high_scores WHERE user_id=$1',[account.id])).rows[0].score,100,'Account best is not replaced');
   assert.equal((await db.query('SELECT user_id FROM game_runs WHERE user_id=$1',[g.id])).rowCount,1);
   const board=(await db.query(leaderboardQuery,[set.id,0,account.id,50,false])).rows[0].entries;
   assert.equal(board.find((r:any)=>r.player_id===g.id).guest,true);
   assert.equal(board.find((r:any)=>r.player_id===g.id).username,g.name);
   assert.equal((await db.query('SELECT created_by FROM shared_sets WHERE id=$1',[set.id])).rows[0].created_by,account.id,'Authored set claiming still works');
  }
  console.log('Synthetic account and score ready');
  for(const method of ['username','email'] as const){
   const g=await guest('guest_'+method);
   const response=method==='username'
    ?await auth.api.signInUsername({headers:new Headers({cookie:g.cookie}),body:{username:'account',password},asResponse:true})
    :await auth.api.signInEmail({headers:new Headers({cookie:g.cookie}),body:{email:'account@example.test',password},asResponse:true});
   assert.equal(response.status,200);assert.equal((await response.json()).user.id,account.id);await unchanged(g);
  }
  const g=await guest('guest_native');
  const login=await auth.api.signInUsername({body:{username:'account',password},asResponse:true});
  const verifier=randomBytes(32).toString('base64url');
  const send=(action:string,body:unknown,session:string)=>POST(new NextRequest('http://localhost:3035/api/native/'+action,{method:'POST',headers:{Origin:'http://localhost:3035','Content-Type':'application/json',Cookie:session},body:JSON.stringify(body)}),{params:Promise.resolve({action})});
  const authorize=await send('authorize',{challenge:createHash('sha256').update(verifier).digest('base64url')},cookie(login));assert.equal(authorize.status,200);
  const {code}=await authorize.json();
  assert.equal((await send('exchange',{code,verifier:randomBytes(32).toString('base64url')},g.cookie)).status,400);
  const exchange=await send('exchange',{code,verifier},g.cookie);assert.equal(exchange.status,200);
  assert.equal((await auth.api.getSession({headers:new Headers({Cookie:cookie(exchange)})}))?.user.id,account.id);
  await unchanged(g);
  assert.equal((await send('exchange',{code,verifier},g.cookie)).status,400);
  // Exercise the signed opt-out through the same isolated database; no delivery.
  const {notificationUnsubscribeUrl}=await import('../src/lib/community/notification-unsubscribe');
  const {POST:optOut}=await import('../src/app/api/notifications/email-opt-out/route');
  const token=new URL(notificationUnsubscribeUrl(account.id,'account@example.test')).searchParams.get('token')!;
  const request=(value:string)=>new NextRequest('http://localhost:3035/api/notifications/email-opt-out',{method:'POST',body:new URLSearchParams({token:value})});
  assert.equal((await optOut(request(token+'tampered'))).status,400);
  assert.equal((await optOut(request(token))).status,303);
  assert.equal((await db.query('SELECT email_enabled,push_enabled FROM notification_preferences WHERE user_id=$1',[account.id])).rows[0].email_enabled,false);
  console.log('PASS: real username/email sign-in and native PKCE exchange retain guest identity, runs, scores and guest leaderboard label; account score unchanged; set claiming preserved; replay rejected; signed opt-out changes preference. No emails sent.');
 }finally{await pool?.end();await maintenance.query(`DROP SCHEMA IF EXISTS "${schema}" CASCADE`);await maintenance.end();}
}
main().catch(error=>{console.error(error);process.exitCode=1;});
