import {readFileSync} from 'node:fs';
import {randomUUID} from 'node:crypto';
import assert from 'node:assert/strict';
async function main(){
 const connection=readFileSync('/tmp/quizlet-welcome-test-db-url','utf8').trim();
 if(connection.includes('ep-square-sun-adzicepw'))throw Error('Production forbidden');
 process.env.DATABASE_URL=connection;process.env.BETTER_AUTH_SECRET='test-only';
 const {db}=await import('../src/lib/community/db');
 const {processWelcomeEmail,welcomeEligibleSql}=await import('../src/lib/community/welcome-emails');
 const {welcomeEmailHash}=await import('../src/lib/community/welcome-unsubscribe');
 const {NotificationDeliveryError}=await import('../src/lib/community/notification-delivery');
 await db.query(readFileSync('scripts/welcome-email-schema.sql','utf8'));
 const settings=(await db.query('SELECT * FROM welcome_email_settings WHERE id')).rows[0];
 const users:string[]=[],hashes:string[]=[];let calls=0;
 const deliver=async()=>{calls++;return 'mock-receipt';};
 async function user(options:{old?:boolean;guest?:boolean;verified?:boolean;email?:string}={}){
  const id='welcome-fixture-'+randomUUID(),email=options.email||id+'@example.invalid';users.push(id);hashes.push(welcomeEmailHash(email));
  await db.query(`INSERT INTO "user"(id,name,email,"emailVerified","isAnonymous","createdAt","updatedAt") VALUES($1,'Welcome fixture',$2,$3,$4,now()+$5::interval,now())`,[id,email,options.verified!==false,!!options.guest,options.old?'-1 day':'1 second']);
  return {id,email,hash:welcomeEmailHash(email)};
 }
 try{
  await db.query('UPDATE welcome_email_settings SET enabled=true,eligible_since=now() WHERE id');
  const first=await user();await Promise.all([processWelcomeEmail(first.id,first.hash,deliver),processWelcomeEmail(first.id,first.hash,deliver)]);await processWelcomeEmail(first.id,first.hash,deliver);assert.equal(calls,1,'Concurrent and repeated requests must send once');
  for(const options of [{old:true},{guest:true},{verified:false}]){const u=await user(options);await processWelcomeEmail(u.id,u.hash,deliver);}assert.equal(calls,1,'Old, guest and unverified users excluded');
  const out=await user();await db.query('INSERT INTO welcome_email_opt_outs(email_hash) VALUES($1)',[out.hash]);await processWelcomeEmail(out.id,out.hash,deliver);assert.equal(calls,1);
  const paused=await user();await db.query('UPDATE welcome_email_settings SET enabled=false WHERE id');await processWelcomeEmail(paused.id,paused.hash,deliver);assert.equal(calls,1);await db.query('UPDATE welcome_email_settings SET enabled=true WHERE id');await processWelcomeEmail(paused.id,paused.hash,deliver);assert.equal(calls,2);
  const uncertain=await user();await processWelcomeEmail(uncertain.id,uncertain.hash,async()=>{calls++;throw new NotificationDeliveryError('unknown',false,false,true);});await processWelcomeEmail(uncertain.id,uncertain.hash,deliver);assert.equal(calls,3,'Uncertain results are not retried');
  const retry=await user();await assert.rejects(()=>processWelcomeEmail(retry.id,retry.hash,async()=>{throw new NotificationDeliveryError('rate_limit',true);}));await processWelcomeEmail(retry.id,retry.hash,deliver);assert.equal(calls,4);
  const crashed=await user();await db.query("INSERT INTO welcome_email_deliveries(user_id,email_hash,status) VALUES($1,$2,'sending')",[crashed.id,crashed.hash]);await processWelcomeEmail(crashed.id,crashed.hash,deliver);assert.equal(calls,4,'Interrupted delivery cannot duplicate');
  const changed=await user();await db.query('UPDATE "user" SET email=$2 WHERE id=$1',[changed.id,'changed-'+changed.email]);await processWelcomeEmail(changed.id,changed.hash,deliver);assert.equal(calls,4,'Queued email identity cannot change');
  const deleted=await user();await db.query('INSERT INTO deleted_users(user_id) VALUES($1)',[deleted.id]);await processWelcomeEmail(deleted.id,deleted.hash,deliver);assert.equal(calls,4);
  const duplicate=await user({email:'CASE@example.invalid'});await processWelcomeEmail(duplicate.id,duplicate.hash,deliver);const duplicate2=await user({email:'case@example.invalid'});await processWelcomeEmail(duplicate2.id,duplicate2.hash,deliver);assert.equal(calls,5,'Email deduplication is case insensitive');
  const due=(await db.query('SELECT u.id '+welcomeEligibleSql)).rows;assert(!due.some(u=>u.id===first.id));
  console.log('PASS: concurrent/repeated delivery, old accounts, guests, verification, opt-out, off/on, uncertain outcomes, safe retries, interrupted sends, changed emails, deleted users and case-insensitive deduplication. No emails sent.');
 }finally{
  await db.query('DELETE FROM welcome_email_deliveries WHERE user_id=ANY($1::text[])',[users]);await db.query('DELETE FROM welcome_email_opt_outs WHERE email_hash=ANY($1::text[])',[hashes]);await db.query('DELETE FROM deleted_users WHERE user_id=ANY($1::text[])',[users]);await db.query('DELETE FROM "user" WHERE id=ANY($1::text[])',[users]);
  await db.query('UPDATE welcome_email_settings SET enabled=$1,eligible_since=$2,last_scheduled_for=$3,updated_at=$4 WHERE id',[settings.enabled,settings.eligible_since,settings.last_scheduled_for,settings.updated_at]);await db.end();
 }
}
main().catch(e=>{console.error(e);process.exitCode=1;});
