import assert from 'node:assert/strict';
import {build} from 'esbuild';
import {mkdtemp,rm} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
const dir=await mkdtemp(join(tmpdir(),'quizlet-search-toggle-'));
globalThis.__searchToggle={enabled:false,calls:0,signedIn:true};
const mocks={
 'next/server':`export const NextResponse={json:(data,init)=>Response.json(data,init)};`,
 'next/cache':`export const unstable_cache=fn=>fn;`,
 '@/lib/community/auth':`export const auth={api:{getSession:async()=>globalThis.__searchToggle.signedIn?({user:{id:'test',isAnonymous:true}}):null}};`,
 '@/lib/community/settings':`export async function communitySettings(){return {quizletSearchEnabled:globalThis.__searchToggle.enabled};}`,
 '@/lib/gravity/quizlet-map':`export class QuizletMapError extends Error{};export async function discoverQuizletSets(){globalThis.__searchToggle.calls++;return {sets:[]};}`,
 '@/lib/gravity/quizlet-creator':`export const creatorUsername=x=>x;export async function discoverQuizletCreator(){globalThis.__searchToggle.calls++;return {sets:[]};}`,
};
try{
 await build({entryPoints:['src/app/api/search-quizlet/route.ts'],outfile:join(dir,'route.mjs'),bundle:true,format:'esm',platform:'node',plugins:[{name:'test-dependencies',setup(b){b.onResolve({filter:/.*/},a=>mocks[a.path]?{path:a.path,namespace:'test'}:undefined);b.onLoad({filter:/.*/,namespace:'test'},a=>({contents:mocks[a.path],loader:'js'}));}}]});
 const {POST}=await import(join(dir,'route.mjs'));
 const send=()=>{const request=new Request('https://quizletgravity.com/api/search-quizlet',{method:'POST',headers:{'Content-Type':'application/json',Origin:'https://quizletgravity.com'},body:JSON.stringify({mode:'title',query:'French'})});request.nextUrl=new URL(request.url);return POST(request);};
 let response=await send();assert.equal(response.status,403);assert.equal(globalThis.__searchToggle.calls,0);
 globalThis.__searchToggle.enabled=true;response=await send();assert.equal(response.status,200);assert.equal(globalThis.__searchToggle.calls,1);
 globalThis.__searchToggle.enabled=false;response=await send();assert.equal(response.status,403);assert.equal(globalThis.__searchToggle.calls,1);
 globalThis.__searchToggle.enabled=true;globalThis.__searchToggle.signedIn=false;response=await send();assert.equal(response.status,401);assert.equal(globalThis.__searchToggle.calls,1);
 console.log('PASS search toggle blocks provider calls when off, enables search when on, and still requires a player session');
}finally{await rm(dir,{recursive:true,force:true});delete globalThis.__searchToggle;}
