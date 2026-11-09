import { useState } from 'react';

export function useGameplayTextSize() {
  const [large, setLarge] = useState(false);
  return { large, toggle: () => setLarge(value => !value) };
}

export function GameplayTextToggle({ large, onToggle, className = '' }: {
  large: boolean; onToggle: () => void; className?: string;
}) {
  const label = large ? 'Restore normal game text size' : 'Enlarge game text by 33%';
  return <button type="button" className={`GravityTextSizeToggle ${className}`}
    aria-label={label} title={label} aria-pressed={large}
    onPointerDown={event => event.preventDefault()} onClick={onToggle}>
    <svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor"
      strokeWidth="1.8" strokeLinecap="round" aria-hidden="true">
      <circle cx="10" cy="10" r="6.5"/><path d="m15 15 6 6M7 10h6"/>
      {!large && <path d="M10 7v6"/>}
    </svg>
  </button>;
}
