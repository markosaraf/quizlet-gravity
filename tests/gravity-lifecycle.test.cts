import assert from 'node:assert/strict';
import { test } from 'node:test';
import { GravityStore } from '../src/lib/gravity/store';
import { GAME_STATES } from '../src/lib/gravity/constants';

function game() {
  const store = new GravityStore();
  store.setup({set:{id:'test',title:'Test',wordLang:'en',defLang:'en'},terms:[
    {id:'1',luid:'term-1',word:'one',definition:'1'},
    {id:'2',luid:'term-2',word:'two',definition:'2'},
  ]});
  return store;
}

test('switching apps after game over cannot revive a completed run', () => {
  const store = game();
  store.data!.points = 1160;
  store.data!.level = 2;
  store._endGame();
  store.pauseGame();
  store.resumeGame();
  store.gradeAnswer();
  store.missTerm("stale-asteroid", false);
  store.checkCopiedAnswer("stale-asteroid", "1");
  assert.equal(store.getSnapshot().gameState, GAME_STATES.GAME_OVER);
  assert.equal(store.getSnapshot().points, 1160);
  assert.equal(store.getSnapshot().level, 2);
});

test('pause/resume cannot bypass instructions, a missed answer, or a level transition', () => {
  const store = game();
  for (const state of [GAME_STATES.INTRO,GAME_STATES.OPTIONS,GAME_STATES.DIRECTIONS,
    GAME_STATES.LOADING,GAME_STATES.COPY_ANSWER,GAME_STATES.LEVEL_UP]) {
    store.data!.gameState = state;
    store.pauseGame();
    store.resumeGame();
    assert.equal(store.getSnapshot().gameState,state);
  }
  store._endGame();
});

test('active play still pauses/resumes and an explicit restart resets the run', () => {
  const store = game();
  try {
    store.data!.gameState = GAME_STATES.FREE_FALL;
    store.pauseGame();
    assert.equal(store.getSnapshot().gameState,GAME_STATES.PAUSED);
    store.resumeGame();
    assert.equal(store.getSnapshot().gameState,GAME_STATES.FREE_FALL);
    store._endGame();
    store.restartGame();
    assert.equal(store.getSnapshot().gameState,GAME_STATES.OPTIONS);
    assert.equal(store.getSnapshot().points,0);
    assert.equal(store.getSnapshot().level,1);
  } finally {store._endGame();}
});
