BEGIN;

CREATE TABLE IF NOT EXISTS notification_preferences (
 user_id text PRIMARY KEY REFERENCES "user"(id) ON DELETE CASCADE,
 email_enabled boolean NOT NULL DEFAULT true,
 push_enabled boolean NOT NULL DEFAULT true,
 updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS notification_devices (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
 user_id text NOT NULL REFERENCES "user"(id) ON DELETE CASCADE,
 session_id text NOT NULL REFERENCES session(id) ON DELETE CASCADE,
 platform text NOT NULL CHECK(platform IN ('android','ios','macos')),
 environment text NOT NULL DEFAULT 'production' CHECK(environment IN ('production','sandbox')),
 token text NOT NULL CHECK(length(token) BETWEEN 20 AND 4096),
 last_seen_at timestamptz NOT NULL DEFAULT now(),
 UNIQUE(platform,environment,token)
);
CREATE INDEX IF NOT EXISTS notification_device_owner ON notification_devices(user_id);

CREATE TABLE IF NOT EXISTS leaderboard_notifications (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
 run_id uuid NOT NULL REFERENCES game_runs(id) ON DELETE CASCADE,
 set_id uuid NOT NULL REFERENCES shared_sets(id) ON DELETE CASCADE,
 actor_id text NOT NULL REFERENCES "user"(id) ON DELETE CASCADE,
 recipient_id text NOT NULL REFERENCES "user"(id) ON DELETE CASCADE,
 channel text NOT NULL CHECK(channel IN ('email','push')),
 destination text NOT NULL,
 device_id uuid REFERENCES notification_devices(id) ON DELETE CASCADE,
 status text NOT NULL DEFAULT 'pending' CHECK(status IN ('pending','delivering','sent','cancelled','failed','uncertain')),
 attempts integer NOT NULL DEFAULT 0,
 created_at timestamptz NOT NULL DEFAULT now(),
 updated_at timestamptz NOT NULL DEFAULT now(),
 published_at timestamptz,
 delivered_at timestamptz,
 last_error text,
 provider_id text,
 CHECK(actor_id<>recipient_id),
 CHECK((channel='email' AND device_id IS NULL AND destination='email') OR (channel='push' AND device_id IS NOT NULL AND destination=device_id::text)),
 UNIQUE(run_id,recipient_id,channel,destination)
);
CREATE INDEX IF NOT EXISTS notification_pending ON leaderboard_notifications(created_at) WHERE status='pending';

-- Preparing the feature must never enable delivery or enqueue historical scores.
INSERT INTO community_settings(key,enabled) VALUES ('overtaken_email',false),('overtaken_push',false)
ON CONFLICT(key) DO NOTHING;

COMMIT;
