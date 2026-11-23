import {chromium,expect} from '@playwright/test';
import assert from 'node:assert/strict';
const base=process.env.TEST_URL||'http://localhost:3038';
const b=await chromium.launch();
try{for(const width of [390,1280]){
 const p=await b.newPage({viewport:{width,height:844}});const errors=[];p.on('pageerror',e=>errors.push(e.message));let requested=[];
 await p.route('**/api/auth/get-session*',r=>r.fulfill({json:{session:{id:'admin-session',userId:'admin-fixture',expiresAt:'2030-01-01T00:00:00Z'},user:{id:'admin-fixture',name:'Admin fixture',username:'admin fixture',isAnonymous:false,emailVerified:true}}}));
 await p.route('**/api/admin/**',r=>{
  const url=new URL(r.request().url());assert.equal(r.request().method(),'GET','This test must not mutate admin settings');
  if(url.pathname.endsWith('/users')){requested.push(url);const unused=url.searchParams.get('audience')==='unused-guests';return r.fulfill({json:{total:3,accounts:1,guests:2,users:[{id:unused?'unused':'scored',username:unused?'Guest without activity':'Guest with a score',guest:true,email:null,admin:false,created_at:'2026-11-23T10:00:00Z'}],hasMore:false}});}
  return r.fulfill({json:{admin:true,reports:[],ready:{email:true,android:true,apple:true},enabled:false,deliveries:{},stats:{},tutorialEnabled:true,gamePageTotalEnabled:true,quizletSearchEnabled:true}});
 });
 await p.route('**/api/community/config',r=>r.fulfill({json:{google:false,apple:false,recovery:false}}));
 await p.goto(base+'/admin/users',{waitUntil:'networkidle'});
 await p.getByLabel('User type').selectOption('unused-guests');
 await expect(p.getByText('Guest without activity',{exact:true})).toBeVisible();
 await p.getByLabel('Search users',{exact:true}).fill('Guest');
 await expect.poll(()=>requested.at(-1)?.searchParams.get('q')).toBe('Guest');
 assert.equal(requested.at(-1).searchParams.get('audience'),'unused-guests');assert.equal(requested.at(-1).searchParams.get('offset'),'0');
 await p.getByLabel('User type').selectOption('guests');await expect(p.getByText('Guest with a score',{exact:true})).toBeVisible();
 assert.deepEqual(errors,[]);console.log('PASS admin unused guest filter, search and reset at',width);await p.close();
}}finally{await b.close()}
