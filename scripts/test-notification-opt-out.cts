import {readFileSync} from 'node:fs';
import {randomUUID} from 'node:crypto';
import assert from 'node:assert/strict';

async function main(){
 const connection=readFileSync('/tmp/quizlet-notification-test-db-url','utf8').trim();
 if(connection.includes('ep-square-sun-adzicepw'))throw Error('Refusing production for opt-out test');
 process.env.DATABASE_URL=connection;process.env.BETTER_AUTH_SECRET='test-only-'+randomUUID();
 const {db}=await import('../src/lib/community/db');
 const {notificationUnsubscribeUrl,readNotificationUnsubscribeToken}=await import('../src/lib/community/notification-unsubscribe');
 const {renderOvertakenEmail}=await import('../src/lib/community/overtaken-message');
 const {POST}=await import('../src/app/api/notifications/email-opt-out/route');
 const {NextRequest}=await import('next/server');
 const user='opt-out-test-'+randomUUID(),other='opt-out-other-'+randomUUID(),email=user+'@example.invalid';
 try{
  for(const id of [user,other])await db.query(`INSERT INTO "user"(id,name,email,"emailVerified","createdAt","updatedAt") VALUES($1,'Opt-out test',$2,true,now(),now())`,[id,id+'@example.invalid']);
  for(const id of [user,other])await db.query('INSERT INTO notification_preferences(user_id,email_enabled,push_enabled) VALUES($1,true,true)',[id]);
  const unsubscribeUrl=notificationUnsubscribeUrl(user,email),token=new URL(unsubscribeUrl).searchParams.get('token')!;
  assert.equal(readNotificationUnsubscribeToken(token)?.user,user);
  assert.equal(readNotificationUnsubscribeToken(token+'tampered'),null);
  const mail=renderOvertakenEmail('Alex',{id:randomUUID(),public_id:'1000000000000029',title:'A < B'},{unsubscribeUrl});
  assert.ok(mail.html.includes('A &lt; B'));
  assert.ok(mail.html.includes('Turn off leaderboard emails'));
  assert.ok(mail.html.indexOf('Turn off leaderboard emails')>mail.html.indexOf('You received this because'));
  assert.ok(!/preview|test disclaimer/i.test(mail.subject+mail.text));
  assert.ok(mail.html.includes('email-wordmark-indigo.png'));
  assert.throws(()=>renderOvertakenEmail('Alex',{id:randomUUID(),public_id:'1',title:'Test'},{unsubscribeUrl:''}));
  const send=(value:string,oneClick=false)=>POST(new NextRequest('https://www.quizletgravity.com/api/notifications/email-opt-out'+(oneClick?'?token='+encodeURIComponent(value):''),{method:'POST',headers:{'Content-Type':'application/x-www-form-urlencoded'},body:new URLSearchParams(oneClick?{'List-Unsubscribe':'One-Click'}:{token:value})}));
  assert.equal((await send(token+'tampered')).status,400);
  assert.equal((await db.query('SELECT email_enabled FROM notification_preferences WHERE user_id=$1',[user])).rows[0].email_enabled,true);
  assert.equal((await send(token)).status,303);
  const {rows}=await db.query('SELECT user_id,email_enabled,push_enabled FROM notification_preferences WHERE user_id=ANY($1::text[])',[[user,other]]);
  assert.equal(rows.find(r=>r.user_id===user).email_enabled,false);
  assert.equal(rows.find(r=>r.user_id===user).push_enabled,true,'Email opt-out leaves push preference alone');
  assert.equal(rows.find(r=>r.user_id===other).email_enabled,true,'Cannot affect another recipient');
  assert.equal((await send(token)).status,303,'Repeated clicks are harmless');
  await db.query('UPDATE notification_preferences SET email_enabled=true WHERE user_id=$1',[user]);
  assert.equal((await send(token,true)).status,200,'Standard Gmail one-click unsubscribe supported');
  await db.query('UPDATE "user" SET email=$2 WHERE id=$1',[user,'changed-'+email]);
  assert.equal((await send(token)).status,400,'Old email address link cannot affect changed account');
  console.log('PASS: required opt-out button, signed recipient link, tamper rejection, actual preference update, unchanged push/other-user settings, repeat clicks, Gmail one-click and changed-email protection.');
 }finally{await db.query('DELETE FROM "user" WHERE id=ANY($1::text[])',[[user,other]]);await db.end();}
}
main().catch(e=>{console.error(e);process.exitCode=1;});
