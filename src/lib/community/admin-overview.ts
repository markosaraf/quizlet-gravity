import {db} from './db';
export async function adminOverview(days:1|7|30){
 const {rows:[period]}=await db.query(`SELECT ((now() AT TIME ZONE 'Europe/Zurich')::date-($1::int-1))::text AS start,
  ((now() AT TIME ZONE 'Europe/Zurich')::date)::text AS today,now() AS generated_at`,[days]);
 const [accounts,activity,daily,indexing,recent,trends]=await Promise.all([
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
  db.query(`WITH bounds AS (
   SELECT $1::date AS start, $1::date-$2::int AS previous_start,
    $3::timestamptz AS until,
    (($3::timestamptz AT TIME ZONE 'Europe/Zurich')-make_interval(days=>$2::int)) AT TIME ZONE 'Europe/Zurich' AS previous_until
  ), events AS (
   SELECT u."createdAt" AS at, CASE WHEN coalesce(u."isAnonymous",false) THEN 'guests' ELSE 'registered' END AS metric
   FROM "user" u,bounds b WHERE u."createdAt">=(b.previous_start::timestamp AT TIME ZONE 'Europe/Zurich')
    AND NOT EXISTS(SELECT 1 FROM deleted_users d WHERE d.user_id=u.id)
   UNION ALL SELECT started_at,'played' FROM game_runs,bounds b WHERE started_at>=(b.previous_start::timestamp AT TIME ZONE 'Europe/Zurich')
   UNION ALL SELECT created_at,'created' FROM shared_sets,bounds b WHERE created_at>=(b.previous_start::timestamp AT TIME ZONE 'Europe/Zurich')
  ), periods AS (
   SELECT false AS previous,start,until FROM bounds UNION ALL SELECT true,previous_start,previous_until FROM bounds
  ), dates AS (
   SELECT p.previous,p.until,(p.start+n)::date AS day FROM periods p CROSS JOIN generate_series(0,$2::int-1) n
  ) SELECT d.previous,d.day::text,
   count(*) FILTER(WHERE e.metric='registered')::int AS registered,
   count(*) FILTER(WHERE e.metric='guests')::int AS guests,
   count(*) FILTER(WHERE e.metric='played')::int AS played,
   count(*) FILTER(WHERE e.metric='created')::int AS created
   FROM dates d LEFT JOIN events e ON e.at>=(d.day::timestamp AT TIME ZONE 'Europe/Zurich')
    AND e.at<((d.day+1)::timestamp AT TIME ZONE 'Europe/Zurich') AND e.at<d.until
   GROUP BY d.previous,d.day ORDER BY d.previous,d.day`,[period.start,days,period.generated_at]),
 ]);
 return {days,timeZone:'Europe/Zurich',...period,accounts:accounts.rows[0],activity:activity.rows[0],daily:daily.rows,trends:trends.rows as {previous:boolean;day:string;registered:number;guests:number;played:number;created:number}[],indexing:{...indexing.rows[0],cronConfigured:!!process.env.CRON_SECRET},recent:recent.rows};
}
