import {db} from './db';
export async function adminOverview(days:1|7|30){
 const {rows:[period]}=await db.query(`SELECT ((now() AT TIME ZONE 'Europe/Zurich')::date-($1::int-1))::text AS start,
  ((now() AT TIME ZONE 'Europe/Zurich')::date)::text AS today,now() AS generated_at`,[days]);
 const [accounts,activity,daily,indexing,recent]=await Promise.all([
  db.query(`SELECT count(*) FILTER(WHERE NOT coalesce(u."isAnonymous",false))::int AS registered,
   count(*) FILTER(WHERE coalesce(u."isAnonymous",false))::int AS guests
   FROM "user" u WHERE NOT EXISTS(SELECT 1 FROM deleted_users d WHERE d.user_id=u.id)`),
  db.query(`SELECT (SELECT count(*)::int FROM game_runs WHERE started_at>=($1::date::timestamp AT TIME ZONE 'Europe/Zurich')) AS played,
   (SELECT count(*)::int FROM game_runs WHERE finished_at>=($1::date::timestamp AT TIME ZONE 'Europe/Zurich')) AS completed,
   (SELECT count(DISTINCT user_id)::int FROM game_runs WHERE started_at>=($1::date::timestamp AT TIME ZONE 'Europe/Zurich')) AS players,
   (SELECT count(*)::int FROM shared_sets WHERE created_at>=($1::date::timestamp AT TIME ZONE 'Europe/Zurich')) AS created,
   (SELECT count(*)::int FROM shared_sets) AS total_games`,[period.start]),
  db.query(`WITH dates AS (SELECT generate_series($1::date,$2::date,interval '1 day')::date AS day),
   plays AS (SELECT (started_at AT TIME ZONE 'Europe/Zurich')::date AS day,count(*)::int AS count FROM game_runs WHERE started_at>=($1::date::timestamp AT TIME ZONE 'Europe/Zurich') GROUP BY 1),
   games AS (SELECT (created_at AT TIME ZONE 'Europe/Zurich')::date AS day,count(*)::int AS count FROM shared_sets WHERE created_at>=($1::date::timestamp AT TIME ZONE 'Europe/Zurich') GROUP BY 1)
   SELECT d.day::text,coalesce(p.count,0)::int AS played,coalesce(g.count,0)::int AS created FROM dates d LEFT JOIN plays p USING(day) LEFT JOIN games g USING(day) ORDER BY d.day`,[period.start,period.today]),
  db.query(`SELECT count(*) FILTER(WHERE submitted_at IS NULL)::int AS pending,
   count(*) FILTER(WHERE submitted_at IS NULL AND attempts>0)::int AS retrying,
   count(*) FILTER(WHERE submitted_at IS NOT NULL)::int AS accepted_requests,
   count(DISTINCT public_id) FILTER(WHERE submitted_at IS NOT NULL AND action='upsert')::int AS submitted_games,
   count(*) FILTER(WHERE last_status=202)::int AS key_verification_pending,
   max(submitted_at) AS last_submitted FROM game_indexing_queue`),
  db.query(`SELECT public_id,title,source_url,term_count,created_at FROM shared_sets ORDER BY created_at DESC,id LIMIT 8`),
 ]);
 return {days,timeZone:'Europe/Zurich',...period,accounts:accounts.rows[0],activity:activity.rows[0],daily:daily.rows,indexing:{...indexing.rows[0],cronConfigured:!!process.env.CRON_SECRET},recent:recent.rows};
}
