import { useSyncExternalStore } from 'react';
function snapshot() {
  const mode = document.documentElement.dataset.gravityInput;
  if (mode) return mode === 'touch';
  return navigator.maxTouchPoints > 0 && matchMedia('(pointer: coarse)').matches;
}
function subscribe(callback: () => void) {
  const media = matchMedia('(pointer: coarse)');
  media.addEventListener('change', callback);
  const observer = new MutationObserver(callback);
  observer.observe(document.documentElement, { attributes: true, attributeFilter: ['data-gravity-input'] });
  return () => { media.removeEventListener('change', callback); observer.disconnect(); };
}
export function useGameKeyboard() { return useSyncExternalStore(subscribe, snapshot, () => false); }
