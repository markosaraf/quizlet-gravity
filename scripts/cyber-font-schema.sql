CREATE TABLE IF NOT EXISTS cyber_font_preferences (
 user_id text PRIMARY KEY REFERENCES "user"(id) ON DELETE CASCADE,
 mode text NOT NULL CHECK (mode IN ('off','interface','all'))
);
