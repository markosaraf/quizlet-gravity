// Isolated-schema integration test. Never deletes or changes real accounts.
import assert from 'node:assert/strict';
import {randomBytes} from 'node:crypto';
import {Pool} from 'pg';
import {NextRequest} from 'next/server';
async function main() {
const schema='delete_test_'+randomBytes(6).toString('hex');
const maintenance=new Pool({connectionString:process.env.DATABASE_URL});
let pool:Pool|undefined;
try {
 await maintenance.query(`CREATE SCHEMA "${schema}"`);
 for(const table of ['user','session','account','verification','rateLimit','shared_sets','game_runs','high_scores','api_limits','community_admins','deleted_users']) {
  await maintenance.query(`CREATE TABLE "${schema}"."${table}" (LIKE public."${table}" INCLUDING ALL)`);
 }
 const url=new URL(process.env.DATABASE_URL!);url.hostname=url.hostname.replace('-pooler.','.');url.searchParams.set('options',`-c search_path=${schema},public`);process.env.DATABASE_URL=url.href;
 process.env.BETTER_AUTH_URL='http://localhost:3035';
 const {db}=await import('../src/lib/community/db');pool=db;
 const {auth}=await import('../src/lib/community/auth');
 const {POST}=await import('../src/app/api/community/account/delete/route');
 const context=await auth.$context;
 const password=randomBytes(20).toString('hex');
 const person=await context.internalAdapter.createUser({email:'deletion@example.test',emailVerified:true,name:'Deletion test',username:'deletiontest'}, {method: "test"});
 await context.internalAdapter.linkAccount({userId:person.id,accountId:person.id,providerId:'credential',password:await context.password.hash(password)});
 const login=await auth.api.signInUsername({body:{username:'deletiontest',password},asResponse:true});
 assert.equal(login.status,200);
 const cookie=login.headers.getSetCookie().map(v=>v.split(';')[0]).join('; ');
 const anotherSession=await context.internalAdapter.createSession(person.id);
 const set=await db.query(`INSERT INTO shared_sets(fingerprint,title,created_by,cards,term_count) VALUES('delete-test','Deletion test',$1,'[{"term":"a","definition":"b"},{"term":"c","definition":"d"}]',2) RETURNING id`,[person.id]);
 await db.query('INSERT INTO high_scores(set_id,user_id,score,level,mode) VALUES($1,$2,1230,3,\'BEGINNER\')',[set.rows[0].id,person.id]);
 await db.query('INSERT INTO community_admins(user_id) VALUES($1)',[person.id]);
 async function request(body:unknown,origin='http://localhost:3035',cookies=cookie) {
  const r=await POST(new NextRequest('http://localhost:3035/api/community/account/delete',{method:'POST',headers:{Origin:origin,Cookie:cookies,'Content-Type':'application/json'},body:JSON.stringify(body)}));
  return {status:r.status,value:await r.json(),cookies:r.headers.getSetCookie()};
 }
 assert.equal((await request({confirmation:'DELETE',password},'https://attacker.invalid')).status,403);
 assert.equal((await request({confirmation:'DELETE',password},'http://localhost:3035','')).status,401);
 assert.equal((await request({})).status,400);
 assert.equal((await request({confirmation:'DELETE',password:'wrong'})).status,403);
 assert.equal((await db.query('SELECT count(*)::int n FROM session WHERE "userId"=$1',[person.id])).rows[0].n,2);
 const deleted=await request({confirmation:'DELETE',password});assert.equal(deleted.status,200,JSON.stringify(deleted));assert.ok(deleted.cookies.some(v=>v.includes('Max-Age=0')));
 const user=(await db.query('SELECT * FROM "user" WHERE id=$1',[person.id])).rows[0];
 assert.equal(user.name,'Deleted user');assert.equal(user.username,null);assert.equal(user.displayUsername,null);assert.equal(user.image,null);assert.notEqual(user.email,'deletion@example.test');
 assert.equal((await db.query('SELECT count(*)::int n FROM session WHERE "userId"=$1',[person.id])).rows[0].n,0);
 assert.equal((await db.query('SELECT count(*)::int n FROM account WHERE "userId"=$1',[person.id])).rows[0].n,0);
 assert.equal((await db.query('SELECT count(*)::int n FROM community_admins WHERE user_id=$1',[person.id])).rows[0].n,0);
 assert.equal((await db.query('SELECT score FROM high_scores WHERE user_id=$1',[person.id])).rows[0].score,1230);
 assert.equal((await db.query('SELECT count(*)::int n FROM shared_sets WHERE created_by=$1',[person.id])).rows[0].n,1);
 assert.equal(await auth.api.getSession({headers:new Headers({Cookie:cookie})}),null);
 assert.equal(await context.internalAdapter.findSession(anotherSession.token),null);
 const reused=await context.internalAdapter.createUser({email:'deletion@example.test',emailVerified:true,name:'New person',username:'deletiontest'}, {method: "test"});assert.notEqual(reused.id,person.id);
 // No-password accounts require a recent sign-in. Guests can remove their profile.
 const {deleteOwnAccount,AccountDeletionError}=await import('../src/lib/community/delete-account');
 const social=await context.internalAdapter.createUser({email:'social@example.test',emailVerified:true,name:'Social'}, {method: "test"});
 const socialSession=await context.internalAdapter.createSession(social.id);
 await db.query('UPDATE session SET "createdAt"=now()-interval \'1 day\' WHERE id=$1',[socialSession.id]);
 await assert.rejects(()=>deleteOwnAccount(db,social.id,socialSession.id,undefined,async()=>false),e=>e instanceof AccountDeletionError&&e.code==='REAUTH_REQUIRED');
 await db.query('UPDATE session SET "createdAt"=now() WHERE id=$1',[socialSession.id]);
 await deleteOwnAccount(db,social.id,socialSession.id,undefined,async()=>false);
 const guest=await context.internalAdapter.createUser({email:'guest@example.test',name:'Guest',isAnonymous:true}, {method: "test"});
 const guestSession=await context.internalAdapter.createSession(guest.id);
 await db.query('UPDATE session SET "createdAt"=now()-interval \'1 day\' WHERE id=$1',[guestSession.id]);
 await deleteOwnAccount(db,guest.id,guestSession.id,undefined,async()=>false);
 // Apple revocation must happen before personal data is erased. A provider
 // failure rolls back, keeping the token available for a subsequent retry.
 const apple=await context.internalAdapter.createUser({email:'apple@example.test',emailVerified:true,name:'Apple test'}, {method:'test'});
 await context.internalAdapter.linkAccount({userId:apple.id,accountId:'apple-test-id',providerId:'apple',refreshToken:'isolated-test-token'});
 const appleSession=await context.internalAdapter.createSession(apple.id);
 const originalFetch=globalThis.fetch;
 try {
  globalThis.fetch=async(input,options)=>{
   assert.equal(input,'https://appleid.apple.com/auth/revoke');
   assert.equal((options!.body as URLSearchParams).get('token'),'isolated-test-token');
   return new Response(null,{status:503});
  };
  await assert.rejects(()=>deleteOwnAccount(db,apple.id,appleSession.id,undefined,async()=>false));
  assert.equal((await db.query('SELECT email FROM "user" WHERE id=$1',[apple.id])).rows[0].email,'apple@example.test');
  assert.equal((await db.query('SELECT count(*)::int n FROM account WHERE "userId"=$1',[apple.id])).rows[0].n,1);
  globalThis.fetch=async()=>new Response(null,{status:200});
  await deleteOwnAccount(db,apple.id,appleSession.id,undefined,async()=>false);
  assert.equal((await db.query('SELECT name FROM "user" WHERE id=$1',[apple.id])).rows[0].name,'Deleted user');
 }finally{globalThis.fetch=originalFetch;}
 console.log('PASS: origin/auth/confirmation/password checks; full session and credential revocation; personal details erased; scores and sets retained as Deleted user; email/username reusable; social reauthentication and guest deletion. All fixtures isolated.');
} finally {
 await pool?.end();await maintenance.query(`DROP SCHEMA "${schema}" CASCADE`);await maintenance.end();
}

}
main().catch(error=>{console.error(error);process.exitCode=1;});
