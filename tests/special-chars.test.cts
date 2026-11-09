import assert from 'node:assert/strict';
import { test } from 'node:test';
import { collectSpecialChars } from '../src/lib/gravity/specialChars';
const terms = [{id:'1',luid:'term-1',word:"à l'école?",definition:'Übung: 0,5.'}];
test('only keys needed for the selected answer side', () => {
  assert.deepEqual(new Set(collectSpecialChars(terms, 'word')), new Set(["à", "'", "é", "?"]));
  assert.deepEqual(new Set(collectSpecialChars(terms, 'definition')), new Set(['Ü', ':', ',', '.']));
  assert.equal(collectSpecialChars(terms, 'random').length, 8);
});
test('normalizes accents, preserves graphemes and ignores ASCII and invisible characters', () => {
  const terms = [{id:'2',luid:'term-2',word:'é e\u0301 👩🏽‍🚀 👩🏽‍🚀 ABCxyz0123456789 \n\t\u200b',definition:''}];
  assert.deepEqual(new Set(collectSpecialChars(terms, 'word')), new Set(['é', '👩🏽‍🚀']));
  assert.deepEqual(collectSpecialChars(terms, 'definition'), []);
});
test('admin switches independently hide letters and symbols while preserving answer-side filtering', () => {
  assert.deepEqual(collectSpecialChars(terms,'word',{specialLettersEnabled:true,specialCharactersEnabled:false}),['à','é']);
  assert.deepEqual(new Set(collectSpecialChars(terms,'definition',{specialLettersEnabled:false,specialCharactersEnabled:true})),new Set([',','.',':']));
  assert.deepEqual(collectSpecialChars(terms,'random',{specialLettersEnabled:false,specialCharactersEnabled:false}),[]);
  const all=collectSpecialChars(terms,'random');
  assert.deepEqual(all.slice(0,3),['à','é','Ü']);
  assert.equal(all.length,8);
});
