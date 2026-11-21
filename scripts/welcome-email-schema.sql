BEGIN;
CREATE TABLE IF NOT EXISTS welcome_email_settings (
 id boolean PRIMARY KEY DEFAULT true CHECK(id),
 enabled boolean NOT NULL DEFAULT false,
 eligible_since timestamptz NOT NULL DEFAULT now(),
 last_scheduled_for timestamptz,
 updated_at timestamptz NOT NULL DEFAULT now()
);
INSERT INTO welcome_email_settings(id) VALUES(true) ON CONFLICT DO NOTHING;
CREATE TABLE IF NOT EXISTS welcome_email_deliveries (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
 user_id text UNIQUE REFERENCES "user"(id) ON DELETE SET NULL,
 email_hash text NOT NULL UNIQUE,
 status text NOT NULL CHECK(status IN ('pending','sending','sent','uncertain','failed','excluded')),
 attempts integer NOT NULL DEFAULT 1,
 provider_id text,
 last_error text,
 created_at timestamptz NOT NULL DEFAULT now(),
 updated_at timestamptz NOT NULL DEFAULT now(),
 delivered_at timestamptz
);
CREATE TABLE IF NOT EXISTS welcome_email_opt_outs (
 email_hash text PRIMARY KEY,
 created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS welcome_email_pending ON welcome_email_deliveries(updated_at) WHERE status='pending';
COMMIT;
