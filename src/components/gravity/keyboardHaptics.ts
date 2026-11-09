type HapticsWindow = Window & {
  GravityHaptics?: { postMessage: (message: string) => void };
  webkit?: { messageHandlers?: { gravityHaptics?: { postMessage: (message: string) => void } } };
};

/** Native wrappers choose their platform's standard feedback; the web has only duration-based vibration. */
export function keyboardTap() {
  if (typeof window === 'undefined') return;
  const host = window as HapticsWindow;
  try {
    if (host.GravityHaptics) { host.GravityHaptics.postMessage('key-tap'); return; }
    if (host.webkit?.messageHandlers?.gravityHaptics) { host.webkit.messageHandlers.gravityHaptics.postMessage('key-tap'); return; }
    if (typeof navigator.vibrate === 'function') navigator.vibrate(8);
  } catch { /* Unsupported or disabled feedback must never interrupt typing. */ }
}
