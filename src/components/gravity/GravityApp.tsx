'use client';

import { useCallback, useEffect, useMemo, useRef, useState, useSyncExternalStore } from 'react';
import { api } from '@/components/community/Community';
import { GAME_STATES } from '@/lib/gravity/constants';
import { gravityStore } from '@/lib/gravity/store';
import type { GameData, GravitySet, GravityTerm } from '@/lib/gravity/types';
import { getStoredPartialAnswer } from '@/lib/gravity/parse';
import { collectSpecialChars } from '@/lib/gravity/specialChars';
import { GameplayView, useGameplaySize } from './GameplayView';
import { ModeControls, SiteHeader } from './ModeControls';
import { StartView, GameOverView } from './StartScreens';
import { ImportScreen } from './ImportScreen';
import { setGameStarted } from './LandingSections';

export function GravityApp({shared,localGame,autoPlay=false}:{shared?:{set:GravitySet;terms:GravityTerm[]};localGame?:{set:GravitySet;terms:GravityTerm[]};autoPlay?:boolean}) {
  const runRef=useRef<string|null>(null);
  const finishedRun=useRef<string|null>(null);
  const [scoreMessage,setScoreMessage]=useState('');
  const [scoreRetry,setScoreRetry]=useState(0);
  const startingRef=useRef(false);
  const [starting,setStarting]=useState(false);
  const [started, setStarted] = useState(false);
  const gameplayRef = useRef<HTMLDivElement>(null);
  const size = useGameplaySize(gameplayRef, started);
  const data = useSyncExternalStore(
    gravityStore.subscribe,
    gravityStore.getSnapshot,
    () => null as unknown as GameData,
  );

  const [savedRun,setSavedRun]=useState<string|null>(null);
  const [failedRun,setFailedRun]=useState<string|null>(null);

  const handleStartSet = useCallback((set: GravitySet, terms: GravityTerm[]) => {
    gravityStore.setup({
      set,
      terms,
      acceptsPartialAnswer: getStoredPartialAnswer(),
    });
    setStarted(true);
  }, []);

  useEffect(()=>{const initial=shared??localGame;if(initial){handleStartSet(initial.set,initial.terms);if(autoPlay){gravityStore.changeDifficultyLevel('BEGINNER');gravityStore.changeShowingSide('word');gravityStore.startGame();}}return()=>gravityStore.dispose();},[shared,localGame,autoPlay,handleStartSet]);
  const beginGame=async(restart=false)=>{
    if(startingRef.current)return;
    startingRef.current=true;setStarting(true);setScoreMessage('');setSavedRun(null);setFailedRun(null);
    try{if(shared){const run=await api('runs',{setId:shared.set.id,mode:gravityStore.getSnapshot().difficultyLevel});runRef.current=run.id;finishedRun.current=null;}
      if(restart)gravityStore.restartGame();else gravityStore.startGame();
    }catch(e){setScoreMessage((e as Error).message);}finally{startingRef.current=false;setStarting(false);}
  };
  useEffect(()=>{
    if(!shared||!data||data.gameState!==GAME_STATES.GAME_OVER||!runRef.current||finishedRun.current===runRef.current)return;
    const id=runRef.current;finishedRun.current=id;
    api(`runs/${id}/finish`,{score:data.points,level:data.level}).then(()=>{if(runRef.current!==id)return;setSavedRun(id);setFailedRun(null);setScoreMessage('Your best score is saved.');}).catch(e=>{if(runRef.current!==id)return;finishedRun.current=null;setFailedRun(id);setScoreMessage('Score not saved: '+e.message);});
  },[data?.gameState,data?.points,data?.level,shared,scoreRetry]);

  // Special characters (ä ö é ß š …) that exist in the CURRENT set —
  // shown as clickable insert buttons above the typing field and the
  // copy-the-answer input. Collected from BOTH sides of every term.
  // data.terms keeps a stable reference across store ticks (change()
  // shallow-copies data), so this only recomputes when a new set loads.
  const specialChars = useMemo(
    () => (data ? collectSpecialChars(Object.values(data.terms)) : []),
    [data?.terms],
  );

  // keyboard: ESC skips the first live term (keymaster GAMEPLAY scope)
  useEffect(() => {
    if (!started || !data) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key !== 'Escape') return;
      const target = e.target as HTMLElement | null;
      const inInput = target && ['INPUT', 'TEXTAREA', 'SELECT'].includes(target.tagName);
      if (data.gameState === GAME_STATES.FREE_FALL) {
        e.preventDefault();
        const firstLive = Object.keys(data.liveTerms)[0];
        if (firstLive) gravityStore.missTerm(firstLive, true);
      } else if (data.gameState === GAME_STATES.COPY_ANSWER && !inInput) {
        // nothing — copy modal is modal
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [started, data]);

  const handleNewSet = useCallback(() => {
    if (shared || localGame) { window.location.assign("/create-set"); return; }
    gravityStore.dispose();
    setStarted(false);
  }, [shared,localGame]);

  // Mirror the `started` flag into the LandingSections store: while a
  // game session is running, the "How to play" + FAQ landing sections
  // are removed from the DOM entirely (they belong to the first page
  // only). Clicking "New set" flips this back to false and they return.
  useEffect(() => {
    setGameStarted(started);
  }, [started]);

  if (!started || !data) {
    return <ImportScreen onStart={handleStartSet} />;
  }

  // No screen-size/device blockers — the game is playable everywhere
  // (mobile layout in the top bar handles narrow widths).
  return (
    <div className="gravity-root">
      {(scoreMessage||starting)&&<p className="community-message" role="status">{starting?"Starting ranked game…":scoreMessage}</p>}
      <SiteHeader
        title={data.set.title}
        points={data.points}
        level={data.level}
        gameState={data.gameState}
        showMobileControls
        onPause={() => gravityStore.pauseGame()}
        onResume={() => gravityStore.resumeGame()}
        onRestart={() => void beginGame(true)}
        onNewSet={handleNewSet}
      />
      <div className="GravityModeLayout">
        <div className="GravityModeLayout-body">
          <ModeControls
            gameState={data.gameState}
            points={data.points}
            level={data.level}
            setPathLabel={data.set.title}
            onPause={() => gravityStore.pauseGame()}
            onResume={() => gravityStore.resumeGame()}
            onRestart={() => void beginGame(true)}
            onNewSet={handleNewSet}
          />
          <div
            className="GravityModeLayout-main"
            ref={gameplayRef}
          >
            <GameplayView
              data={data}
              specialChars={specialChars}
              onMissed={(id) => gravityStore.missTerm(id, false)}
              onType={(v) => gravityStore.updateMainTypingPromptValue(v)}
              onGrade={() => gravityStore.gradeAnswer()}
              onCopyAnswer={(id, answer, acknowledgeImage) => gravityStore.checkCopiedAnswer(id, answer, acknowledgeImage)}
              onPlanetLoaded={(level) => gravityStore.markPlanetLoaded(level)}
              windowWidth={size.w || 800}
              windowHeight={size.h || 600}
            />

            {[
              GAME_STATES.INTRO,
              GAME_STATES.DIRECTIONS,
              GAME_STATES.OPTIONS,
              GAME_STATES.LOADING,
              GAME_STATES.ERROR_NO_AVAILABLE_TERMS,
            ].includes(data.gameState as never) ? (
              <StartView
                data={data}
                onStart={() => void beginGame()}
                onOptions={() => gravityStore.displayGameOptions()}
                onDirections={() => gravityStore.displayGameDirections()}
                onDifficultyChange={(d) => gravityStore.changeDifficultyLevel(d)}
                onSideChange={(s) => gravityStore.changeShowingSide(s)}
                onPartialChange={(b) => gravityStore.updateAlternateAnswerOption(b)}
                onSelectedOnlyChange={(b) => gravityStore.changeSelectedOnly(b)}
              />
            ) : null}

            {data.gameState === GAME_STATES.GAME_OVER ? (
              <GameOverView
                points={data.points}
                level={data.level}
                sharedSetId={shared?.set.id}
                scoreSettled={!!(savedRun||failedRun)}
                leaderboardRefresh={savedRun??''}
                onRestart={() => void beginGame(true)}
                onNewSet={handleNewSet}
              />
            ) : null}
          </div>
        </div>
      </div>
      {scoreMessage.startsWith("Score not saved:")&&<button onClick={()=>setScoreRetry(n=>n+1)}>Retry saving score</button>}
    </div>
  );
}
