import {send} from '@vercel/queue';
import {db} from './db';

export async function publishLeaderboardNotifications(){
 if(process.env.VERCEL_ENV!=='production')return 0;
 const {rows}=await db.query(`SELECT id FROM leaderboard_notifications WHERE status='pending'
  AND created_at>now()-interval '24 hours' AND (published_at IS NULL OR published_at<now()-interval '10 minutes')
  ORDER BY created_at LIMIT 100`);
 let published=0;
 for(const row of rows){
  try{
   await send('leaderboard-notifications',{notificationId:row.id},{idempotencyKey:row.id,retentionSeconds:86400,region:'iad1'});
   await db.query('UPDATE leaderboard_notifications SET published_at=now() WHERE id=$1',[row.id]);published++;
  }catch{
   // The committed outbox remains available for the next finish or retry job.
   console.error('Leaderboard notification queue unavailable');break;
  }
 }
 return published;
}
