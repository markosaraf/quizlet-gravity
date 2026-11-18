import {db} from './db';
import {deliverAndroidNotification,deliverAppleNotification,deliverLeaderboardEmail,NotificationDeliveryError,type NotificationJob} from './notification-delivery';

type Deliver=(job:NotificationJob)=>Promise<string>;
const providers={email:deliverLeaderboardEmail,android:deliverAndroidNotification,apple:deliverAppleNotification};

/** The database claim makes retries harmless, including concurrent queue deliveries. */
export async function processLeaderboardNotification(id:string,delivery:{email:Deliver;android:Deliver;apple:Deliver}=providers){
 const client=await db.connect();let event;
 try{
  await client.query('BEGIN');
  const {rows}=await client.query('SELECT * FROM leaderboard_notifications WHERE id=$1 FOR UPDATE',[id]);event=rows[0];
  if(!event||['sent','cancelled','failed','uncertain'].includes(event.status)){await client.query('COMMIT');return;}
  if(event.status==='delivering'){
   if(Date.now()-new Date(event.updated_at).getTime()<120000){await client.query('ROLLBACK');throw new NotificationDeliveryError('delivery_in_progress',true);}
   // Gmail has no idempotency API. After a crashed/ambiguous send, don't risk
   // another copy. Push retries replace the same notification by its event ID.
   if(event.channel==='email'){await client.query("UPDATE leaderboard_notifications SET status='uncertain',last_error='delivery_interrupted',updated_at=now() WHERE id=$1",[id]);await client.query('COMMIT');return;}
  }
  await client.query("UPDATE leaderboard_notifications SET status='delivering',attempts=attempts+1,updated_at=now() WHERE id=$1",[id]);
  await client.query('COMMIT');
 }catch(error){await client.query('ROLLBACK');throw error;}finally{client.release();}
 let accepted=false;
 try{
  const {rows}=await db.query(`SELECT n.*,g.public_id,g.title,g.source_url,u.email,
   coalesce(a."displayUsername",a.username,a.name) AS actor_name,
   d.token,d.platform,d.environment,
   (n.created_at>now()-interval '24 hours'
    AND EXISTS(SELECT 1 FROM community_settings WHERE key=CASE WHEN n.channel='email' THEN 'overtaken_email' ELSE 'overtaken_push' END AND enabled)
    AND NOT EXISTS(SELECT 1 FROM deleted_users x WHERE x.user_id IN(n.actor_id,n.recipient_id))
    AND NOT EXISTS(SELECT 1 FROM user_blocks b WHERE (b.blocker_id=n.recipient_id AND b.blocked_id=n.actor_id) OR (b.blocker_id=n.actor_id AND b.blocked_id=n.recipient_id))
    AND EXISTS(SELECT 1 FROM high_scores actor JOIN high_scores recipient ON actor.set_id=recipient.set_id WHERE actor.set_id=n.set_id AND actor.user_id=n.actor_id AND recipient.user_id=n.recipient_id AND actor.score>recipient.score)
    AND CASE WHEN n.channel='email' THEN coalesce(p.email_enabled,true) AND u."emailVerified" AND NOT coalesce(u."isAnonymous",false)
      ELSE coalesce(p.push_enabled,true) AND d.user_id=n.recipient_id AND s."userId"=n.recipient_id AND s."expiresAt">now() END
   ) AS eligible
   FROM leaderboard_notifications n JOIN shared_sets g ON g.id=n.set_id
   JOIN "user" u ON u.id=n.recipient_id JOIN "user" a ON a.id=n.actor_id
   LEFT JOIN notification_preferences p ON p.user_id=n.recipient_id
   LEFT JOIN notification_devices d ON d.id=n.device_id LEFT JOIN session s ON s.id=d.session_id
   WHERE n.id=$1`,[id]);
  const row=rows[0];
  if(!row?.eligible){await db.query("UPDATE leaderboard_notifications SET status='cancelled',last_error='no_longer_eligible',updated_at=now() WHERE id=$1",[id]);return;}
  const job:NotificationJob={id,actor_name:row.actor_name,recipient_id:row.recipient_id,email:row.email,game:{id:row.set_id,public_id:row.public_id,title:row.title,source_url:row.source_url},...(row.channel==='push'?{device:{token:row.token,platform:row.platform,environment:row.environment}}:{})};
  const provider=row.channel==='email'?delivery.email:row.platform==='android'?delivery.android:delivery.apple;
  const providerId=await provider(job);accepted=true;
  await db.query("UPDATE leaderboard_notifications SET status='sent',provider_id=$2,delivered_at=now(),updated_at=now(),last_error=NULL WHERE id=$1",[id,providerId]);
 }catch(error){
  const failure=accepted&&event.channel==='email'?new NotificationDeliveryError('receipt_save_failed',false,false,true):error instanceof NotificationDeliveryError?error:new NotificationDeliveryError('temporary_delivery_failure',true);
  const retry=failure.retryable&&event.attempts<5;
  await db.query('UPDATE leaderboard_notifications SET status=$2,last_error=$3,updated_at=now() WHERE id=$1',[id,failure.uncertain?'uncertain':retry?'pending':'failed',failure.code]);
  if(failure.invalidToken&&event.device_id)await db.query('DELETE FROM notification_devices WHERE id=$1',[event.device_id]);
  if(retry)throw failure;
 }
}
