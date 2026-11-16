/** One row per game, including games without scores. Dates refer to creation here. */
export const adminGamesQuery = `
WITH games AS (
 SELECT count(*) OVER() AS catalogue_total,s.id,s.public_id,s.title,s.source_url,s.created_at,s.term_count,
 s.creator_name,coalesce(u."displayUsername",u.username,u.name,'Deleted user') AS added_by
 FROM shared_sets s LEFT JOIN "user" u ON u.id=s.created_by
 WHERE $1='' OR s.title ILIKE $2 ESCAPE '\\'
  OR coalesce(s.creator_name,'') ILIKE $2 ESCAPE '\\'
  OR coalesce(u."displayUsername",u.username,u.name,'') ILIKE $2 ESCAPE '\\'
 ORDER BY s.created_at DESC,s.id
 LIMIT 25 OFFSET $3
)
SELECT g.*,scores.player_count,scores.top_score
FROM games g LEFT JOIN LATERAL (
 SELECT count(*)::int AS player_count,max(h.score) AS top_score
 FROM high_scores h WHERE h.set_id=g.id
) scores ON true
ORDER BY g.created_at DESC,g.id`;
