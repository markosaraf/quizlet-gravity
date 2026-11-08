import { Leaderboard } from '@/components/community/Leaderboard';
import { DIFFICULTY_ORDER, GAME_STATES } from '@/lib/gravity/constants';
import { STRINGS, format } from '@/lib/gravity/strings';
import type { Difficulty, Side } from '@/lib/gravity/constants';
import type { GameData } from '@/lib/gravity/types';

/** Map a Difficulty enum value → its display label key. */
const DIFFICULTY_LABEL_KEY: Record<Difficulty, keyof typeof STRINGS.options.difficulty_selector> = {
  SLOTH: 'sloth',
  BEGINNER: 'easy',
  INTERMEDIATE: 'medium',
  EXPERT: 'hard',
  MAD_MAX: 'mad_max',
};

interface StartScreenProps {
  data: GameData;
  onStart: () => void;
  onOptions: () => void;
  onDirections: () => void;
  onDifficultyChange: (d: Difficulty) => void;
  onSideChange: (s: Side) => void;
  onPartialChange: (b: boolean) => void;
  onSelectedOnlyChange?: (selectedOnly: boolean) => void;
}

/* ---------------- Splash (INTRO) ---------------- */
export function SplashView({ onStart }: { onStart: () => void }) {
  return (
    <div className="GravitySplashView">
      <h1 className="GravitySplashView-title">{STRINGS.splash.title}</h1>
      <p className="GravitySplashView-description">
        {STRINGS.splash.description}
      </p>
      <button
        className="UIButton UIButton--hero"
        aria-label={STRINGS.splash.start_button}
        onClick={onStart}
      >
        {STRINGS.splash.start_button}
      </button>
    </div>
  );
}

