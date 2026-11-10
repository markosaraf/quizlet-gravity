import {test} from 'node:test';
import assert from 'node:assert/strict';
import {creatorUsername,parseQuizletCreator,discoverQuizletCreator} from '../src/lib/gravity/quizlet-creator.ts';
import {QuizletMapError} from '../src/lib/gravity/quizlet-map.ts';
const set={id:123,title:'French',creatorId:42,accessType:2,passwordUse:false,numTerms:20};
const page={user:{id:42,username:'Teacher_One'},modelView:'created',createdSets:[set],isFeedFinished:true};
const html=(p:unknown)=>`<script id="__NEXT_DATA__" type="application/json">${JSON.stringify({props:{pageProps:p}})}</script>`;
test('username rejects arbitrary URLs and path/query injection',()=>{
 assert.equal(creatorUsername(' Teacher_One '),'Teacher_One');
 for(const value of ['',null,'https://example.com','user/sets','x?test=yes','a'.repeat(51)])assert.throws(()=>creatorUsername(value),QuizletMapError);
});
test('only returns public created sets owned by the exact requested creator',()=>{
 const result=parseQuizletCreator(html({...page,createdSets:[set,{...set,id:124,creatorId:43},{...set,id:125,passwordUse:true},{...set,id:126,accessType:0},{...set,id:127,_webUrl:'https://evil.test'}]}),'teacher_one');
 assert.deepEqual(result.sets.map(s=>s.setId),['123','127']);
 assert.equal(result.creator.username,'Teacher_One');assert.equal(result.creator.complete,true);
 assert.equal(result.sets[1].url,'https://quizlet.com/127/');
 assert.throws(()=>parseQuizletCreator(html(page),'other_user'),QuizletMapError);
 assert.throws(()=>parseQuizletCreator(html({...page,modelView:'studied'}),'Teacher_One'),QuizletMapError);
 assert.throws(()=>parseQuizletCreator(html({}),'Teacher_One'),QuizletMapError);
});
test('empty profile is distinct from unreadable profile and incomplete list stays labelled',()=>{
 assert.equal(parseQuizletCreator(html({...page,createdSets:[]}),'Teacher_One').sets.length,0);
 assert.equal(parseQuizletCreator(html({...page,isFeedFinished:false}),'Teacher_One').creator.complete,false);
 assert.throws(()=>parseQuizletCreator('<html>Login</html>','Teacher_One'),QuizletMapError);
});
test('fetches public creator path, validates source and protects provider errors',async()=>{
 const result=await discoverQuizletCreator('Teacher_One',{apiKey:'test',fetchImpl:async(url,init)=>{
  assert.equal(url,'https://api.firecrawl.dev/v2/scrape');
  assert.equal(JSON.parse(String(init?.body)).url,'https://quizlet.com/user/Teacher_One/sets');
  return Response.json({success:true,data:{rawHtml:html(page),metadata:{statusCode:200}}});
 }});
 assert.equal(result.sets.length,1);
 for(const status of [402,429,500])await assert.rejects(discoverQuizletCreator('Teacher_One',{apiKey:'test',fetchImpl:async()=>new Response('private error',{status})}),e=>e instanceof QuizletMapError&&!e.message.includes('private error'));
 await assert.rejects(discoverQuizletCreator('Teacher_One',{apiKey:'test',fetchImpl:async()=>Response.json({success:true,data:{rawHtml:html(page),metadata:{statusCode:403}}})}),QuizletMapError);
});
