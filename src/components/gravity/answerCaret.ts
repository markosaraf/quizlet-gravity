/** Mirror textarea wrapping for touch hit-testing (inputMode=none is inconsistent
 * across mobile engines). All offsets remain UTF-16, as required by selectionStart. */
function withCaretPositions<T>(input: HTMLTextAreaElement, read: (positions: { index: number; x: number; y: number; height: number }[]) => T): T {
  const style = getComputedStyle(input);
  const mirror = document.createElement('div');
  for (const property of ['font-family', 'font-size', 'font-weight', 'font-style', 'line-height', 'letter-spacing', 'word-spacing', 'text-align', 'text-indent', 'text-transform', 'tab-size', 'direction', 'padding-top', 'padding-right', 'padding-bottom', 'padding-left', 'border-top-width', 'border-right-width', 'border-bottom-width', 'border-left-width']) {
    mirror.style.setProperty(property, style.getPropertyValue(property));
  }
  Object.assign(mirror.style, {
    position: 'fixed', left: '0', top: '0', width: `${input.offsetWidth}px`,
    boxSizing: 'border-box', borderStyle: 'solid', whiteSpace: 'pre-wrap',
    overflowWrap: 'break-word', visibility: 'hidden', pointerEvents: 'none',
  });
  mirror.setAttribute('aria-hidden', 'true');
  const segments = [...new Intl.Segmenter(undefined, { granularity: 'grapheme' }).segment(input.value)];
  const spans = segments.map(({ segment }) => {
    const span = document.createElement('span');
    span.textContent = segment;
    mirror.append(span);
    return span;
  });
  const end = document.createElement('span');
  end.textContent = '\u200b';
  mirror.append(end);
  document.body.append(mirror);
  try {
    const positions: { index: number; x: number; y: number; height: number }[] = [];
    spans.forEach((span, i) => {
      const rect = span.getBoundingClientRect();
      const { index, segment } = segments[i];
      positions.push({ index, x: rect.left, y: rect.top, height: rect.height });
      // Both sides of a wrap are possible visual positions for the same offset.
      if (segment !== '\n') positions.push({ index: index + segment.length, x: rect.right, y: rect.top, height: rect.height });
    });
    const rect = end.getBoundingClientRect();
    positions.push({ index: input.value.length, x: rect.left, y: rect.top, height: rect.height });
    return read(positions);
  } finally { mirror.remove(); }
}

export function caretAtPoint(input: HTMLTextAreaElement, clientX: number, clientY: number) {
  const rect = input.getBoundingClientRect();
  const x = clientX - rect.left + input.scrollLeft;
  const y = clientY - rect.top + input.scrollTop;
  return withCaretPositions(input, positions => {
    let best = positions[0], distance = Infinity;
    for (const position of positions) {
      const dy = Math.max(position.y - y, y - position.y - position.height, 0);
      const score = dy * 10000 + Math.abs(position.x - x);
      if (score < distance) { best = position; distance = score; }
    }
    return best.index;
  });
}

export function showAnswerCaret(input: HTMLTextAreaElement) {
  if (input.scrollHeight <= input.clientHeight) { input.scrollTop = 0; return; }
  withCaretPositions(input, positions => {
    const caret = positions.find(p => p.index === input.selectionStart);
    if (!caret) return;
    const padding = parseFloat(getComputedStyle(input).paddingTop);
    if (caret.y < input.scrollTop + padding) input.scrollTop = Math.max(0, caret.y - padding);
    else if (caret.y + caret.height > input.scrollTop + input.clientHeight - padding) {
      input.scrollTop = caret.y + caret.height - input.clientHeight + padding;
    }
  });
}

export function moveAnswerCaret(input: HTMLTextAreaElement, steps: number) {
  const boundaries = [...new Intl.Segmenter(undefined, { granularity: 'grapheme' }).segment(input.value)].map(s => s.index);
  boundaries.push(input.value.length);
  const current = steps < 0 ? input.selectionStart : input.selectionEnd;
  let index = boundaries.findIndex(n => n >= current);
  if (index < 0) index = boundaries.length - 1;
  const position = boundaries[Math.max(0, Math.min(boundaries.length - 1, index + steps))];
  input.focus({ preventScroll: true });
  input.setSelectionRange(position, position);
  showAnswerCaret(input);
}
