/** Keep existing clients' 50-row pages; the game UI requests five. */
export function leaderboardPageSize(value: string | null): number {
  const parsed = Number(value);
  return value && Number.isFinite(parsed) ? Math.max(1, Math.min(50, Math.floor(parsed))) : 50;
}

/** Rank, count and page against one snapshot, with the same block filter throughout. */
function makeLeaderboardQuery(includeDate:boolean){return `
WITH ranked AS (
 SELECT ${includeDate?`h.achieved_at,CASE WHEN NOT coalesce(u."isAnonymous",false) AND NOT EXISTS(SELECT 1 FROM deleted_users d WHERE d.user_id=u.id) THEN u.email END AS email,`:''}h.score,h.level,h.mode,u.id AS player_id,
 coalesce(u."displayUsername",u.username,u.name) AS username,u."isAnonymous" AS guest,
 coalesce(u.id=$3,false) AS is_current,
 row_number() OVER (ORDER BY h.score DESC,h.achieved_at,u.id)::int AS rank
 FROM high_scores h JOIN "user" u ON u.id=h.user_id
 WHERE h.set_id=$1 AND NOT EXISTS (
  SELECT 1 FROM user_blocks b WHERE b.blocker_id=$3 AND b.blocked_id=h.user_id
 )
), stats AS (
 SELECT count(*)::int AS total,max(rank) FILTER (WHERE is_current) AS current_rank FROM ranked
), paging AS (
 SELECT *, LEAST(
  CASE WHEN $5::boolean AND current_rank IS NOT NULL
   THEN ((current_rank-1)/$4::int)*$4::int ELSE $2::int END,
  (GREATEST(total-1,0)/$4::int)*$4::int
 ) AS page_offset FROM stats
)
SELECT total,current_rank,page_offset AS "offset",$4::int AS page_size,
 page_offset+$4::int<total AS "hasMore",
 coalesce((SELECT jsonb_agg(r ORDER BY r.rank) FROM ranked r
  WHERE r.rank>paging.page_offset AND r.rank<=paging.page_offset+$4::int),'[]'::jsonb) AS entries
FROM paging`;
}

export const leaderboardQuery=makeLeaderboardQuery(false);
export const adminLeaderboardQuery=makeLeaderboardQuery(true);
