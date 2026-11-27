import {readFileSync} from 'node:fs';
import assert from 'node:assert/strict';
import {randomUUID} from 'node:crypto';
import {NextRequest} from 'next/server';
async function main(){
 const url=readFileSync('/tmp/quizlet-notification-test-db-url','utf8').trim();if(url.includes('ep-square-sun-adzicepw'))throw Error('Isolated branch required');
 process.env.DATABASE_URL=url;process.env.BETTER_AUTH_URL='http://localhost:4395';process.env.BETTER_AUTH_SECRET=randomUUID()+randomUUID();delete process.env.GMAIL_REFRESH_TOKEN;
 const {db}=await import('../src/lib/community/db');const {auth}=await import('../src/lib/community/auth');(await auth.$context).rateLimit.enabled=false;
 const {GET,POST}=await import('../src/app/api/community/font-preference/route');const {POST:adminPost}=await import('../src/app/api/admin/[...path]/route');
 const users:string[]=[];const before=await db.query("SELECT key,enabled FROM community_settings WHERE key IN ('cyber_logo','cyber_all','cyber_non_quizlet')");
 try{
  await db.query(readFileSync('scripts/cyber-font-schema.sql','utf8'));
  async function guest(){const name='cyber '+randomUUID().slice(0,8);const r=await auth.handler(new Request('http://localhost:4395/api/auth/sign-in/anonymous',{method:'POST',headers:{Origin:'http://localhost:4395','Content-Type':'application/json'},body:JSON.stringify({username:name})}));assert.equal(r.status,200);const data=await r.json();users.push(data.user.id);return {id:data.user.id,cookie:r.headers.getSetCookie().map(s=>s.split(';')[0]).join('; ')};}
  const a=await guest(),b=await guest();
  const request=(cookie='',value?:unknown,origin='http://localhost:4395')=>new NextRequest('http://localhost:4395/api/community/font-preference',{method:value===undefined?'GET':'POST',headers:{Origin:origin,Cookie:cookie,'Content-Type':'application/json'},...(value===undefined?{}:{body:JSON.stringify(value)})});
  assert.equal((await GET(request())).status,401);
  assert.equal((await POST(request(a.cookie,{mode:'all'},'https://elsewhere.invalid'))).status,403);
  assert.equal((await POST(request(a.cookie,{mode:'bogus'}))).status,400);
  assert.equal((await adminPost(request(a.cookie,{cyberLogoEnabled:true}),{params:Promise.resolve({path:['settings']})})).status,403);
  await db.query("INSERT INTO community_settings(key,enabled) VALUES('cyber_logo',true) ON CONFLICT(key) DO UPDATE SET enabled=true");
  assert.equal((await POST(request(a.cookie,{mode:'all',userId:b.id}))).status,400);
  assert.equal((await POST(request(a.cookie,{mode:'all'}))).status,200);
  assert.equal((await(await GET(request(a.cookie))).json()).mode,'all');assert.equal((await(await GET(request(b.cookie))).json()).mode,null);
  await db.query("UPDATE community_settings SET enabled=false WHERE key='cyber_logo'");
  assert.equal((await POST(request(a.cookie,{mode:'off'}))).status,403);
  await db.query('UPDATE "user" SET "isAnonymous"=false WHERE id=$1',[a.id]);
  await db.query('INSERT INTO community_admins(user_id) VALUES($1)',[a.id]);
  const adminSave=await adminPost(request(a.cookie,{cyberAllEnabled:true,cyberNonQuizletEnabled:false}),{params:Promise.resolve({path:['settings']})});
  assert.equal(adminSave.status,200);const saved=await adminSave.json();assert.equal(saved.cyberAllEnabled,true);assert.equal(saved.cyberNonQuizletEnabled,false);
  console.log('PASS: administrator save, authenticated persistence, per-user isolation, forged user ID rejected, invalid mode rejected, cross-origin rejected, non-admin rejected, hidden switch enforced.');
 }finally{
  await db.query('DELETE FROM "user" WHERE id=ANY($1::text[])',[users]);
  await db.query("DELETE FROM community_settings WHERE key IN ('cyber_logo','cyber_all','cyber_non_quizlet')");
  for(const row of before.rows)await db.query('INSERT INTO community_settings(key,enabled) VALUES($1,$2)',[row.key,row.enabled]);
  await db.end();
 }
}
main().catch(e=>{console.error(e.message);process.exitCode=1;});
