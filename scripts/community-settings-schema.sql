CREATE TABLE IF NOT EXISTS community_settings (
 key text PRIMARY KEY,
 enabled boolean NOT NULL,
 updated_at timestamptz NOT NULL DEFAULT now()
);
INSERT INTO community_settings(key,enabled) VALUES('tutorial',true) ON CONFLICT(key) DO NOTHING;
