import assert from 'node:assert/strict';
import test from 'node:test';
import {sealConnection,readConnection,connected,startQuizletConnection,verifyQuizletConnection,discoverConnectedClass,safeLiveUrl,readQuizletPage,endQuizletConnection} from '../src/lib/gravity/quizlet-admin-browser';
const c={profile:'qg-admin-12345678-1234-1234-1234-123456789012',id:'remote-id',until:Date.now()+900000,liveUrl:'https://browser.firecrawl.dev/view'};
const deps=(result:unknown)=>({apiKey:'test',fetchImpl:async()=>Response.json({success:true,exitCode:0,stdout:'QG_RESULT:'+JSON.stringify(result)})});
test('encrypted connection is scoped to the admin and expires independently from browser',async()=>{
 const token=await sealConnection({...c,username:'Quizlet user'},'admin-a','test secret');
 assert.equal((await readConnection(token,'admin-a','test secret'))?.id,c.id);
 assert.equal(await readConnection(token,'admin-b','test secret'),null);
 assert.equal(await readConnection(token+'x','admin-a','test secret'),null);
 assert.equal(connected({...c,username:'user'}),true);
 assert.equal(connected(c),false);
 assert.equal(connected({...c,username:'user',until:1}),false);
 assert.ok(!token.includes(c.profile));
});
test('security checks and unverified sign-in cannot unlock class search',async()=>{
 await assert.rejects(verifyQuizletConnection(c,deps({blocked:true,authenticated:false})),/security check/);
 await assert.rejects(verifyQuizletConnection(c,deps({blocked:false,authenticated:false})),/Sign in to Quizlet/);
 assert.equal((await verifyQuizletConnection(c,deps({authenticated:true,username:'marko'}))).username,'marko');
 await assert.rejects(discoverConnectedClass('123',c,deps({})),/Sign in to Quizlet/);
});
test('class reads use connected browser and only expose explicit public class members',async()=>{
 const classItems={currentClassId:123,feed:[{setId:5},{setId:6}],models:{set:{a:{id:5,title:'Public',accessType:2},b:{id:6,title:'Private',accessType:1}}}};
 const classPage={props:{pageProps:{data:{class:{id:123,title:'French'}},dehydratedReduxStateKey:JSON.stringify({classItems})}}};
 const d=deps({authenticated:true,username:'marko',classPage});
 const r=await discoverConnectedClass('123',{...c,username:'marko'},{...d,fetchImpl:async(u,i)=>{assert.match(String(u),/remote-id\/execute$/);assert.match(String(i?.body),/class\/123/);return d.fetchImpl();}});
 assert.deepEqual(r.sets.map(s=>s.setId),['5']);
 await assert.rejects(discoverConnectedClass('https://evil.test',{...c,username:'marko'},d));
 await assert.rejects(discoverConnectedClass('123',{...c,username:'marko'},deps({authenticated:false})),/could not be verified/);
});
test('live views are provider HTTPS URLs only',()=>{
 assert.equal(safeLiveUrl(c.liveUrl),c.liveUrl);
 for(const url of ['javascript:alert(1)','https://firecrawl.dev.evil.test','https://user@firecrawl.dev','http://firecrawl.dev'])assert.throws(()=>safeLiveUrl(url));
});
test('current-account evidence is required, not a creator or login text on the page',()=>{
 const g=globalThis as any;
 const oldLocation=g.location,oldDocument=g.document;
 let core:any=null;
 g.location={origin:'https://quizlet.com'};
 g.document={body:{innerText:'Hello'},querySelector:()=>({textContent:JSON.stringify({props:{pageProps:{dehydratedReduxStateKey:JSON.stringify({core:{user:core},models:{user:{id:123,username:'creator'}}})}}})})};
 try{assert.equal(readQuizletPage().authenticated,false);core={id:123,username:'signed-in'};assert.equal(readQuizletPage().authenticated,true);g.document.body.innerText='Before you continue: security check';assert.equal(readQuizletPage().authenticated,false);g.document.body.innerText='Hello';g.location.origin='https://evil.test';assert.equal(readQuizletPage().authenticated,false);}finally{g.location=oldLocation;g.document=oldDocument;}
});
test('reopening active browser does not spend another browser session, ending saves profile',async()=>{
 assert.equal(await startQuizletConnection(c,{apiKey:'test',fetchImpl:async()=>{throw Error('unexpected');}}),c);
 const ended=await endQuizletConnection(c,{apiKey:'test',fetchImpl:async(u,i)=>{assert.match(String(u),/remote-id$/);assert.equal(i?.method,'DELETE');return Response.json({success:true});}});
 assert.deepEqual(ended,{profile:c.profile});
});
