-- Reporting and personal block lists for public study content.
CREATE TABLE IF NOT EXISTS content_reports (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
 reporter_id text REFERENCES "user"(id) ON DELETE SET NULL,
 target_kind text NOT NULL CHECK(target_kind IN ('set','user')),
 target_id text NOT NULL,
 reason text NOT NULL CHECK(reason IN ('harassment','hate','sexual','violence','spam','privacy','other')),
 status text NOT NULL DEFAULT 'open' CHECK(status IN ('open','resolved')),
 created_at timestamptz NOT NULL DEFAULT now(),
 resolved_at timestamptz,
 resolved_by text
);
CREATE UNIQUE INDEX IF NOT EXISTS content_reports_open_unique ON content_reports(reporter_id,target_kind,target_id) WHERE status='open';
CREATE INDEX IF NOT EXISTS content_reports_queue ON content_reports(status,created_at DESC);
CREATE TABLE IF NOT EXISTS user_blocks (
 blocker_id text NOT NULL REFERENCES "user"(id) ON DELETE CASCADE,
 blocked_id text NOT NULL REFERENCES "user"(id) ON DELETE CASCADE,
 created_at timestamptz NOT NULL DEFAULT now(),
 PRIMARY KEY(blocker_id,blocked_id),
 CHECK(blocker_id<>blocked_id)
);
