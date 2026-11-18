import {readFileSync} from 'node:fs';
import {randomUUID} from 'node:crypto';
import assert from 'node:assert/strict';

async function main(){
 const connection=readFileSync('/tmp/quizlet-notification-test-db-url','utf8').trim();
 if(connection.includes('ep-square-sun-adzicepw'))throw Error('Refusing production for delivery tests');
 process.env.DATABASE_URL=connection;
 const {db}=await import('../src/lib/community/db');
 const {processLeaderboardNotification}=await import('../src/lib/community/notification-worker');
 const {NotificationDeliveryError}=await import('../src/lib/community/notification-delivery');
 const actor='worker-actor-'+randomUUID(),user='worker-recipient-'+randomUUID(),set=randomUUID();
 let calls=0;
 const deliver=async(job:{recipient_id:string;game:{id:string}})=>{assert.equal(job.recipient_id,user);assert.equal(job.game.id,set);calls++;return 'mock-receipt';};
 const mocks={email:deliver,android:deliver,apple:deliver};
 const flags=(await db.query("SELECT key,enabled FROM community_settings WHERE key IN ('overtaken_email','overtaken_push')")).rows;
 async function event(){const run=randomUUID();await db.query("INSERT INTO game_runs(id,user_id,set_id,mode) VALUES($1,$2,$3,'INTERMEDIATE')",[run,actor,set]);return (await db.query("INSERT INTO leaderboard_notifications(run_id,set_id,actor_id,recipient_id,channel,destination) VALUES($1,$2,$3,$4,'email','email') RETURNING id",[run,set,actor,user])).rows[0].id as string;}
 async function status(id:string){return (await db.query('SELECT status FROM leaderboard_notifications WHERE id=$1',[id])).rows[0]?.status;}
 try{
  for(const id of [actor,user])await db.query(`INSERT INTO "user"(id,name,email,"emailVerified","createdAt","updatedAt") VALUES($1,'Worker test',$2,true,now(),now())`,[id,id+'@example.invalid']);
  await db.query(`INSERT INTO shared_sets(id,fingerprint,title,created_by,cards,term_count) VALUES($1,$2,'Worker fixture',$3,'[{"term":"a","definition":"b"},{"term":"c","definition":"d"}]',2)`,[set,set,actor]);
  for(const [id,score]of [[actor,100],[user,50]])await db.query("INSERT INTO high_scores(set_id,user_id,score,level,mode) VALUES($1,$2,$3,1,'INTERMEDIATE')",[set,id,score]);
  await db.query('INSERT INTO notification_preferences(user_id,email_enabled,push_enabled) VALUES($1,true,true)',[user]);
  await db.query("UPDATE community_settings SET enabled=true WHERE key IN ('overtaken_email','overtaken_push')");
  const first=await event();await Promise.allSettled([processLeaderboardNotification(first,mocks),processLeaderboardNotification(first,mocks)]);await processLeaderboardNotification(first,mocks);
  assert.equal(calls,1,'Concurrent/repeated deliveries must not send duplicate emails');assert.equal(await status(first),'sent');
  await db.query('UPDATE notification_preferences SET email_enabled=false WHERE user_id=$1',[user]);
  const optedOut=await event();await processLeaderboardNotification(optedOut,mocks);assert.equal(await status(optedOut),'cancelled');assert.equal(calls,1);
  await db.query('UPDATE notification_preferences SET email_enabled=true WHERE user_id=$1',[user]);
  await db.query("UPDATE community_settings SET enabled=false WHERE key='overtaken_email'");
  const disabled=await event();await processLeaderboardNotification(disabled,mocks);assert.equal(await status(disabled),'cancelled');assert.equal(calls,1);
  await db.query("UPDATE community_settings SET enabled=true WHERE key='overtaken_email'");
  await db.query('UPDATE high_scores SET score=110 WHERE set_id=$1 AND user_id=$2',[set,user]);
  const recovered=await event();await processLeaderboardNotification(recovered,mocks);assert.equal(await status(recovered),'cancelled');assert.equal(calls,1);
  await db.query('UPDATE high_scores SET score=50 WHERE set_id=$1 AND user_id=$2',[set,user]);
  const unknown=await event();await processLeaderboardNotification(unknown,{...mocks,email:async()=>{calls++;throw new NotificationDeliveryError('ambiguous',false,false,true)}});assert.equal(await status(unknown),'uncertain');await processLeaderboardNotification(unknown,mocks);assert.equal(calls,2,'Ambiguous Gmail delivery must not be resent');
  const retry=await event();await assert.rejects(()=>processLeaderboardNotification(retry,{...mocks,email:async()=>{throw new NotificationDeliveryError('temporary',true)}}));assert.equal(await status(retry),'pending');await processLeaderboardNotification(retry,mocks);assert.equal(await status(retry),'sent');assert.equal(calls,3);
  const interrupted=await event();await db.query("UPDATE leaderboard_notifications SET status='delivering',updated_at=now()-interval '5 minutes' WHERE id=$1",[interrupted]);await processLeaderboardNotification(interrupted,mocks);assert.equal(await status(interrupted),'uncertain');assert.equal(calls,3);
  console.log('PASS: concurrent and duplicate deliveries, late opt-out, admin disable, recovered rank, retryable errors, uncertain sends and interrupted email delivery. All providers mocked; no external messages.');
 }finally{
  await db.query('DELETE FROM shared_sets WHERE id=$1',[set]);await db.query('DELETE FROM "user" WHERE id=ANY($1::text[])',[[actor,user]]);
  for(const flag of flags)await db.query('UPDATE community_settings SET enabled=$2 WHERE key=$1',[flag.key,flag.enabled]);
  await db.end();
 }
}
main().catch(e=>{console.error(e);process.exitCode=1;});
