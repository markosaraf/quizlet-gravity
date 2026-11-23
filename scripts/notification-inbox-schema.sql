BEGIN;
CREATE TABLE IF NOT EXISTS notification_inbox (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
 run_id uuid REFERENCES game_runs(id) ON DELETE CASCADE,
 set_id uuid NOT NULL REFERENCES shared_sets(id) ON DELETE CASCADE,
 actor_id text NOT NULL REFERENCES "user"(id) ON DELETE CASCADE,
 recipient_id text NOT NULL REFERENCES "user"(id) ON DELETE CASCADE,
 actor_name text NOT NULL,
 created_at timestamptz NOT NULL DEFAULT now(),
 read_at timestamptz,
 CHECK(actor_id<>recipient_id),
 UNIQUE(run_id,recipient_id)
);
CREATE INDEX IF NOT EXISTS notification_inbox_recipient ON notification_inbox(recipient_id,created_at DESC,id DESC);
CREATE INDEX IF NOT EXISTS notification_inbox_unread ON notification_inbox(recipient_id) WHERE read_at IS NULL;
-- Recover actual sent notifications once, deduplicating email and device deliveries.
INSERT INTO notification_inbox(run_id,set_id,actor_id,recipient_id,actor_name,created_at)
SELECT n.run_id,n.set_id,n.actor_id,n.recipient_id,coalesce(u."displayUsername",u.username,u.name),min(n.created_at)
FROM leaderboard_notifications n JOIN "user" u ON u.id=n.actor_id
WHERE n.status='sent'
GROUP BY n.run_id,n.set_id,n.actor_id,n.recipient_id,u.id
ON CONFLICT(run_id,recipient_id) DO NOTHING;
COMMIT;
