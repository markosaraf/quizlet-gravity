ALTER TABLE shared_sets ADD COLUMN IF NOT EXISTS import_version integer NOT NULL DEFAULT 1;
CREATE TABLE IF NOT EXISTS set_images (
 id uuid PRIMARY KEY,
 owner_id text REFERENCES "user"(id) ON DELETE SET NULL,
 data bytea NOT NULL CHECK(octet_length(data) <= 524288),
 created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS set_images_owner ON set_images(owner_id,created_at);
