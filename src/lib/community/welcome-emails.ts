import {send} from '@vercel/queue';
import {db} from './db';
import {deliverWelcomeEmail} from './welcome-delivery';
import {NotificationDeliveryError} from './notification-delivery';
import {notificationReadiness} from './notification-settings';
import {nextWelcomeRun} from './welcome-schedule';
import {welcomeEmailHash} from './welcome-unsubscribe';

const hashSql=`encode(sha256(convert_to(lower(btrim(u.email)),'UTF8')),'hex')`;
export const welcomeEligibleSql=`FROM "user" u CROSS JOIN welcome_email_settings s
 WHERE s.id AND NOT coalesce(u."isAnonymous",false) AND u."emailVerified"
 AND u."createdAt">=s.eligible_since AND u.email ~ '^[^[:space:]<>@]+@[^[:space:]<>@]+[.][^[:space:]<>@]+$'
 AND u.email NOT LIKE '%@deleted.invalid'
 AND NOT EXISTS(SELECT 1 FROM deleted_users d WHERE d.user_id=u.id)
 AND NOT EXISTS(SELECT 1 FROM welcome_email_opt_outs o WHERE o.email_hash=${hashSql})
 AND NOT EXISTS(SELECT 1 FROM welcome_email_deliveries d WHERE (d.user_id=u.id OR d.email_hash=${hashSql})
  AND (d.status<>'pending' OR d.email_hash<>${hashSql}))`;

export async function welcomeEmailSettings(){
 const [{rows:[settings]},{rows:[counts]},{rows:[pending]}]=await Promise.all([
  db.query('SELECT enabled,eligible_since,last_scheduled_for FROM welcome_email_settings WHERE id'),
  db.query(`SELECT count(*) FILTER(WHERE status='sent')::int AS sent,
   count(*) FILTER(WHERE status IN ('uncertain','sending'))::int AS uncertain,
   count(*) FILTER(WHERE status='failed')::int AS failed FROM welcome_email_deliveries`),
  db.query('SELECT count(*)::int AS eligible '+welcomeEligibleSql),
 ]);
 if(!settings)throw Error('Welcome email migration is missing');
 return {...settings,...counts,...pending,ready:notificationReadiness().email&&!!process.env.CRON_SECRET,nextRun:nextWelcomeRun().toISOString()};
}

export async function scheduleWelcomeEmails(now=new Date()){
 if(process.env.VERCEL_ENV!=='production')return null;
 const {rows:[settings]}=await db.query('SELECT enabled FROM welcome_email_settings WHERE id');
 if(!settings?.enabled)return null;
 const scheduledFor=nextWelcomeRun(now).toISOString();
 const delaySeconds=Math.max(0,Math.ceil((Date.parse(scheduledFor)-now.getTime())/1000));
 // The Tuesday cron will schedule it closer to delivery. Leave ample retention
 // for retries, including the extra hour when daylight saving ends.
 if(delaySeconds>6*86400)return null;
 await send('welcome-emails',{kind:'dispatch',scheduledFor,cursor:''},{idempotencyKey:'welcome-schedule-'+scheduledFor,delaySeconds,retentionSeconds:604800,region:'iad1'});
 await db.query('UPDATE welcome_email_settings SET last_scheduled_for=$1 WHERE id',[scheduledFor]);
 return scheduledFor;
}

export type WelcomeJob={kind:'dispatch';scheduledFor:string;cursor:string}|{kind:'deliver';scheduledFor:string;userId:string;emailHash:string};
export async function dispatchWelcomeEmails(job:Extract<WelcomeJob,{kind:'dispatch'}>){
 const {rows:[settings]}=await db.query('SELECT enabled FROM welcome_email_settings WHERE id');
 if(!settings?.enabled)return;
 const {rows}=await db.query(`SELECT u.id,${hashSql} AS email_hash ${welcomeEligibleSql} AND u."createdAt"<$1 AND u.id>$2 ORDER BY u.id LIMIT 101`,[job.scheduledFor,job.cursor]);
 const batch=rows.slice(0,100);
 for(let i=0;i<batch.length;i+=10)await Promise.all(batch.slice(i,i+10).map(u=>send('welcome-emails',{kind:'deliver',scheduledFor:job.scheduledFor,userId:u.id,emailHash:u.email_hash},{idempotencyKey:'welcome-'+job.scheduledFor+'-'+u.id,retentionSeconds:86400,region:'iad1'})));
 if(rows.length>100)await send('welcome-emails',{...job,cursor:batch[batch.length-1].id},{idempotencyKey:'welcome-dispatch-'+job.scheduledFor+'-'+batch[batch.length-1].id,retentionSeconds:86400,region:'iad1'});
}

export async function processWelcomeEmail(userId:string,emailHash:string,deliver=deliverWelcomeEmail){
 const client=await db.connect();let claim:{id:string;email:string}|undefined;
 try{
  await client.query('BEGIN');
  const {rows:[settings]}=await client.query('SELECT enabled FROM welcome_email_settings WHERE id FOR SHARE');
  if(!settings?.enabled){await client.query('ROLLBACK');return 'disabled';}
  const {rows:[user]}=await client.query(`SELECT u.id,u.email ${welcomeEligibleSql} AND u.id=$1 FOR SHARE OF u`,[userId]);
  if(!user||welcomeEmailHash(user.email)!==emailHash){await client.query('ROLLBACK');return 'ineligible';}
  const {rows:[record]}=await client.query(`INSERT INTO welcome_email_deliveries(user_id,email_hash,status) VALUES($1,$2,'sending')
   ON CONFLICT(email_hash) DO UPDATE SET status='sending',attempts=welcome_email_deliveries.attempts+1,updated_at=now()
   WHERE welcome_email_deliveries.status='pending' RETURNING id`,[user.id,emailHash]);
  await client.query('COMMIT');if(!record)return 'already-claimed';claim={id:record.id,email:user.email};
 }catch(e){await client.query('ROLLBACK');throw e;}finally{client.release();}
 try{
  const providerId=await deliver(claim.email,claim.id);
  await db.query("UPDATE welcome_email_deliveries SET status='sent',provider_id=$2,delivered_at=now(),updated_at=now() WHERE id=$1",[claim.id,providerId]);
  return 'sent';
 }catch(error){
  const known=error instanceof NotificationDeliveryError;
  const retry=known&&error.retryable&&!error.uncertain;
  const status=retry?'pending':!known||error.uncertain?'uncertain':'failed';
  await db.query('UPDATE welcome_email_deliveries SET status=$2,last_error=$3,updated_at=now() WHERE id=$1',[claim.id,status,known?error.code:'delivery_result_unknown']);
  if(retry)throw error;return status;
 }
}
