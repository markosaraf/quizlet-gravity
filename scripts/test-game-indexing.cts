import assert from 'node:assert/strict';
import {randomUUID} from 'node:crypto';
import {db} from '../src/lib/community/db';
import {processGameIndexing} from '../src/lib/community/game-indexing';
import {adminOverview} from '../src/lib/community/admin-overview';
async function main(){
 assert.equal(process.env.VERCEL_ENV,'preview','Run only against the isolated preview database');
 const baseline=Number((await db.query('SELECT count(*) FROM game_indexing_queue')).rows[0].count);
 const client=await db.connect();
 try{
  await client.query('BEGIN');
  const key='indexing-test-'+randomUUID();
  const {rows:[game]}=await client.query(`INSERT INTO shared_sets(fingerprint,title,cards,term_count) VALUES($1,'Queue test','[{"term":"one","definition":"eins"},{"term":"two","definition":"zwei"}]',2) RETURNING *`,[key]);
  const count=async()=>Number((await client.query('SELECT count(*) FROM game_indexing_queue')).rows[0].count);
  assert.equal(await count(),baseline+1);
  await client.query(`INSERT INTO shared_sets(fingerprint,title,cards,term_count) VALUES($1,'Duplicate','[]',2) ON CONFLICT(fingerprint) DO UPDATE SET fingerprint=EXCLUDED.fingerprint`,[key]);
  assert.equal(await count(),baseline+1,'Duplicate saves must not enqueue phantom URLs');
  await client.query("UPDATE shared_sets SET title='Queue renamed' WHERE id=$1",[game.id]);
  assert.equal(await count(),baseline+3,'Rename submits old and new URLs');
  await client.query('DELETE FROM shared_sets WHERE id=$1',[game.id]);
  assert.equal(await count(),baseline+4,'Deletion remains discoverable to IndexNow');
 }finally{await client.query('ROLLBACK');client.release();}
 assert.deepEqual(await processGameIndexing(),{submitted:0,skipped:true});
 const originalFetch=global.fetch;
 // Mock only the search engine; exercise durable claims and retry on the isolated DB.
 process.env.VERCEL_ENV='production';
 try{
  let calls=0;
  global.fetch=async()=>{calls++;return new Response('',{status:429});};
  const failure=await processGameIndexing();assert.equal(failure.failed,baseline);
  assert.equal((await db.query('SELECT count(*)::int AS n FROM game_indexing_queue WHERE submitted_at IS NOT NULL')).rows[0].n,0);
  assert.equal((await processGameIndexing()).submitted,0,'Failed requests must back off');
  await db.query('UPDATE game_indexing_queue SET next_attempt_at=now()');
  global.fetch=async()=>{calls++;return new Response('',{status:200});};
  const results=await Promise.all([processGameIndexing(),processGameIndexing()]);
  assert.equal(results.reduce((sum,r)=>sum+r.submitted,0),baseline,'Concurrent workers must not double submit');
  assert.equal(calls,2);
 }finally{global.fetch=originalFetch;process.env.VERCEL_ENV='preview';
  await db.query('UPDATE game_indexing_queue SET attempts=0,next_attempt_at=now(),submitted_at=NULL,last_status=NULL,last_error=NULL,locked_until=NULL,claim_token=NULL');}
 for(const days of [1,7,30] as const){const report=await adminOverview(days);assert.equal(report.daily.length,days);assert.equal(report.activity.total_games,baseline);assert.equal(report.daily.reduce((sum,d)=>sum+d.played,0),report.activity.played);assert.equal(report.daily.reduce((sum,d)=>sum+d.created,0),report.activity.created);}
 console.log('PASS create, duplicate, rename, delete, preview isolation, rejection/backoff, concurrent claims, and dashboard periods.');
 await db.end();
}
main().catch(async e=>{console.error(e);await db.end();process.exitCode=1;});
