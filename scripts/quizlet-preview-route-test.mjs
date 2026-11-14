import assert from 'node:assert/strict';
import {build} from 'esbuild';
import {mkdtemp,rm} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
const dir=await mkdtemp(join(tmpdir(),'quizlet-preview-test-'));
const result={setId:'12345',url:'https://quizlet.com/12345/',title:'French',cards:[{term:'pain',definition:'bread'},{term:'pomme',definition:'apple'}]};
globalThis.__previewRouteTest={rows:[],saves:0,result};
const mocks={
 'next/server':`export const NextResponse={json:(data,init)=>Response.json(data,init)};`,
 'next/cache':`export const unstable_cache=fn=>fn;`,
 '@/lib/community/auth':`export const auth={api:{getSession:async()=>({user:{id:'test',isAnonymous:true}})}};`,
 '@/lib/community/db':`export const db={query:async()=>({rows:globalThis.__previewRouteTest.rows})};`,
 '@/lib/community/sets':`export async function saveQuizletSet(){globalThis.__previewRouteTest.saves++;return {id:'saved'};}`,
 '@/lib/community/set-links':`export const sharedSetPath=()=>'/sets/saved';`,
 '@/lib/gravity/quizlet':`export class QuizletImportError extends Error{}; export const fetchQuizletSet=async()=>globalThis.__previewRouteTest.result;`,
};
try{
 await build({entryPoints:['src/app/api/import-quizlet/route.ts'],outfile:join(dir,'route.mjs'),bundle:true,format:'esm',platform:'node',plugins:[{name:'test-dependencies',setup(b){b.onResolve({filter:/.*/},a=>mocks[a.path]?{path:a.path,namespace:'test'}:undefined);b.onLoad({filter:/.*/,namespace:'test'},a=>({contents:mocks[a.path],loader:'js'}));}}]});
 const {POST}=await import(join(dir,'route.mjs'));
 const send=async(preview)=>POST(new Request('https://quizletgravity.com/api/import-quizlet',{method:'POST',headers:{'Content-Type':'application/json',Origin:'https://quizletgravity.com'},body:JSON.stringify({url:result.url,...(preview?{preview:true}:{})})}));
 let response=await send(true);assert.equal(response.status,200);assert.deepEqual((await response.json()).cards,result.cards);assert.equal(globalThis.__previewRouteTest.saves,0);
 response=await send(false);assert.equal(response.status,200);assert.equal((await response.json()).sharedId,'saved');assert.equal(globalThis.__previewRouteTest.saves,1);
 globalThis.__previewRouteTest.rows=[{id:'existing',import_version:2,title:result.title,cards:result.cards,quizlet_id:'12345',source_url:result.url}];
 response=await send(true);assert.equal(response.status,200);assert.deepEqual((await response.json()).cards,result.cards);assert.equal(globalThis.__previewRouteTest.saves,1);
 console.log('PASS preview never saves either new or existing sets; explicit import saves a new set');
}finally{await rm(dir,{recursive:true,force:true});delete globalThis.__previewRouteTest;}
