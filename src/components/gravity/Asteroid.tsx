import { memo, useLayoutEffect, useRef, useState } from 'react';
import { GAME_STATES, getMaxTextLength, getTermSize } from '@/lib/gravity/constants';
import type { GravityTerm } from '@/lib/gravity/types';

interface Props {
  liveTermId: string;
  term: GravityTerm;
  showingSide: 'word' | 'definition';
  promptLang: string;
  gameState: string;
  isMeteor: boolean;
  termLife: number;
  textScale?: number;
  onMissed: (liveTermId: string) => void;
}

function AsteroidBase({
  liveTermId,
  term,
  showingSide,
  promptLang,
  gameState,
  isMeteor,
  termLife,
  textScale = 1,
  onMissed,
}: Props) {
  const text = term[showingSide] ?? '';
  const image = showingSide === 'definition' ? term._imageUrl : term._wordImageUrl;
  const hasImage = !!image;
  const maxLen = getMaxTextLength(promptLang, hasImage);
  const termSize = getTermSize(Math.min(text.length, maxLen), maxLen, hasImage);
  const textLength = Math.min(text.length, maxLen);

  const asteroidRef = useRef<HTMLDivElement>(null);
  const contentRef = useRef<HTMLDivElement>(null);
  // A stable lane keeps this asteroid from rerolling on resize or a text-size change.
  const [lane] = useState(() => Math.random());
  const nominalSize = termSize * textScale;
  const nominalContentWidth = (termSize - Math.max(60 * textLength / maxLen, 30) - Math.max(55 * textLength / maxLen, 25)) * textScale;

  useLayoutEffect(() => {
    const asteroid = asteroidRef.current;
    const content = contentRef.current;
    const area = asteroid?.parentElement;
    if (!asteroid || !content || !area) return;
    const viewport = window.visualViewport;
    const measure = () => {
      const bounds = area.getBoundingClientRect();
      const viewportLeft = viewport?.offsetLeft ?? 0;
      const viewportRight = viewportLeft + (viewport?.width ?? document.documentElement.clientWidth);
      const start = Math.max(bounds.left, viewportLeft) - bounds.left;
      const end = Math.min(bounds.right, viewportRight) - bounds.left;
      const margin = Math.min(12, Math.max(0, (end - start) / 4));
      const available = Math.max(1, end - start - margin * 2);
      const contentWidth = Math.min(nominalContentWidth, available);
      asteroid.style.setProperty('--asteroid-content-width', `${contentWidth}px`);
      // Measure wrapped text and loaded images at the final available width.
      // Enlarge uniformly when necessary: never squeeze/stretch the artwork.
      const contentHeight = content.getBoundingClientRect().height;
      const diameter = Math.max(nominalSize, Math.ceil(contentHeight / 0.6));
      const contentInset = (diameter - contentWidth) / 2;
      const left = start + margin + lane * Math.max(0, available - contentWidth) - contentInset;
      asteroid.style.setProperty('--asteroid-size', `${diameter}px`);
      asteroid.style.setProperty('--asteroid-left', `${left}px`);
      asteroid.style.setProperty('--asteroid-visibility', 'visible');
      asteroid.style.setProperty('--asteroid-running', 'running');
    };
    // Initial layout and resize-observer writes happen before paint. CSS
    // variables avoid a delayed React render briefly exposing clipped text.
    measure();
    const observer = new ResizeObserver(measure);
    observer.observe(area);
    observer.observe(content);
    window.addEventListener('resize', measure);
    viewport?.addEventListener('resize', measure);
    viewport?.addEventListener('scroll', measure);
    return () => {
      observer.disconnect();
      window.removeEventListener('resize', measure);
      viewport?.removeEventListener('resize', measure);
      viewport?.removeEventListener('scroll', measure);
    };
  }, [nominalSize, nominalContentWidth, lane]);

  const zIndex = (() => {
    const n = parseInt(liveTermId.split('-')[3] ?? '0', 10);
    return 300 - (Number.isNaN(n) ? 0 : n);
  })();

  const cls = [
    'GravityTerm',
    'tvy3tb5',
    gameState === GAME_STATES.FREE_FALL ? 'is-showing' : '',
    !isMeteor ? 'is-unmissed' : '',
    isMeteor ? 'is-meteor' : '',
    hasImage ? 'has-image' : '',
    hasImage && textLength === 0 ? 'image-only' : '',
  ]
    .filter(Boolean)
    .join(' ');

  const isFreeFall = gameState === GAME_STATES.FREE_FALL;

  return (
    <div
      ref={asteroidRef}
      className={cls}
      data-testid="GravityTerm"
      onAnimationEnd={event => { if (event.target === event.currentTarget) onMissed(liveTermId); }}
      style={{
        animationDuration: `${termLife}ms`,
        animationPlayState: isFreeFall ? 'var(--asteroid-running, paused)' : 'paused',
        height: `var(--asteroid-size, ${nominalSize}px)`,
        width: `var(--asteroid-size, ${nominalSize}px)`,
        top: 0,
        left: 'var(--asteroid-left, 0px)',
        zIndex,
      }}
    >
      <div ref={contentRef} className="GravityTerm-content">
        {hasImage ? (
          <div className="dvzmxm1">
            <img
              alt={text || "Study image"}
              className="i13a2vzw"
              data-testid="GravityTerm-image"
              src={image}
            />
          </div>
        ) : null}
        <div className="GravityTerm-text TermText" lang={promptLang}>
          {text}
        </div>
      </div>
    </div>
  );
}

export const Asteroid = memo(AsteroidBase);
