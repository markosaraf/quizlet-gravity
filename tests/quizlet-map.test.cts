import {test} from 'node:test';
import assert from 'node:assert/strict';
import {discoverQuizletSets,mapOptions,quizletMapLinks,QuizletMapError} from '../src/lib/gravity/quizlet-map.ts';

test('accepts optional topic and bounded limits, rejects malformed requests',()=>{
 assert.deepEqual(mapOptions({topic:'  French  ',limit:500}),{topic:'French',limit:500});
 assert.deepEqual(mapOptions({topic:'',limit:100}),{topic:'',limit:100});
 for(const value of [null,[],{topic:'x',limit:100000},{topic:4,limit:100},{topic:'x'.repeat(121),limit:100}])assert.throws(()=>mapOptions(value),QuizletMapError);
});
test('keeps relevance order, deduplicates by ID, excludes non-set and external links',()=>{
 const result=quizletMapLinks([
  {url:'https://quizlet.com/ch/1226829695/baume-und-straucher-flash-cards/',title:'Trees'},
  {url:'https://quizlet.com/1226829695/other-flash-cards/?x=y',title:'Duplicate'},
  {url:'https://quizlet.com/406340448/bonjour-flash-cards',description:'French'},
  {url:'https://quizlet.com/latest'}, {url:'https://quizlet.com/teacher'},
  {url:'https://quizlet.com.evil.test/123/flash-cards'},
  {url:'https://evil.test/?url=https://quizlet.com/234/flash-cards'},
  {url:'https://user:password@quizlet.com/234/flash-cards'},
  {url:'javascript:alert(1)'}, {}, null,
 ]);
 assert.deepEqual(result.map(s=>s.setId),['1226829695','406340448']);
 assert.equal(result[0].title,'Trees');assert.equal(result[1].title,'Quizlet set 406340448');
});
test('sends topic ranking and a fixed Quizlet domain, never scrapes or imports during discovery',async()=>{
 let calls=0;
 const result=await discoverQuizletSets({topic:'French',limit:100},{apiKey:'test-key',fetchImpl:async(url,init)=>{
  calls++;assert.equal(url,'https://api.firecrawl.dev/v2/map');
  assert.deepEqual(JSON.parse(String(init?.body)),{url:'https://quizlet.com',sitemap:'skip',limit:100,search:'French'});
  return Response.json({success:true,links:[{url:'https://quizlet.com/406340448/bonjour-flash-cards'}]});
 }});
 assert.equal(calls,1);assert.equal(result.sets.length,1);
});
test('blank topic omits search and unavailable providers cannot look like an empty success',async()=>{
 await discoverQuizletSets({topic:'',limit:100},{apiKey:'test-key',fetchImpl:async(_url,init)=>{
  assert.equal('search' in JSON.parse(String(init?.body)),false);return Response.json({success:true,links:[]});
 }});
 for(const status of [402,429,500])await assert.rejects(discoverQuizletSets({topic:'',limit:100},{apiKey:'test-key',fetchImpl:async()=>new Response('secret provider detail',{status})}),e=>e instanceof QuizletMapError&&!e.message.includes('secret')&&e.status===(status===500?502:429));
 await assert.rejects(discoverQuizletSets({topic:'',limit:100},{apiKey:'test-key',fetchImpl:async()=>Response.json({success:false,error:'secret'})}),QuizletMapError);
 await assert.rejects(discoverQuizletSets({topic:'',limit:100},{apiKey:'test-key',fetchImpl:async()=>Response.json({success:true})}),QuizletMapError);
});
