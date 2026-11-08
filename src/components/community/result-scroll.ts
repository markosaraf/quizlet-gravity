/** Reveal the player's result without scrolling the Congratulations heading away. */
export function revealResultRow(section: HTMLElement) {
  if (!window.matchMedia('(max-width: 767px)').matches) return;
  const modal = section.closest<HTMLElement>('.GravityUIModal');
  const heading = modal?.querySelector<HTMLElement>('.GravityUIHeading');
  const row = section.querySelector<HTMLElement>('[aria-current="true"]');
  if (!modal || !heading || !row) return;

  const viewport = window.visualViewport;
  const top = viewport?.offsetTop ?? 0;
  const bottom = top + (viewport?.height ?? window.innerHeight);
  // Handle both the app's scrolling modal and the website's document scrolling.
  for (let parent: HTMLElement | null = row.parentElement; parent; parent = parent.parentElement) {
    const isDocument = parent === document.scrollingElement;
    if (!isDocument && !/(auto|scroll)/.test(getComputedStyle(parent).overflowY)) continue;
    const bounds = parent.getBoundingClientRect();
    const visibleTop = isDocument ? top : Math.max(top, bounds.top + parent.clientTop);
    const visibleBottom = isDocument ? bottom : Math.min(bottom, bounds.top + parent.clientTop + parent.clientHeight);
    const needed = Math.max(0, row.getBoundingClientRect().bottom + 12 - visibleBottom);
    const headingAllowance = Math.max(0, heading.getBoundingClientRect().top - visibleTop - 8);
    const remaining = Math.max(0, parent.scrollHeight - parent.clientHeight - parent.scrollTop);
    const distance = Math.min(needed, headingAllowance, remaining);
    if (distance > 0) parent.scrollTo({top: parent.scrollTop + distance, behavior: 'instant'});
  }
}
