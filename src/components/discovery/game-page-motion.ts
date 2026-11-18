/** Use the same eased motion on WebKit, Chromium and desktop browsers.
 * Suspend snap while animating so it cannot jump to the destination mid-frame.
 * Native touch/trackpad scrolling keeps its normal snap behavior afterwards.
 */
export function animateGamePage(
  gallery: HTMLElement,
  search: HTMLElement,
  page: number,
  onFinish: () => void,
): () => void {
  const startX = gallery.scrollLeft;
  const endX = Math.min(page * gallery.clientWidth, gallery.scrollWidth - gallery.clientWidth);
  const startY = window.scrollY;
  const mobile = window.matchMedia('(max-width: 760px), (hover: none) and (pointer: coarse)').matches;
  const endY = mobile ? Math.max(0, Math.min(
    startY + search.getBoundingClientRect().top - 12,
    document.documentElement.scrollHeight - window.innerHeight,
  )) : 0;
  const snap = gallery.style.scrollSnapType;
  gallery.style.scrollSnapType = 'none';
  let frame = 0;
  let finished = false;
  function finish() {
    if (finished) return;
    finished = true;
    cancelAnimationFrame(frame);
    gallery.style.scrollSnapType = snap;
    window.removeEventListener('wheel', finish);
    window.removeEventListener('touchstart', finish);
    onFinish();
  }
  window.addEventListener('wheel', finish, {passive: true});
  window.addEventListener('touchstart', finish, {passive: true});
  const duration = window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 0 : 650;
  const started = performance.now();
  function step(now: number) {
    const progress = duration ? Math.min((now - started) / duration, 1) : 1;
    // Smooth acceleration and deceleration, with no abrupt start or stop.
    const eased = progress * progress * progress * (progress * (progress * 6 - 15) + 10);
    gallery.scrollTo({left: startX + (endX - startX) * eased, behavior: 'instant'});
    window.scrollTo({top: startY + (endY - startY) * eased, behavior: 'instant'});
    if (progress < 1) frame = requestAnimationFrame(step);
    else finish();
  }
  frame = requestAnimationFrame(step);
  return finish;
}
