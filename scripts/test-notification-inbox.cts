import {readFileSync} from 'node:fs';
import {randomUUID} from 'node:crypto';
import assert from 'node:assert/strict';
import {NextRequest} from 'next/server';
async function main(){
 const url=readFileSync('/tmp/quizlet-notification-test-db-url','utf8').trim();if(url.includes('ep-square-sun-adzicepw'))throw Error('Isolated notification branch required');
 process.env.DATABASE_URL=url;process.env.BETTER_AUTH_URL='http://localhost:3038';process.env.BETTER_AUTH_SECRET='notification-inbox-isolated-test';delete process.env.GMAIL_REFRESH_TOKEN;
 const {db}=await import('../src/lib/community/db');const {auth}=await import('../src/lib/community/auth');(await auth.$context).rateLimit.enabled=false;
 const {enqueueOvertakenNotifications}=await import('../src/lib/community/notification-events');
 const {GET,POST}=await import('../src/app/api/notifications/inbox/route');
 const {POST:status}=await import('../src/app/api/notifications/inbox/status/route');
 const {notificationOpenToken}=await import('../src/lib/community/notification-open');
 const users:string[]=[];let setId:string|undefined;
 try{
  async function guest(){const name='inbox '+randomUUID().slice(0,8);const response=await auth.handler(new Request('http://localhost:3038/api/auth/sign-in/anonymous',{method:'POST',headers:{Origin:'http://localhost:3038','Content-Type':'application/json'},body:JSON.stringify({username:name})}));assert.equal(response.status,200);const data=await response.json();users.push(data.user.id);return{id:data.user.id,cookie:response.headers.getSetCookie().map(v=>v.split(';')[0]).join('; ')};}
  const actor=await guest(),recipient=await guest(),outsider=await guest();
  setId=randomUUID();await db.query(`INSERT INTO shared_sets(id,fingerprint,title,cards,term_count) VALUES($1,$2,'Inbox test','[{"term":"one","definition":"1"},{"term":"two","definition":"2"}]',2)`,[setId,'inbox-'+setId]);
  await db.query(`INSERT INTO high_scores(set_id,user_id,score,level,mode) VALUES($1,$2,10,1,'BEGINNER')`,[setId,recipient.id]);
  const run={id:randomUUID(),set_id:setId,user_id:actor.id};await db.query(`INSERT INTO game_runs(id,set_id,user_id,mode) VALUES($1,$2,$3,'BEGINNER')`,[run.id,setId,actor.id]);
  const client=await db.connect();try{await client.query('BEGIN');await enqueueOvertakenNotifications(client,run,100);await enqueueOvertakenNotifications(client,run,100);await client.query('COMMIT');}finally{client.release()}
  const get=(cookie='',suffix='')=>GET(new NextRequest('http://localhost:3038/api/notifications/inbox'+suffix,{headers:{Cookie:cookie}}));
  const post=(cookie:string,body:unknown,origin='http://localhost:3038')=>POST(new NextRequest('http://localhost:3038/api/notifications/inbox',{method:'POST',headers:{Origin:origin,Cookie:cookie,'Content-Type':'application/json'},body:JSON.stringify(body)}));
  assert.equal((await get()).status,401);
  const feed=await(await get(recipient.cookie)).json();assert.equal(feed.notifications.length,1);assert.equal(feed.unreadCount,1);const id=feed.notifications[0].id;
  assert.equal((await(await get(recipient.cookie)).json()).unreadCount,1,'Viewing inbox must not mark anything read');
  assert.equal((await(await get(outsider.cookie)).json()).notifications.length,0);
  assert.equal((await post(outsider.cookie,{id})).status,404);assert.equal((await post(recipient.cookie,{id},'https://elsewhere.invalid')).status,403);
  assert.equal((await post('',{id,token:'forged'})).status,401);
  const opened=await(await post(recipient.cookie,{id})).json();assert.equal(opened.unreadCount,0);assert.ok(opened.readAt);
  assert.equal((await(await post(recipient.cookie,{id})).json()).readAt,opened.readAt,'Repeat clicks are idempotent');
  const history=await(await get(recipient.cookie)).json();assert.equal(history.notifications.length,1);assert.ok(history.notifications[0].read_at);
  await db.query('UPDATE notification_inbox SET read_at=NULL WHERE id=$1',[id]);
  const signed=notificationOpenToken(id,recipient.id);
  assert.equal((await post('',{id,token:signed+'x'})).status,401);
  assert.equal((await post('',{id,token:signed})).status,200,'Signed email click works without login');
  assert.equal((await(await get(recipient.cookie)).json()).unreadCount,0);
  const native=await status(new NextRequest('http://localhost:3038/api/notifications/inbox/status',{method:'POST',headers:{Origin:'http://localhost:3038',Cookie:recipient.cookie,'Content-Type':'application/json'},body:JSON.stringify({ids:[id]})}));assert.deepEqual(await native.json(),{unreadCount:0,clearIds:[id]});
  await db.query('UPDATE notification_inbox SET read_at=NULL WHERE id=$1',[id]);await db.query('INSERT INTO user_blocks(blocker_id,blocked_id) VALUES($1,$2)',[recipient.id,actor.id]);
  assert.equal((await(await get(recipient.cookie)).json()).unreadCount,0,'Blocked actors excluded from badge and history');
  console.log('PASS: real overtaking → one inbox row; private history/counts; viewing never clears; ownership/CSRF; idempotent clicks; signed email clicks; native clearing; blocks. No messages sent.');
 }finally{if(setId)await db.query('DELETE FROM shared_sets WHERE id=$1',[setId]);await db.query('DELETE FROM "user" WHERE id=ANY($1::text[])',[users]);await db.end();}
}
main().catch(e=>{console.error(e);process.exitCode=1});
