import {test} from 'node:test';
import assert from 'node:assert/strict';
import {creatorUsername,parseQuizletCreator,discoverQuizletCreator,parseQuizletCreatorPage} from '../src/lib/gravity/quizlet-creator.ts';
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
 assert.equal(result.creator.username,'Teacher_One');assert.equal(result.creator.complete,false);
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
  if(JSON.parse(String(init?.body)).url.includes('/webapi/'))return Response.json({success:true,data:{rawHtml:batch([set]),metadata:{statusCode:200}}});
  assert.equal(JSON.parse(String(init?.body)).url,'https://quizlet.com/user/Teacher_One/sets');
  return Response.json({success:true,data:{rawHtml:html(page),metadata:{statusCode:200}}});
 }});
 assert.equal(result.sets.length,1);
 for(const status of [402,429,500])await assert.rejects(discoverQuizletCreator('Teacher_One',{apiKey:'test',fetchImpl:async()=>new Response('private error',{status})}),e=>e instanceof QuizletMapError&&!e.message.includes('private error'));
 await assert.rejects(discoverQuizletCreator('Teacher_One',{apiKey:'test',fetchImpl:async()=>Response.json({success:true,data:{rawHtml:html(page),metadata:{statusCode:403}}})}),QuizletMapError);
});

const batch=(sets:unknown[],page=1,total=sets.length)=>JSON.stringify({responses:[{models:{set:sets},paging:{total,page,perPage:100,token:'next'}}]});
test('abbreviated profile is expanded with all public creator pages',async()=>{
 const all=Array.from({length:114},(_,i)=>({...set,id:123+i,title:`Set ${i}`}));
 const urls:string[]=[];
 const result=await discoverQuizletCreator('Teacher_One',{apiKey:'test',fetchImpl:async(_url,init)=>{
  const url=new URL(JSON.parse(String(init?.body)).url);urls.push(url.href);
  const pageNumber=Number(url.searchParams.get('page'));
  if(pageNumber===2)assert.equal(url.searchParams.get('pagingToken'),'next');
  if(pageNumber)assert.equal(url.searchParams.get('filters[creatorId]'),'42');
  return Response.json({success:true,data:{metadata:{statusCode:200},rawHtml:pageNumber?batch(all.slice((pageNumber-1)*100,pageNumber*100),pageNumber,114):html({...page,createdSets:all.slice(0,3)})}});
 }});
 assert.equal(result.sets.length,114);assert.equal(result.creator.complete,true);assert.equal(urls.length,3);
});
test('failed later page retains verified results without claiming completeness',async()=>{
 const all=Array.from({length:100},(_,i)=>({...set,id:123+i}));
 const result=await discoverQuizletCreator('Teacher_One',{apiKey:'test',fetchImpl:async(_url,init)=>{
  const url=new URL(JSON.parse(String(init?.body)).url);
  if(url.searchParams.get('page')==='2')return new Response('',{status:503});
  return Response.json({success:true,data:{metadata:{statusCode:200},rawHtml:url.pathname.includes('webapi')?batch(all,1,114):html(page)}});
 }});
 assert.equal(result.sets.length,100);assert.equal(result.creator.complete,false);
});
test('creator pages reject mismatched ownership, duplicates and inconsistent paging',()=>{
 assert.throws(()=>parseQuizletCreatorPage(batch([{...set,creatorId:99}]),42,1));
 assert.throws(()=>parseQuizletCreatorPage(batch([set,set]),42,1));
 assert.throws(()=>parseQuizletCreatorPage(batch([set]),42,2));
 assert.throws(()=>parseQuizletCreatorPage(batch([set]),42,1,2));
 assert.equal(parseQuizletCreatorPage(batch([{...set,accessType:0}]),42,1).sets.length,0);
 assert.equal(parseQuizletCreatorPage(batch([]),42,1).total,0);
});

test('deleted records count for pagination without discarding public sets (marko1804 regression)',async()=>{
 const records=[{...set,id:1055070420,title:'fälle (fragen)'},{id:227795077,isDeleted:true,lastModified:1506444443},{...set,id:116299179,accessType:0,passwordUse:true},{...set,id:871187579,title:'Voci-english-maja-1'}];
 const result=await discoverQuizletCreator('Teacher_One',{apiKey:'test',fetchImpl:async(_url,init)=>{
  const url=JSON.parse(String(init?.body)).url;
  return Response.json({success:true,data:{metadata:{statusCode:200},rawHtml:url.includes('/webapi/')?batch(records):html({...page,createdSets:[records[2]]})}});
 }});
 assert.deepEqual(result.sets.map(s=>s.setId),['1055070420','871187579']);
 assert.equal(result.creator.complete,true);assert.equal(result.linksScanned,4);
 // An unexplained missing creator is still rejected, not assumed to be deleted.
 assert.throws(()=>parseQuizletCreatorPage(batch([{id:227795077}]),42,1));
});
test('unavailable full listing is an error when the profile contains no public sets',async()=>{
 await assert.rejects(discoverQuizletCreator('Teacher_One',{apiKey:'test',fetchImpl:async(_url,init)=>{
  if(JSON.parse(String(init?.body)).url.includes('/webapi/'))return new Response('',{status:503});
  return Response.json({success:true,data:{metadata:{statusCode:200},rawHtml:html({...page,createdSets:[]})}});
 }}),QuizletMapError);
});
