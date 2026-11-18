import { useState } from 'react';

export type GameTextStep = 0 | 1 | 2 | 3;
const sizes = ['normal', 'large', 'normal', 'small'] as const;
const scales = [1, 1.33, 1, 0.75] as const;
const labels = [
  'Enlarge game text and asteroids by 33%',
  'Restore normal game text and asteroid size',
  'Reduce game text and asteroids by 25%',
  'Restore normal game text and asteroid size',
] as const;

export function useGameplayTextSize() {
  const [step, setStep] = useState<GameTextStep>(0);
  return { step, size: sizes[step], scale: scales[step], toggle: () => setStep(value => ((value + 1) % 4) as GameTextStep) };
}

export function GameplayTextToggle({ step = 0, onToggle, className = '' }: {
  step?: GameTextStep; onToggle: () => void; className?: string;
}) {
  const label = labels[step];
  const increases = step === 0 || step === 3;
  return <button type="button" className={`GravityTextSizeToggle ${className}`}
    aria-label={label} title={label} aria-pressed={step === 1 || step === 3}
    onPointerDown={event => event.preventDefault()} onClick={onToggle}>
    <svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor"
      strokeWidth="1.8" strokeLinecap="round" aria-hidden="true">
      <circle cx="10" cy="10" r="6.5"/><path d="m15 15 6 6M7 10h6"/>
      {increases && <path d="M10 7v6"/>}
    </svg>
  </button>;
}
