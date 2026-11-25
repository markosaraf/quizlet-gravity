import assert from 'node:assert/strict';
import {test} from 'node:test';
import {readFileSync,mkdtempSync,rmSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {build} from 'esbuild';
import {PGlite} from '@electric-sql/pglite';
import {pg_trgm} from '@electric-sql/pglite/contrib/pg_trgm';
import type {Pool} from 'pg';
import {updateOwnedSet,deleteOwnedSet,quizletImportUpdate} from '../src/lib/community/owned-sets';

// Execute the real mutations, FK cascades and indexing triggers in isolated PostgreSQL.
test('owners can edit/delete their games; other users cannot; edits survive reimport',async()=>{
 const database=new PGlite({extensions:{pg_trgm}});
 const adapter={query:(text:string,values?:unknown[])=>database.query(text,values)} as Pick<Pool,'query'>;
 const scratch=mkdtempSync(join(tmpdir(),'qg-owned-routes-'));
 const cards=[{term:'one',definition:'1'},{term:'two',definition:'2',termImage:'https://o.quizlet.com/two.png'}];
 try{
  await database.exec('CREATE TABLE "user" (id text PRIMARY KEY); INSERT INTO "user" VALUES (\'owner\'),(\'other\'),(\'guest\');');
  for(const script of ['community-schema.sql','card-images-schema.sql','game-indexing-schema.sql'])await database.exec(readFileSync('scripts/'+script,'utf8'));
  const inserted=await database.query<{id:string;public_id:string;revision:string}>(`INSERT INTO shared_sets(quizlet_id,fingerprint,title,created_by,cards,term_count) VALUES('123','quizlet:123','Original','owner',$1,2) RETURNING id,public_id,updated_at::text AS revision`,[JSON.stringify(cards)]);
  const game=inserted.rows[0];
  // Exercise the real HTTP handlers with local auth and DB adapters, no external services.
  const state={user:null as null|{id:string;isAnonymous:boolean;emailVerified:boolean},db:adapter};
  (globalThis as any).__ownedRouteTest=state;
  const stubs:Record<string,string>={
   'next/server':`export const NextResponse={json:(data,init)=>Response.json(data,init)};export const after=()=>{};`,
   '@/lib/community/db':`export const db=globalThis.__ownedRouteTest.db;`,
   '@/lib/community/auth':`export const auth={api:{getSession:async()=>globalThis.__ownedRouteTest.user?{user:globalThis.__ownedRouteTest.user}:null}};`,
   '@/lib/community/game-indexing':`export const safelyProcessGameIndexing=async()=>{};`,
   '@/lib/community/apple':`export const appleConfigured=()=>false;`,
   '@/lib/community/settings':`export const communitySettings=async()=>({});`,
   '@/lib/community/sets':`export const fingerprint=()=>'';`,
   '@/lib/community/notification-events':`export const enqueueOvertakenNotifications=async()=>{};`,
   '@/lib/community/notification-queue':`export const publishLeaderboardNotifications=async()=>{};`,
   '@/lib/community/pending-email':`export const correctPendingEmail=async()=>{};`,
  };
  const bundle=join(scratch,'routes.cjs');
  await build({entryPoints:['src/app/api/community/[...path]/route.ts'],outfile:bundle,bundle:true,platform:'node',format:'cjs',plugins:[{name:'isolated-services',setup(builder){builder.onResolve({filter:/.*/},args=>stubs[args.path]?{path:args.path,namespace:'fixture'}:undefined);builder.onLoad({filter:/.*/,namespace:'fixture'},args=>({contents:stubs[args.path],loader:'js'}));}}]});
  const handlers=require(bundle);
  async function request(method:string,action:string,input?:unknown,origin='https://local.example'){
   const url='https://local.example/api/community/sets/'+game.id+'/'+action;
   const req=new Request(url,{method,headers:{origin,'content-type':'application/json'},...(input===undefined?{}:{body:JSON.stringify(input)})});
   Object.assign(req,{nextUrl:new URL(url)});
   return handlers[method](req,{params:Promise.resolve({path:['sets',game.id,action]})});
  }
  assert.equal((await request('GET','edit')).status,401);
  assert.equal((await request('POST','delete',{})).status,401);
  state.user={id:'other',isAnonymous:false,emailVerified:true};
  assert.equal((await request('GET','edit')).status,404);
  assert.equal((await request('POST','delete',{})).status,404);
  assert.equal((await request('POST','update',{title:'Hijacked',cards,revision:game.revision})).status,404);
  state.user={id:'owner',isAnonymous:false,emailVerified:true};
  assert.equal((await request('GET','edit')).status,200);
  assert.equal((await request('POST','delete',{},'https://another.example')).status,403);
  assert.equal((await request('POST','update',{title:'Invalid',cards:cards.slice(0,1),revision:game.revision})).status,400);
  assert.equal((await request('POST','update',{title:'Invalid',cards:[{term:'',definition:'answer'},cards[1]],revision:game.revision})).status,400);
  assert.equal((await request('POST','update',{title:'kill yourself',cards,revision:game.revision})).status,400);
  state.user.emailVerified=false;
  assert.equal((await request('POST','delete',{})).status,403);
  state.user.emailVerified=true;

  await database.query("INSERT INTO game_runs(user_id,set_id,mode) VALUES('other',$1,'MAD_MAX')",[game.id]);
  await database.query("INSERT INTO high_scores(set_id,user_id,score,level,mode) VALUES($1,'other',146710,10,'MAD_MAX')",[game.id]);
  const changed={title:'Edited title',cards:[...cards,{term:'three',definition:'3'}],revision:game.revision};
  for(const intruder of ['other','guest']){
   assert.equal((await updateOwnedSet(adapter,game.id,intruder,changed)).status,404);
   assert.equal(await deleteOwnedSet(adapter,game.id,intruder),false);
  }
  const saved=await updateOwnedSet(adapter,game.id,'owner',changed);
  assert.equal(saved.status,200);assert.equal(saved.set.public_id,game.public_id);assert.equal(saved.set.id,game.id);
  assert.equal((await database.query<{score:number}>('SELECT score FROM high_scores WHERE set_id=$1',[game.id])).rows[0].score,146710);
  assert.equal((await updateOwnedSet(adapter,game.id,'owner',{...changed,title:'Stale overwrite'})).status,409);
  await database.query(`INSERT INTO shared_sets(quizlet_id,fingerprint,title,created_by,cards,term_count) VALUES('123','quizlet:123','Old import','other',$1,2) ON CONFLICT(quizlet_id) DO UPDATE SET ${quizletImportUpdate}`,[JSON.stringify(cards)]);
  const actual=(await database.query<{title:string;cards:unknown;term_count:number;created_by:string}>('SELECT title,cards,term_count,created_by FROM shared_sets WHERE id=$1',[game.id])).rows[0];
  assert.deepEqual(actual,{title:changed.title,cards:changed.cards,term_count:3,created_by:'owner'});
  assert.equal(await deleteOwnedSet(adapter,game.id,'owner'),true);
  for(const table of ['shared_sets','high_scores','game_runs'])assert.equal((await database.query(`SELECT * FROM ${table} WHERE ${table==='shared_sets'?'id':'set_id'}=$1`,[game.id])).rows.length,0);
  assert.equal(await deleteOwnedSet(adapter,game.id,'owner'),false);
  const queue=await database.query<{action:string}>('SELECT action FROM game_indexing_queue WHERE public_id=$1 ORDER BY id',[game.public_id]);
  assert.deepEqual(queue.rows.map(row=>row.action),['upsert','delete','upsert','delete']);
  // Normal imports still refresh, and guest owners have the same permissions.
  const guest=(await database.query<{id:string;revision:string}>(`INSERT INTO shared_sets(quizlet_id,fingerprint,title,created_by,cards,term_count) VALUES('456','quizlet:456','Guest game','guest',$1,2) RETURNING id,updated_at::text AS revision`,[JSON.stringify(cards)])).rows[0];
  await database.query(`INSERT INTO shared_sets(quizlet_id,fingerprint,title,cards,term_count) VALUES('456','quizlet:456','Import',$1,3) ON CONFLICT(quizlet_id) DO UPDATE SET ${quizletImportUpdate}`,[JSON.stringify(changed.cards)]);
  assert.equal((await database.query<{term_count:number}>('SELECT term_count FROM shared_sets WHERE id=$1',[guest.id])).rows[0].term_count,3);
  const revision=(await database.query<{revision:string}>('SELECT updated_at::text AS revision FROM shared_sets WHERE id=$1',[guest.id])).rows[0].revision;
  assert.equal((await updateOwnedSet(adapter,guest.id,'guest',{...changed,revision})).status,200);
  assert.equal(await deleteOwnedSet(adapter,guest.id,'guest'),true);
 }finally{delete (globalThis as any).__ownedRouteTest;rmSync(scratch,{recursive:true,force:true});await database.close();}
});
