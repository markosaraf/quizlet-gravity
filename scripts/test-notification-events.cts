import {readFileSync} from 'node:fs';
import {randomUUID} from 'node:crypto';
import assert from 'node:assert/strict';
import {Client} from 'pg';
import {enqueueOvertakenNotifications} from '../src/lib/community/notification-events';

async function main(){
 const connectionString=readFileSync('/tmp/quizlet-notification-test-db-url','utf8').trim();
 if(connectionString.includes('ep-square-sun-adzicepw'))throw Error('Test requires the isolated notification branch');
 const client=new Client({connectionString});await client.connect();await client.query('BEGIN');
 try{
  const prefix='notification-test-'+randomUUID();
  const users=['actor','ahead','tie-earlier','tie-later','below','new-tie','unverified','guest','blocked','optout','deleted'];
  const ids=Object.fromEntries(users.map(name=>[name,prefix+'-'+name]));
  for(const name of users)await client.query(`INSERT INTO "user"(id,name,email,"emailVerified","isAnonymous","createdAt","updatedAt") VALUES($1,$2,$3,$4,$5,now(),now())`,[ids[name],name,ids[name]+'@example.invalid',name!=='unverified',name==='guest']);
  const setId=randomUUID();await client.query(`INSERT INTO shared_sets(id,fingerprint,title,created_by,cards,term_count) VALUES($1,$2,'Notification fixture',$3,'[{"term":"a","definition":"b"},{"term":"c","definition":"d"}]',2)`,[setId,prefix,ids.actor]);
  const scores={actor:50,ahead:80,'tie-earlier':50,'tie-later':50,below:40,'new-tie':90,unverified:85,guest:84,blocked:83,optout:82,deleted:81};
  for(const [name,score]of Object.entries(scores))await client.query(`INSERT INTO high_scores(set_id,user_id,score,level,mode,achieved_at) VALUES($1,$2,$3,1,'INTERMEDIATE',now()+($4||' minutes')::interval)`,[setId,ids[name],score,name==='tie-earlier'?-2:name==='tie-later'?2:0]);
  await client.query('INSERT INTO user_blocks(blocker_id,blocked_id) VALUES($1,$2)',[ids.blocked,ids.actor]);
  await client.query('INSERT INTO deleted_users(user_id) VALUES($1)',[ids.deleted]);
  await client.query('INSERT INTO notification_preferences(user_id,email_enabled) VALUES($1,false)',[ids.optout]);
  const run={id:randomUUID(),set_id:setId,user_id:ids.actor};
  await client.query(`INSERT INTO game_runs(id,set_id,user_id,mode) VALUES($1,$2,$3,'INTERMEDIATE')`,[run.id,setId,ids.actor]);
  await client.query("UPDATE community_settings SET enabled=false WHERE key IN ('overtaken_email','overtaken_push')");
  assert.deepEqual(await enqueueOvertakenNotifications(client,run,90),[],'Off means no backlog');
  await client.query("UPDATE community_settings SET enabled=true WHERE key='overtaken_email'");
  assert.equal((await enqueueOvertakenNotifications(client,run,90)).length,2);
  const {rows}=await client.query('SELECT recipient_id,channel FROM leaderboard_notifications WHERE run_id=$1',[run.id]);
  assert.deepEqual(rows.map(r=>r.recipient_id).sort(),[ids.ahead,ids['tie-earlier']].sort(),'Only players actually passed; exclude self, ties, lower scores, blocked/deleted/unverified/guest and opted-out accounts');
  assert.ok(rows.every(r=>r.channel==='email'));
  assert.deepEqual(await enqueueOvertakenNotifications(client,run,90),[],'Repeated finish cannot create duplicates');
  await client.query('UPDATE high_scores SET score=90,achieved_at=now() WHERE set_id=$1 AND user_id=$2',[setId,ids.actor]);
  const next={...run,id:randomUUID()};await client.query(`INSERT INTO game_runs(id,set_id,user_id,mode) VALUES($1,$2,$3,'INTERMEDIATE')`,[next.id,setId,ids.actor]);
  assert.deepEqual(await enqueueOvertakenNotifications(client,next,90),[],'Equal best score does not notify');
  assert.deepEqual(await enqueueOvertakenNotifications(client,next,20),[],'Lower score does not notify');
  console.log('PASS: disabled delivery, actual overtakes, ties, blocked/deleted/guest/unverified/opted-out recipients, duplicate finishes and unchanged best scores. No emails or push messages sent.');
 }finally{await client.query('ROLLBACK');await client.end();}
}
main().catch(e=>{console.error(e);process.exitCode=1;});
