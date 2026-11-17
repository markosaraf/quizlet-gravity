import assert from 'node:assert/strict';
import {test} from 'node:test';
import {gameUrl,gameDescription,xmlEscape} from '../src/lib/game-seo';
import {validateIndexNowUrls,submitToIndexNow} from '../src/lib/indexnow';
test('game metadata keeps original name, English description and canonical imported URL',()=>{
 const game={public_id:'123',title:'Kleines Einmaleins',term_count:24,source_url:'https://quizlet.com/de/123/kleines-einmaleins-flash-cards/?x=1'};
 assert.equal(gameUrl(game),'https://www.quizletgravity.com/de/123/kleines-einmaleins-flash-cards');
 assert.equal(gameDescription(game),'Practice Kleines Einmaleins with 24 flashcards in Quizlet Gravity. Learn by playing, share the game with friends and compete on the leaderboard.');
 assert.equal(xmlEscape('a&<b>"'),'a&amp;&lt;b&gt;&quot;');
});
test('IndexNow only permits canonical site URLs and deduplicates them',()=>{
 const valid='https://www.quizletgravity.com/123/hello-flash-cards';
 assert.deepEqual(validateIndexNowUrls([valid,valid]),[valid]);
 for(const url of ['https://evil.example/test','https://www.quizletgravity.com@evil.example/test',valid+'?x=1',valid+'#x','http://www.quizletgravity.com/test'])assert.throws(()=>validateIndexNowUrls([url]));
 assert.throws(()=>validateIndexNowUrls([]));
});
test('IndexNow rejection is an error, not a successful submission',async()=>{
 const previous=global.fetch;
 try{
  global.fetch=async()=>new Response('',{status:429});
  await assert.rejects(submitToIndexNow(['https://www.quizletgravity.com/']),/HTTP 429/);
  global.fetch=async()=>new Response('',{status:202});
  assert.deepEqual(await submitToIndexNow(['https://www.quizletgravity.com/']),{status:202,submitted:1});
 }finally{global.fetch=previous;}
});
