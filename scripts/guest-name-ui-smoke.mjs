// Browser-only fixtures: every authentication request is intercepted; no real users are created.
import {chromium} from 'playwright';
import assert from 'node:assert/strict';
const base=process.env.TEST_URL||'http://localhost:3038';
function fixture(name,username){const now=new Date().toISOString();return{user:{id:'guest-ui-fixture',name,username,displayUsername:username?name:null,isAnonymous:true,email:'guest-ui@example.invalid',emailVerified:false,createdAt:now,updatedAt:now},session:{id:'fixture-session',token:'fixture-token',userId:'guest-ui-fixture',expiresAt:new Date(Date.now()+86400000).toISOString(),createdAt:now,updatedAt:now}};}
(async()=>{const b=await chromium.launch({headless:true});try{
for(const recovery of [false,true]){
const p=await b.newPage({viewport:{width:390,height:844}});let session=recovery?fixture('Anonymous',null):null,creates=0,updates=0,availability=0;
await p.route('**/api/community/config',r=>r.fulfill({json:{google:false,apple:false,recovery:false,quizletSearchEnabled:true}}));
await p.route('**/api/auth/**',async r=>{const path=new URL(r.request().url()).pathname;const data=r.request().method()==='POST'?r.request().postDataJSON():{};
if(path.endsWith('/get-session'))return r.fulfill({json:session});
if(path.endsWith('/is-username-available')){availability++;return r.fulfill({json:{available:false}});}
if(path.endsWith('/sign-in/anonymous')||path.endsWith('/update-user')){
if(path.endsWith('/sign-in/anonymous'))creates++;else updates++;
if(data.username==='godmode')return r.fulfill({status:400,json:{code:'USERNAME_IS_ALREADY_TAKEN',message:'This username is already taken. Choose another.'}});
if(data.username==='racing')return r.fulfill({status:500,json:{message:'Unable to create user'}});
assert.equal(data.username,'New guest');session=fixture('New guest','new guest');return r.fulfill({json:path.endsWith('/update-user')?{status:true,user:session.user}:{token:'fixture-token',user:session.user}});
}
throw Error('Unexpected auth request '+path);
});
await p.goto(base+'/import-game',{waitUntil:'domcontentloaded'});
if(!recovery){await p.getByRole('button',{name:'Log in',exact:true}).click();await p.getByRole('button',{name:'Guest',exact:true}).click();}
const field=p.getByLabel(recovery?'Name':'Username',{exact:true});await field.fill('godmode');await p.getByRole('button',{name:recovery?'Save name':'Play as guest',exact:true}).click();
const error=p.getByRole('alert').filter({hasText:'This username is already taken. Choose another.'});await error.waitFor();
const box=await error.boundingBox();assert.ok(box&&box.y>=0&&box.y+box.height<=844,'Taken-name error visible on phone');
if(!recovery){assert.equal(session,null);assert.equal(await p.getByRole('button',{name:'Anonymous',exact:true}).count(),0);await field.fill('racing');await p.getByRole('button',{name:'Play as guest',exact:true}).click();await error.waitFor();assert.equal(availability,1);}
await field.fill('New guest');await p.getByRole('button',{name:recovery?'Save name':'Play as guest',exact:true}).click();await p.getByRole('button',{name:'New guest',exact:true}).waitFor();await p.getByRole('dialog').waitFor({state:'hidden'});
if(!recovery)assert.equal(updates,0,'Fresh guest name is not saved in a second request');else assert.equal(creates,0,'Recovery must keep the existing guest identity');
console.log('PASS',recovery?'Existing unnamed guest recovery':'Fresh guest and concurrent-name conflict','visible phone error, retry succeeds, chosen name shown');await p.close();
}
}finally{await b.close()}})().catch(e=>{console.error(e.message);process.exitCode=1});
