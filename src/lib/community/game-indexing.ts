import { randomUUID } from 'node:crypto';
import { db } from './db';
import { gameUrl } from '../game-seo';
import { submitToIndexNow } from '../indexnow';
export async function processGameIndexing() {
 if (process.env.VERCEL_ENV !== 'production') return {submitted: 0, skipped: true};
 const token = randomUUID();
 const {rows} = await db.query(`UPDATE game_indexing_queue SET claim_token=$1,
  locked_until=now()+interval '5 minutes',attempts=attempts+1
  WHERE id IN (SELECT id FROM game_indexing_queue WHERE submitted_at IS NULL
   AND next_attempt_at<=now() AND (locked_until IS NULL OR locked_until<now())
   ORDER BY id LIMIT 1000 FOR UPDATE SKIP LOCKED)
  RETURNING id,game,attempts`, [token]);
 if (!rows.length) return {submitted: 0};
 try {
  const result = await submitToIndexNow(rows.map(row => gameUrl(row.game)));
  await db.query(`UPDATE game_indexing_queue SET submitted_at=now(),last_status=$2,
   last_error=NULL,locked_until=NULL,claim_token=NULL WHERE claim_token=$1`, [token,result.status]);
  return result;
 } catch (error) {
  const message = error instanceof Error && /^IndexNow HTTP \d+$/.test(error.message) ? error.message : 'IndexNow request failed or timed out';
  await db.query(`UPDATE game_indexing_queue SET last_error=$2,locked_until=NULL,claim_token=NULL,
   next_attempt_at=now()+least(1440,power(2,least(attempts,10))*5)*interval '1 minute'
   WHERE claim_token=$1`, [token,message]);
  console.error(message);
  return {submitted: 0, failed: rows.length, error: message};
 }
}
export async function safelyProcessGameIndexing() {
 try { return await processGameIndexing(); }
 catch { console.error('Game indexing queue unavailable; pending records will be retried.'); }
}
