BEGIN;
ALTER TABLE shared_sets ADD COLUMN IF NOT EXISTS updated_at timestamptz;
UPDATE shared_sets SET updated_at=created_at WHERE updated_at IS NULL;
ALTER TABLE shared_sets ALTER COLUMN updated_at SET DEFAULT now();
ALTER TABLE shared_sets ALTER COLUMN updated_at SET NOT NULL;
CREATE TABLE IF NOT EXISTS game_indexing_queue (
 id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
 public_id text NOT NULL,
 game jsonb NOT NULL,
 action text NOT NULL CHECK(action IN ('upsert','delete')),
 created_at timestamptz NOT NULL DEFAULT now(),
 attempts integer NOT NULL DEFAULT 0,
 next_attempt_at timestamptz NOT NULL DEFAULT now(),
 locked_until timestamptz,
 claim_token uuid,
 submitted_at timestamptz,
 last_status integer,
 last_error text
);
CREATE INDEX IF NOT EXISTS game_indexing_pending ON game_indexing_queue(next_attempt_at,id) WHERE submitted_at IS NULL;
CREATE INDEX IF NOT EXISTS game_indexing_public_id ON game_indexing_queue(public_id);
CREATE INDEX IF NOT EXISTS game_runs_started ON game_runs(started_at);
CREATE OR REPLACE FUNCTION touch_public_game() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
 IF ROW(NEW.title,NEW.cards,NEW.source_url,NEW.creator_name,NEW.creator_url,NEW.public_id)
 IS DISTINCT FROM ROW(OLD.title,OLD.cards,OLD.source_url,OLD.creator_name,OLD.creator_url,OLD.public_id) THEN
  NEW.updated_at=clock_timestamp();
 ELSE NEW.updated_at=OLD.updated_at;
 END IF;
 RETURN NEW;
END $$;
DROP TRIGGER IF EXISTS public_game_modified ON shared_sets;
CREATE TRIGGER public_game_modified BEFORE UPDATE ON shared_sets FOR EACH ROW EXECUTE FUNCTION touch_public_game();
CREATE OR REPLACE FUNCTION track_public_game_change() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
 IF TG_OP='UPDATE' THEN
  IF ROW(NEW.title,NEW.cards,NEW.source_url,NEW.creator_name,NEW.creator_url,NEW.public_id)
     IS NOT DISTINCT FROM ROW(OLD.title,OLD.cards,OLD.source_url,OLD.creator_name,OLD.creator_url,OLD.public_id) THEN
   RETURN NULL;
  END IF;
 END IF;
 IF TG_OP='DELETE' OR (TG_OP='UPDATE' AND ROW(NEW.title,NEW.source_url,NEW.public_id) IS DISTINCT FROM ROW(OLD.title,OLD.source_url,OLD.public_id)) THEN
  INSERT INTO game_indexing_queue(public_id,game,action) VALUES(OLD.public_id,jsonb_build_object('public_id',OLD.public_id,'title',OLD.title,'source_url',OLD.source_url),'delete');
 END IF;
 IF TG_OP<>'DELETE' THEN
  INSERT INTO game_indexing_queue(public_id,game,action) VALUES(NEW.public_id,jsonb_build_object('public_id',NEW.public_id,'title',NEW.title,'source_url',NEW.source_url),'upsert');
  RETURN NEW;
 END IF;
 RETURN OLD;
END $$;
DROP TRIGGER IF EXISTS public_game_indexing ON shared_sets;
CREATE TRIGGER public_game_indexing AFTER INSERT OR UPDATE OR DELETE ON shared_sets FOR EACH ROW EXECUTE FUNCTION track_public_game_change();
-- Idempotent backfill. Only public game URL fields enter the queue.
INSERT INTO game_indexing_queue(public_id,game,action)
 SELECT s.public_id,jsonb_build_object('public_id',s.public_id,'title',s.title,'source_url',s.source_url),'upsert'
 FROM shared_sets s WHERE NOT EXISTS(SELECT 1 FROM game_indexing_queue q WHERE q.public_id=s.public_id);
COMMIT;
