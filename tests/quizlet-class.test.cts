import assert from 'node:assert/strict';
import test from 'node:test';
import {classFromLink,classQuery,searchQuizletClasses,parseQuizletClass,discoverQuizletClass} from '../src/lib/gravity/quizlet-class.ts';
test('class URLs are limited to numeric public Quizlet class routes',()=>{
 assert.equal(classFromLink({url:'https://quizlet.com/class/123/?tracking=1'})?.id,'123');
 for(const url of ['https://evil.test/class/123','https://quizlet.com@evil.test/class/123','https://quizlet.com/123/','http://quizlet.com/class/123','https://quizlet.com:444/class/123']) assert.equal(classFromLink({url}),null);
 assert.throws(()=>classQuery(''));assert.throws(()=>classQuery('bad\nquery'));
});
test('search returns only unique classes, not matching set or profile URLs',async()=>{
 const r=await searchQuizletClasses('French',{apiKey:'test',fetchImpl:async(_u,init)=>{
  assert.equal(JSON.parse(String(init?.body)).limit,20);
  return Response.json({success:true,data:{web:[{url:'https://quizlet.com/class/123/',title:'French'},{url:'https://quizlet.com/class/123/'},{url:'https://quizlet.com/987/french-flash-cards/'}]}});
 }});assert.deepEqual(r.classes.map(c=>c.id),['123']);
});
test('direct class link needs no search credits and arbitrary IDs never reach provider',async()=>{
 const deps={apiKey:'test',fetchImpl:async()=>{throw Error('unexpected network');}};
 assert.equal((await searchQuizletClasses('https://quizlet.com/class/123/',deps)).classes.length,1);
 await assert.rejects(discoverQuizletClass('../foo',deps));
});
function html(feed:unknown[],sets:object={}){return `<script id="__NEXT_DATA__">${JSON.stringify({props:{pageProps:{data:{class:{id:123,title:'French'}},dehydratedReduxStateKey:JSON.stringify({classItems:{currentClassId:123,feed,models:{set:sets}}})}}})}</script>`;}
test('hidden class contents are explained without using unrelated set links',()=>{
 const r=parseQuizletClass(html([],{'5':{id:5,title:'Unrelated',accessType:2}}),'123');
 assert.deepEqual(r.sets,[]);assert.match(r.notice,/without signing in/);
 assert.throws(()=>parseQuizletClass(html([]),'456'));
});
test('only explicitly listed public class set models become results',()=>{
 const r=parseQuizletClass(html([{setId:5},{setId:6}],{a:{id:5,title:'Public',accessType:2},b:{id:6,title:'Private',accessType:1},c:{id:7,title:'Unrelated',accessType:2}}),'123');
 assert.deepEqual(r.sets.map(s=>s.setId),['5']);assert.match(r.notice,/incomplete/);
});
