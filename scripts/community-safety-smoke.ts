// Integration fixtures live in a disposable schema on the staging database.
import assert from 'node:assert/strict';
import {randomBytes} from 'node:crypto';
import {readFileSync} from 'node:fs';
import {Pool} from 'pg';
import {NextRequest} from 'next/server';
async function main(){
 const path=process.env.SAFETY_TEST_ENV_FILE;
 if(!path)throw Error('Set SAFETY_TEST_ENV_FILE to an isolated staging database JSON file.');
 const stage=JSON.parse(readFileSync(path,'utf8'));
 const schema='safety_test_'+randomBytes(6).toString('hex');
 const maintenance=new Pool({connectionString:stage.DATABASE_URL});let pool:Pool|undefined;
 try{
  await maintenance.query(`CREATE SCHEMA "${schema}"`);
  for(const table of ['user','session','account','verification','rateLimit','shared_sets','game_runs','high_scores','api_limits','community_admins','deleted_users','content_reports','user_blocks','moderation_log'])await maintenance.query(`CREATE TABLE "${schema}"."${table}" (LIKE public."${table}" INCLUDING ALL)`);
  const url=new URL(stage.DATABASE_URL);url.hostname=url.hostname.replace('-pooler.','.');url.searchParams.set('options',`-c search_path=${schema},public`);process.env.DATABASE_URL=url.href;process.env.BETTER_AUTH_URL='http://localhost:3035';
  const {db}=await import('../src/lib/community/db');pool=db;
  const {auth}=await import('../src/lib/community/auth');const context=await auth.$context;
  const safety=await import('../src/app/api/community/safety/route');
  const community=await import('../src/app/api/community/[...path]/route');
  const admin=await import('../src/app/api/admin/[...path]/route');
  async function user(name:string,verified=true){
   const password=randomBytes(20).toString('hex');
   const u=await context.internalAdapter.createUser({email:name+'@example.test',emailVerified:verified,name,username:name},{method:'test'});
   await context.internalAdapter.linkAccount({userId:u.id,accountId:u.id,providerId:'credential',password:await context.password.hash(password)});
   // Creating a session directly also allows testing an unverified session.
   await context.internalAdapter.createSession(u.id);
   if(!verified)return {u,cookie:''};
   const login=await auth.api.signInUsername({body:{username:name,password},asResponse:true});assert.equal(login.status,200);
   return {u,cookie:login.headers.getSetCookie().map(v=>v.split(';')[0]).join('; ')};
  }
  const a=await user('reporter'),b=await user('contributor'),c=await user('moderator');
  await db.query('INSERT INTO community_admins(user_id) VALUES($1)',[c.u.id]);
  const set=(await db.query(`INSERT INTO shared_sets(fingerprint,title,created_by,cards,term_count) VALUES('fixture','Test set',$1,'[{"term":"a","definition":"b"},{"term":"c","definition":"d"}]',2) RETURNING id`,[b.u.id])).rows[0];
  await db.query(`INSERT INTO high_scores(set_id,user_id,score,level,mode) VALUES($1,$2,100,2,'BEGINNER')`,[set.id,b.u.id]);
  const req=(path:string,cookie=a.cookie,body?:unknown,origin='http://localhost:3035')=>new NextRequest('http://localhost:3035/api/'+path,{method:body===undefined?'GET':'POST',headers:{Cookie:cookie,Origin:origin,'Content-Type':'application/json'},...(body!==undefined?{body:JSON.stringify(body)}:{})});
  async function action(body:unknown,cookie=a.cookie,origin='http://localhost:3035'){return safety.POST(req('community/safety',cookie,body,origin));}
  assert.equal((await action({action:'report',kind:'set',id:set.id,reason:'spam'},'')).status,401);
  assert.equal((await action({action:'block',id:b.u.id},a.cookie,'https://attacker.invalid')).status,403);
  assert.equal((await action({action:'block',id:a.u.id})).status,400);
  assert.equal((await action({action:'report',kind:'set',id:'invalid',reason:'spam'})).status,400);
  const report={action:'report',kind:'set',id:set.id,reason:'spam'};
  assert.equal((await action(report)).status,200);assert.equal((await action(report)).status,200);
  assert.equal((await db.query('SELECT count(*)::int n FROM content_reports')).rows[0].n,1);
  const ctx=(path:string[])=>({params:Promise.resolve({path})});
  assert.equal((await admin.GET(req('admin/reports'),ctx(['reports']))).status,403);
  const reports=await (await admin.GET(req('admin/reports',c.cookie),ctx(['reports']))).json();assert.equal(reports.reports.length,1);
  assert.equal((await action({action:'block',id:b.u.id})).status,200);
  const blocked=await(await safety.GET(req('community/safety'))).json();assert.equal(blocked.blocked[0].id,b.u.id);
  const listing=async(cookie:string)=> (await community.GET(req('community/sets',cookie),ctx(['sets']))).json();
  assert.equal((await listing(a.cookie)).sets.length,0);assert.equal((await listing(c.cookie)).sets.length,1);
  assert.equal((await community.GET(req('community/sets/'+set.id),ctx(['sets',set.id]))).status,404);
  assert.equal((await(await community.GET(req('community/sets/'+set.id+'/leaderboard'),ctx(['sets',set.id,'leaderboard']))).json()).entries.length,0);
  assert.equal((await action({action:'unblock',id:b.u.id})).status,200);assert.equal((await listing(a.cookie)).sets.length,1);
  const resolve=['reports',reports.reports[0].id,'resolve'];
  assert.equal((await admin.POST(req('admin/'+resolve.join('/'),a.cookie,{}),ctx(resolve))).status,403);
  assert.equal((await admin.POST(req('admin/'+resolve.join('/'),c.cookie,{}),ctx(resolve))).status,200);
  assert.equal((await db.query('SELECT status FROM content_reports')).rows[0].status,'resolved');
  const {containsAbuse,assertShareable}=await import('../src/lib/community/content-safety');
  assert.equal(containsAbuse('French vocabulary'),false);assert.equal(containsAbuse('fuck you'),true);
  assert.throws(()=>assertShareable('fuck you',[{term:'a',definition:'b'}]));
  const bad=await community.POST(req('community/sets',a.cookie,{title:'fuck you',cards:[{term:'a',definition:'b'},{term:'c',definition:'d'}]}),ctx(['sets']));assert.equal(bad.status,400);
  console.log('PASS: authenticated reporting, origin checks, report deduplication, admin-only queue/resolution, personal blocks, hidden sets and scores, unblock, and content validation. No live accounts modified.');
 }finally{await pool?.end();await maintenance.query(`DROP SCHEMA "${schema}" CASCADE`);await maintenance.end();}
}
main().catch(e=>{console.error(e);process.exitCode=1;});
