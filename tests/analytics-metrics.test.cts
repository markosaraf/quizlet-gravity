import assert from 'node:assert/strict';
import {test} from 'node:test';
import {changeLabel} from '../src/lib/analytics-metrics';
test('percentage comparison distinguishes a zero baseline from a percentage increase',()=>{
 assert.equal(changeLabel(0,0),'0%');assert.equal(changeLabel(7,0),'New');
 assert.equal(changeLabel(0,5),'-100%');assert.equal(changeLabel(261,125),'+108.8%');assert.equal(changeLabel(10,20),'-50%');
});