/* ---------------- Options ---------------- */
export function OptionsView({
  data,
  onDifficultyChange,
  onSideChange,
  onPartialChange,
  onSelectedOnlyChange,
  onNext,
}: {
  data: GameData;
  onDifficultyChange: (d: Difficulty) => void;
  onSideChange: (s: Side) => void;
  onPartialChange: (b: boolean) => void;
  onSelectedOnlyChange?: (selectedOnly: boolean) => void;
  onNext: () => void;
}) {
  // Count how many terms are starred — used to disable the "Starred terms"
  // toggle when there are zero starred terms (would otherwise produce an
  // empty game / "ran out of terms" error screen).
  const starredCount = Object.values(data.terms).filter((t) => t.starred).length;

  // The dropdown value is the ANSWER side; showing side is flipped
  const answerSideValue: 'word' | 'definition' | 'random' =
    data.showingTermSide === 'word'
      ? 'definition'
      : data.showingTermSide === 'definition'
        ? 'word'
        : 'random';

  const wordLabel =
    data.set.wordLang !== data.set.defLang
      ? data.set.wordLang
      : STRINGS.options.side_selector.term;
  const defLabel =
    data.set.wordLang !== data.set.defLang
      ? data.set.defLang
      : STRINGS.options.side_selector.definition;

  return (
    <div className="GravityUIModal">
      <div className="GravityUIModal-box">
        <div className="GravityUIModal-boxHeader">{STRINGS.options.title}</div>
        <div className="GravityOptionsView">
          <div className="GravityUIRow">
            <div className="GravityUIColumn">
              <fieldset className="GravityUIFieldset">
                <div className="GravityUIFieldset-legend">
                  {STRINGS.options.study_starred_selector.title}
                </div>
                <div className="GravityUIToggle">
                  <button
                    type="button"
                    className={`GravityUIToggle-option ${!data.selectedOnly ? 'is-selected' : ''}`}
                    onClick={() => onSelectedOnlyChange?.(false)}
                  >
                    {STRINGS.options.study_starred_selector.all}
                  </button>
                  <button
                    type="button"
                    className={`GravityUIToggle-option ${data.selectedOnly ? 'is-selected' : ''}`}
                    disabled={starredCount === 0}
                    title={
                      starredCount === 0
                        ? 'Star terms on the import screen first (click ★ next to a row)'
                        : `Study only your ${starredCount} starred term${starredCount === 1 ? '' : 's'}`
                    }
                    onClick={() => onSelectedOnlyChange?.(true)}
                  >
                    {STRINGS.options.study_starred_selector.starred}
                  </button>
                </div>
              </fieldset>
            </div>
            <div className="GravityUIColumn">
              <fieldset className="GravityUIFieldset">
                <div className="GravityUIFieldset-legend">
                  {STRINGS.options.side_selector.title}
                </div>
                {/* Custom toggle group — replaces the native <select> dropdown
                    (whose option popup is OS-rendered and can't be styled with
                    CSS, so it looked like a "weird grey popup" in both modes).
                    Now three toggle buttons that match the difficulty selector
                    pattern below, so they pick up the same blue/gold light-mode
                    styling and the same twilight-500 dark-mode styling. */}
                <div
                  className="GravityUIToggle"
                  role="radiogroup"
                  aria-label={STRINGS.options.side_selector.title}
                >
                  <button
                    type="button"
                    role="radio"
                    aria-checked={answerSideValue === 'word'}

                    className={`GravityUIToggle-option ${answerSideValue === 'word' ? 'is-selected' : ''}`}
                    onClick={() => onSideChange('definition')}
                  >
                    {wordLabel}
                  </button>
                  <button
                    type="button"
                    role="radio"
                    aria-checked={answerSideValue === 'definition'}

                    className={`GravityUIToggle-option ${answerSideValue === 'definition' ? 'is-selected' : ''}`}
                    onClick={() => onSideChange('word')}
                  >
                    {defLabel}
                  </button>
                  <button
                    type="button"
                    role="radio"
                    aria-checked={answerSideValue === 'random'}

                    className={`GravityUIToggle-option ${answerSideValue === 'random' ? 'is-selected' : ''}`}
                    onClick={() => onSideChange('random')}
                  >
                    {STRINGS.options.side_selector.random}
                  </button>
                </div>
              </fieldset>
            </div>
          </div>

          <div className="GravityOptionsView-row">
            <fieldset className="GravityUIFieldset">
              <div className="GravityUIFieldset-legend">
                {STRINGS.options.difficulty_selector.title}
              </div>
              <div
                className="GravityUIToggle"
                role="radiogroup"
                aria-label={STRINGS.options.difficulty_selector.title}
              >
                {DIFFICULTY_ORDER.map((d) => (
                  <button
                    key={d}
                    type="button"
                    role="radio"
                    aria-checked={data.difficultyLevel === d}
                    className={`GravityUIToggle-option ${data.difficultyLevel === d ? 'is-selected' : ''}`}
                    onClick={() => onDifficultyChange(d)}
                  >
                    {STRINGS.options.difficulty_selector[DIFFICULTY_LABEL_KEY[d]]}
                  </button>
                ))}
              </div>
            </fieldset>
          </div>

          <div className="GravityOptionsView-row">
            {/* Always visible — the old "Show advanced options" click-through
                link is gone — so the player ALWAYS sees whether partial
                answers are currently selected or not. Bound directly to the
                store value (single source of truth). */}
            <label className="GravityUICheckbox">
              <input
                type="checkbox"
                checked={data.acceptsPartialAnswer}
                onChange={() => onPartialChange(!data.acceptsPartialAnswer)}
              />
              <span className="GravityUICheckbox-label">
                {STRINGS.options.multiple_answers.label}
              </span>
            </label>
            <div className="GravityUISmall">
              {STRINGS.options.multiple_answers.description}
            </div>
          </div>

          <div className="GravityOptionsView-nextButtonWrapper">
            <button
              className="UIButton UIButton--hero UIButton--fill"
              aria-label={STRINGS.options.next_button}
              onClick={onNext}
            >
              {STRINGS.options.next_button}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

/* ---------------- Directions ---------------- */
export function DirectionsView({ onStart }: { onStart: () => void }) {
  return (
    <div className="GravityUIModal">
      <div className="GravityUIModal-box">
        <div className="GravityDirectionsView">
          <div className="GravityDirectionsView-asteroidImage" />
          <div className="GravityDirectionsView-title">
            {STRINGS.directions.title}
          </div>
          {STRINGS.directions.body.map((p, i) => (
            <p key={i} className="GravityUIParagraph">
              {p}
            </p>
          ))}
          <div className="GravityDirectionsView-startButton">
            <button
              className="UIButton UIButton--hero"
              aria-label={STRINGS.directions.start_button}
              onClick={onStart}
            >
              {STRINGS.directions.start_button}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

/* ---------------- Error: no available terms ---------------- */
export function ErrorNoAvailableTermsView() {
  return (
    <div className="GravityUIModal">
      <div className="GravityUIModal-box">
        <div className="GravityErrorNoAvailableTermsView">
          <h2 className="GravityUIHeading">
            {STRINGS.error_no_available_terms.heading}
          </h2>
          <p className="GravityUIParagraph">
            {STRINGS.error_no_available_terms.message}
          </p>
        </div>
      </div>
    </div>
  );
}

/* ---------------- StartView switch ---------------- */
export function StartView({
  data,
  onStart,
  onOptions,
  onDirections,
  onDifficultyChange,
  onSideChange,
  onPartialChange,
  onSelectedOnlyChange,
}: StartScreenProps) {
  return (
    <div className="GravityStartView">
      {/* NOTE: the original dark .GravityStartView-backdrop overlay was
          intentionally removed — the intro ("Defend Your Planet!"), options
          and how-to-play screens now sit directly on the starry background
          with no dimming layer. */}
      {(() => {
        switch (data.gameState) {
          case GAME_STATES.INTRO:
            // splash start → options (original: displayGameOptions)
            return <SplashView onStart={onOptions} />;
          case GAME_STATES.OPTIONS:
            return (
              <OptionsView
                data={data}
                onDifficultyChange={onDifficultyChange}
                onSideChange={onSideChange}
                onPartialChange={onPartialChange}
                onSelectedOnlyChange={onSelectedOnlyChange}
                onNext={onDirections}
              />
            );
          case GAME_STATES.DIRECTIONS:
            // directions start → gameplay (original: startGame)
            return <DirectionsView onStart={onStart} />;
          case GAME_STATES.ERROR_NO_AVAILABLE_TERMS:
            return <ErrorNoAvailableTermsView />;
          default:
            return null;
        }
      })()}
    </div>
  );
}

/* ---------------- Game over view ---------------- */

export function GameOverView({
  points,
  level,
  sharedSetId,
  scoreSettled,
  leaderboardRefresh,
  onRestart,
  onNewSet,
}: {
  points: number;
  level: number;
  sharedSetId?: string;
  scoreSettled: boolean;
  leaderboardRefresh: string;
  onRestart: () => void;
  onNewSet: () => void;
}) {
  return (
    <div className="GravityUIModal">
      <div className="GravityUIModal-box">
        <div style={{ textAlign: 'center' }}>
          {/* congrats.svg — celebratory graphic shown on every game-over screen */}
          <img
            src="/assets/gravity/congrats.svg"
            alt=""
            aria-hidden="true"
            style={{
              width: '4rem',
              height: '4rem',
              margin: '0 auto 0.5rem',
              display: 'block',
            }}
          />
          <h2 className="GravityUIHeading" style={{ fontSize: '1.875rem' }}>
            {STRINGS.game_over.title}
          </h2>
          <p className="GravityUIParagraph" style={{ fontSize: '1.125rem' }}>
            {format(STRINGS.game_over.score_label, { points, level })}
          </p>

          {sharedSetId ? (
            <Leaderboard id={sharedSetId} compact aroundPlayer ready={scoreSettled} refresh={leaderboardRefresh}/>
          ) : null}

          <div
            style={{
              display: 'flex',
              gap: '1rem',
              justifyContent: 'center',
              marginTop: '1.5rem',
            }}
          >
            <button className="UIButton UIButton--hero" onClick={onRestart}>
              {STRINGS.game_over.play_again_button}
            </button>
            <button className="UIButton UIButton--default" onClick={onNewSet}>
              {STRINGS.game_over.new_set_button}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
