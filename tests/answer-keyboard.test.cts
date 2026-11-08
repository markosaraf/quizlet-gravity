import assert from 'node:assert/strict';
import { test } from 'node:test';
import { answerInputMode, nextAnswer } from '../src/lib/gravity/answer-keyboard';

test('number-leading answers request a number keyboard, including mixed answers', () => {
  for (const answer of ['12', '  3.5', '7 days', '0', '١٢']) assert.equal(answerInputMode(answer), 'decimal');
  for (const answer of ['', '   ', 'Paris', 'seven', 'Room 12']) assert.equal(answerInputMode(answer), 'text');
});
test('keyboard follows answer side of oldest falling asteroid, then next asteroid', () => {
  const terms = { a: {id:'a',luid:'a',word:'two',definition:'2'}, b: {id:'b',luid:'b',word:'Paris',definition:'France'} };
  const first = {luid:'a',side:'word' as const,answerLang:'en',promptLang:'en'};
  const second = {luid:'b',side:'definition' as const,answerLang:'en',promptLang:'en'};
  assert.equal(answerInputMode(nextAnswer({first,second},terms)), 'decimal');
  assert.equal(nextAnswer({second},terms), 'Paris');
  assert.equal(answerInputMode(nextAnswer({second},terms)), 'text');
  assert.equal(nextAnswer({first:{...first,side:'definition'}},terms), 'two');
  assert.equal(nextAnswer({},terms), '');
});
