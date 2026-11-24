'use client';

import {useSyncExternalStore} from 'react';
import {usePathname} from 'next/navigation';
import './AppInstallBanner.css';

const dismissalKey = 'gravity-app-install-dismissed-v1';
const dismissalEvent = 'gravity-app-install-dismissed';
let dismissedInMemory = false;

// Add the public Google Play listing here when it is available. Do not advertise
// the closed-test listing to visitors who cannot install it.
const stores = [{
  id: 'apple',
  href: 'https://apps.apple.com/app/id6831804079',
  badge: '/store-badges/app-store.svg',
  label: 'Get Apple app — Download on the App Store',
}] as const;

function subscribe(callback: () => void) {
  window.addEventListener('storage', callback);
  window.addEventListener(dismissalEvent, callback);
  return () => {
    window.removeEventListener('storage', callback);
    window.removeEventListener(dismissalEvent, callback);
  };
}

function shouldShow() {
  const ua = navigator.userAgent;
  if (/QuizletGravityApp/i.test(ua) || dismissedInMemory) return false;
  const appleDevice = /iPhone|iPad|iPod|Macintosh/i.test(ua);
  if (!appleDevice) return false;
  const mobileApple = /iPhone|iPad|iPod/i.test(ua) || (/Macintosh/i.test(ua) && navigator.maxTouchPoints > 1);
  // Safari on iPhone/iPad supplies the real Smart App Banner, including its own
  // dismissal and installed-app detection. Never stack our fallback on it.
  const safari = /Version\/.*Safari\//.test(ua) && !/CriOS|FxiOS|EdgiOS|OPiOS|Chrome|Chromium|Edg\//.test(ua);
  if (mobileApple && safari) return false;
  try { return localStorage.getItem(dismissalKey) !== '1'; }
  catch { return true; }
}

export function AppInstallBanner() {
  const visible = useSyncExternalStore(subscribe, shouldShow, () => false);
  const pathname = usePathname();
  if (!visible || /^\/(admin|native|native-auth|native-return|notifications|reset-password|delete-account|email-confirmed|welcome)(\/|$)/.test(pathname)) return null;

  function dismiss() {
    dismissedInMemory = true;
    try { localStorage.setItem(dismissalKey, '1'); } catch { /* Still dismiss in this visit. */ }
    window.dispatchEvent(new Event(dismissalEvent));
  }

  return <aside className="community-app-install" aria-label="Get the Quizlet Gravity app">
    <button type="button" className="community-app-install-close" aria-label="Dismiss app banner" onClick={dismiss}>
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true"><path d="m6 6 12 12M18 6 6 18"/></svg>
    </button>
    <img className="community-app-install-icon" src="/apple-icon.png?v=20261113-original-thick" alt="" width={48} height={48}/>
    <div className="community-app-install-copy"><strong>Quizlet Gravity</strong><span>For iPhone, iPad and Mac</span></div>
    <div className="community-app-install-stores">
      {stores.map(store => <a key={store.id} href={store.href} aria-label={store.label}>
        <img src={store.badge} alt="Download on the App Store" width={120} height={40}/>
      </a>)}
    </div>
  </aside>;
}
