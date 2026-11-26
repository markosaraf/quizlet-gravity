import {test} from 'node:test';
import assert from 'node:assert/strict';
import {sharedSetPath,matchesSharedSetPath} from '../src/lib/community/set-links.ts';
test('imported shared links preserve Quizlet ID, locale and slug, dropping tracking',()=>{
 assert.equal(sharedSetPath({public_id:'1181229873',title:'Voci Mission 6',source_url:'https://quizlet.com/ch/1181229873/voci-mission-6-flash-cards/?i=share'}),'/ch/1181229873/voci-mission-6-flash-cards');
});
test('custom links have a stable numeric ID and safe title slug',()=>{
 assert.equal(sharedSetPath({public_id:'1000000000000000',title:'Français: été / déjà vu?'}),'/1000000000000000/francais-ete-deja-vu-flash-cards');
 assert.equal(sharedSetPath({public_id:'1000000000000001',title:'汉语'}),'/1000000000000001/汉语-flash-cards');
});
test('missing slugs and wrong source IDs fall back to the actual set title',()=>{
 assert.equal(sharedSetPath({public_id:'123',title:'My set',source_url:'https://quizlet.com/456/other-flash-cards/'}),'/123/my-set-flash-cards');
 assert.equal(sharedSetPath({public_id:'123',title:'My set',source_url:'https://quizlet.com/123/'}),'/123/my-set-flash-cards');
});
test('canonical Chinese and Cyrillic links do not redirect to themselves',()=>{
 for(const path of ['/id/651523130/mandarin-meihua-2-unit-4-你喜欢吃什么-flash-cards','/ru/500685109/административное-деление-японии-тодофукэн-to-do-fu-ken-flash-cards']){
  const canonical=sharedSetPath({public_id:path.split('/')[2],title:'Imported game',source_url:'https://quizlet.com'+path});
  assert.equal(matchesSharedSetPath(path,canonical),true);
  assert.equal(matchesSharedSetPath(encodeURI(path),canonical),true);
  assert.equal(matchesSharedSetPath(encodeURI(path).replace(/%[A-F0-9]{2}/g,s=>s.toLowerCase()),canonical),true);
 }
});
test('canonical comparison still redirects wrong slugs and preserves segment boundaries',()=>{
 assert.equal(matchesSharedSetPath('/123/old-flash-cards','/123/new-flash-cards'),false);
 assert.equal(matchesSharedSetPath('/123/a%2Fb-flash-cards','/123/a/b-flash-cards'),false);
 assert.equal(matchesSharedSetPath('/123/bad%slug-flash-cards','/123/good-flash-cards'),false);
 assert.equal(matchesSharedSetPath('/123/a&b-flash-cards','/123/a%26b-flash-cards'),true);
});
