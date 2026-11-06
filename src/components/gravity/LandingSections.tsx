'use client';

import { useSyncExternalStore } from 'react';
import { FaqSection } from '@/app/seo-content';

// Keep the server-rendered FAQ visible until a game starts.

let gameStarted = false;
const listeners = new Set<() => void>();

/** Called by GravityApp — true once "Start studying" has been clicked. */
export function setGameStarted(value: boolean) {
  if (value === gameStarted) return;
  gameStarted = value;
  listeners.forEach((listener) => listener());
}

function subscribe(listener: () => void) {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

// Server snapshot: sections are always present in the first server
// render, so SEO content + JSON-LD stay consistent with the markup.
function getServerSnapshot() {
  return false;
}

export function LandingSections() {
  const started = useSyncExternalStore(subscribe, () => gameStarted, getServerSnapshot);

  if (started) return null; // game session running — landing sections must not exist

  return (
    <>
      <FaqSection />
    </>
  );
}
