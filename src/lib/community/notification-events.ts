import type {PoolClient} from 'pg';

/** Call inside the score transaction, before updating high_scores. */
export async function enqueueOvertakenNotifications(client:Pick<PoolClient,'query'>,run:{id:string;set_id:string;user_id:string},score:number){
 // Serialize finishes for the same board so simultaneous submissions compare
 // with the preceding committed score, not two stale leaderboard snapshots.
 await client.query('SELECT id FROM shared_sets WHERE id=$1 FOR UPDATE',[run.set_id]);
 const {rows}=await client.query(`
 WITH previous AS (
  SELECT score,achieved_at FROM high_scores WHERE set_id=$1 AND user_id=$2
 ), overtaken AS (
  SELECT h.user_id FROM high_scores h JOIN "user" u ON u.id=h.user_id
  WHERE h.set_id=$1 AND h.user_id<>$2 AND h.score<$3
   AND NOT EXISTS(SELECT 1 FROM previous p WHERE p.score>h.score OR
    (p.score=h.score AND (p.achieved_at,$2::text)<=(h.achieved_at,h.user_id)))
   AND NOT EXISTS(SELECT 1 FROM user_blocks b WHERE
    (b.blocker_id=h.user_id AND b.blocked_id=$2) OR (b.blocker_id=$2 AND b.blocked_id=h.user_id))
   AND NOT EXISTS(SELECT 1 FROM deleted_users d WHERE d.user_id IN (h.user_id,$2))
 ), destinations AS (
  SELECT o.user_id,'email'::text AS channel,'email'::text AS destination,NULL::uuid AS device_id
  FROM overtaken o JOIN "user" u ON u.id=o.user_id
  LEFT JOIN notification_preferences p ON p.user_id=o.user_id
  WHERE coalesce(p.email_enabled,true) AND u."emailVerified" AND NOT coalesce(u."isAnonymous",false)
   AND EXISTS(SELECT 1 FROM community_settings WHERE key='overtaken_email' AND enabled)
  UNION ALL
  SELECT o.user_id,'push',d.id::text,d.id
  FROM overtaken o JOIN notification_devices d ON d.user_id=o.user_id
  JOIN session s ON s.id=d.session_id AND s."userId"=d.user_id AND s."expiresAt">now()
  LEFT JOIN notification_preferences p ON p.user_id=o.user_id
  WHERE coalesce(p.push_enabled,true)
   AND EXISTS(SELECT 1 FROM community_settings WHERE key='overtaken_push' AND enabled)
 )
 INSERT INTO leaderboard_notifications(run_id,set_id,actor_id,recipient_id,channel,destination,device_id)
 SELECT $4,$1,$2,user_id,channel,destination,device_id FROM destinations
 ON CONFLICT(run_id,recipient_id,channel,destination) DO NOTHING RETURNING id`,[run.set_id,run.user_id,score,run.id]);
 return rows.map(r=>r.id as string);
}
