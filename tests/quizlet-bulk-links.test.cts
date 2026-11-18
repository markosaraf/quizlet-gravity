import test from 'node:test';
import assert from 'node:assert/strict';
import {parseQuizletBulkLinks} from '../src/lib/gravity/quizlet-bulk-links';
test('multiple set links normalize and deduplicate by set ID across locales and tracking URLs',()=>{
 const r=parseQuizletBulkLinks('https://quizlet.com/ch/123/one-flash-cards/?x=1\nhttps://quizlet.com/456/two-flash-cards/ quizlet.com/123/other-name-flash-cards/');
 assert.deepEqual(r.sets.map(x=>x.setId),['123','456']);assert.equal(r.duplicates,1);
});
test('invalid and non-set links fail the whole review rather than silently importing a partial list',()=>{
 for(const value of ['', 'https://quizlet.com/123/ https://evil.test/456/', 'https://quizlet.com/class/123/', 'https://quizlet.com/user', 'https://quizlet.com/123/\nnot-a-link', 'x'.repeat(100001)])assert.throws(()=>parseQuizletBulkLinks(value));
});
test('more than twenty links can be pasted for review and subsequent batches',()=>{
 assert.equal(parseQuizletBulkLinks(Array.from({length:25},(_,i)=>`https://quizlet.com/${i+1}/`).join('\n')).sets.length,25);
});
