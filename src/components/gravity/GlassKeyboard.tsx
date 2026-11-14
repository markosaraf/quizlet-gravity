'use client';

import { useEffect, useLayoutEffect, useRef, useState, type MouseEvent, type PointerEvent } from 'react';
import { createPortal, flushSync } from 'react-dom';
import './GlassKeyboard.css';
import { SpecialCharBar } from './SpecialCharBar';
import { keyboardTap } from './keyboardHaptics';
import { caretAtPoint, moveAnswerCaret, showAnswerCaret } from './answerCaret';

type Props = {
  inputRef: { current: HTMLTextAreaElement | null };
  mode: 'decimal' | 'text';
  specialChars: string[];
  onChange: (value: string) => void;
  onSubmit: () => void;
};

const letters = ['qwertyuiop', 'asdfghjkl', 'zxcvbnm'];
const accents = ['àáâäæèéêë', 'ìíîïòóôöœ', 'ùúûüçñßšž'];

/** Edits the actual game input and calls its submit handler. */
export function GlassKeyboard({ inputRef, mode, specialChars, onChange, onSubmit }: Props) {
  const [layout, setLayout] = useState<'text' | 'decimal' | 'symbols' | 'accents'>(mode);
  const [shift, setShift] = useState(false);
  const [caps, setCaps] = useState(false);
  const lastShift = useRef(0);
  const panelRef = useRef<HTMLDivElement>(null);
  const repeat = useRef<ReturnType<typeof setInterval> | null>(null);
  const delay = useRef<ReturnType<typeof setTimeout> | null>(null);
  const deletePointer = useRef<number | null>(null);
  const caretFrame = useRef<number | null>(null);
  const spaceGesture = useRef<{ id: number; x: number; active: boolean; timer: ReturnType<typeof setTimeout> } | null>(null);
  const [movingCaret, setMovingCaret] = useState(false);
  const latestChange = useRef(onChange);
  latestChange.current = onChange;
  useEffect(() => { setLayout(mode); }, [mode]);
  function resizeAnswer() {
    const input = inputRef.current;
    if (!input) return;
    const style = getComputedStyle(input);
    const minimum = parseFloat(style.minHeight);
    const borders = parseFloat(style.borderTopWidth) + parseFloat(style.borderBottomWidth);
    const padding = parseFloat(style.paddingTop) + parseFloat(style.paddingBottom);
    const available = window.innerHeight - (panelRef.current?.offsetHeight ?? 250) - 100 - (specialChars.length ? 50 : 0);
    const maximum = Math.max(minimum, Math.min(5 * parseFloat(style.lineHeight) + padding + borders, available));
    const scroll = input.scrollTop;
    input.style.height = '0px';
    input.style.height = `${Math.max(minimum, Math.min(input.scrollHeight + borders, maximum))}px`;
    input.scrollTop = scroll;
    document.documentElement.style.setProperty('--answer-height', `${input.offsetHeight}px`);
  }
  useLayoutEffect(() => { resizeAnswer(); });
  useEffect(() => {
    const panel = panelRef.current;
    if (!panel) return;
    const measure = () => {
      document.documentElement.style.setProperty('--keyboard-height', `${panel.offsetHeight}px`);
      resizeAnswer();
    };
    const observer = new ResizeObserver(measure);
    observer.observe(panel); measure();
    window.addEventListener('resize', measure);
    return () => { observer.disconnect(); window.removeEventListener('resize', measure); };
  }, [specialChars.length]);

  useEffect(() => {
    const input = inputRef.current;
    if (!input) return;
    let touch: { id: number; x: number; y: number; time: number } | null = null;
    const down = (event: globalThis.PointerEvent) => {
      if (event.pointerType === 'mouse') return;
      if (caretFrame.current !== null) { cancelAnimationFrame(caretFrame.current); caretFrame.current = null; }
      touch = { id: event.pointerId, x: event.clientX, y: event.clientY, time: Date.now() };
    };
    const up = (event: globalThis.PointerEvent) => {
      const start = touch; touch = null;
      if (!start || start.id !== event.pointerId || Date.now() - start.time > 500 || Math.hypot(event.clientX - start.x, event.clientY - start.y) > 10) return;
      const position = caretAtPoint(input, event.clientX, event.clientY);
      input.focus({ preventScroll: true });
      input.setSelectionRange(position, position);
      // Apply after the browser's native tap selection, which may otherwise
      // move inputMode=none fields to the end on mobile.
      caretFrame.current = requestAnimationFrame(() => {
        caretFrame.current = null;
        input.focus({ preventScroll: true });
        input.setSelectionRange(position, position);
        showAnswerCaret(input);
      });
    };
    const cancel = () => { touch = null; };
    input.addEventListener('pointerdown', down);
    input.addEventListener('pointerup', up);
    input.addEventListener('pointercancel', cancel);
    return () => {
      input.style.removeProperty('height');
      input.removeEventListener('pointerdown', down);
      input.removeEventListener('pointerup', up);
      input.removeEventListener('pointercancel', cancel);
    };
  }, [inputRef]);

  const stopRepeat = () => {
    if (repeat.current) clearInterval(repeat.current);
    if (delay.current) clearTimeout(delay.current);
    repeat.current = null; delay.current = null;
    deletePointer.current = null;
  };
  useEffect(() => () => {
    stopRepeat();
    if (spaceGesture.current) clearTimeout(spaceGesture.current.timer);
    if (caretFrame.current !== null) cancelAnimationFrame(caretFrame.current);
  }, []);

  // Overlapping fingers do not reliably generate clicks. Accept every pointer
  // on contact, including non-primary touches, and ignore its later click.
  // Zero-detail clicks retain keyboard and assistive-technology activation.
  function press(action: () => void) {
    return {
      onPointerDown: (event: PointerEvent<HTMLButtonElement>) => {
        if (event.button !== 0) return;
        event.preventDefault();
        action();
      },
      onClick: (event: MouseEvent<HTMLButtonElement>) => {
        if (event.detail === 0) action();
      },
    };
  }
  function releaseDelete(event: PointerEvent<HTMLButtonElement>) {
    if (event.pointerId === deletePointer.current) stopRepeat();
  }

  function edit(text: string, remove = false) {
    // A second thumb may land on a letter before space is released. Commit
    // that pending tap first so quick typing preserves character order.
    const space = spaceGesture.current;
    if (space) {
      clearTimeout(space.timer); spaceGesture.current = null; setMovingCaret(false);
      if (!space.active) edit(' ');
    }
    const input = inputRef.current;
    if (!input) return;
    let start = input.selectionStart ?? input.value.length;
    const end = input.selectionEnd ?? start;
    if (remove && start === end && start > 0) {
      // Delete one code point (including supplementary-plane characters).
      start -= [...input.value.slice(0, start)].at(-1)?.length ?? 1;
    }
    const next = input.value.slice(0, start) + text + input.value.slice(end);
    // Commit the controlled value before another finger, paste, or selection
    // event arrives. A deferred copy-answer render can restore stale text.
    flushSync(() => latestChange.current(next));
    input.focus({ preventScroll: true });
    input.setSelectionRange(start + text.length, start + text.length);
    resizeAnswer();
    showAnswerCaret(input);
    if (caretFrame.current !== null) cancelAnimationFrame(caretFrame.current);
    caretFrame.current = requestAnimationFrame(() => {
      caretFrame.current = null;
      if (inputRef.current === input && input.value === next) {
        input.setSelectionRange(start + text.length, start + text.length);
        showAnswerCaret(input);
      }
    });
    if (!caps) setShift(false);
  }
  function endSpace(event: PointerEvent<HTMLButtonElement>, cancelled = false) {
    const gesture = spaceGesture.current;
    if (!gesture || event.pointerId !== gesture.id) return;
    clearTimeout(gesture.timer);
    spaceGesture.current = null;
    setMovingCaret(false);
    if (!cancelled && !gesture.active) edit(' ');
  }
  const spacebar = <button type="button" className={`glass-key space label${movingCaret ? ' selected' : ''}`} aria-label="space"
    title="Hold and slide to move the cursor"
    onPointerDown={event => {
      if (event.button !== 0 || spaceGesture.current) return;
      event.preventDefault();
      event.currentTarget.setPointerCapture(event.pointerId);
      if (caretFrame.current !== null) { cancelAnimationFrame(caretFrame.current); caretFrame.current = null; }
      spaceGesture.current = { id: event.pointerId, x: event.clientX, active: false, timer: setTimeout(() => {
        if (spaceGesture.current) { spaceGesture.current.active = true; setMovingCaret(true); keyboardTap(); }
      }, 300) };
    }}
    onPointerMove={event => {
      const gesture = spaceGesture.current;
      if (!gesture || event.pointerId !== gesture.id) return;
      const steps = Math.trunc((event.clientX - gesture.x) / 12);
      if (!steps) return;
      // Sliding can engage immediately; a stationary long press arms it too.
      gesture.active = true; clearTimeout(gesture.timer); setMovingCaret(true);
      gesture.x += steps * 12;
      if (inputRef.current) moveAnswerCaret(inputRef.current, steps);
    }}
    onPointerUp={event => endSpace(event)} onPointerCancel={event => endSpace(event, true)}
    onLostPointerCapture={event => endSpace(event, true)}
    onClick={event => { if (event.detail === 0) edit(' '); }}>
    {movingCaret ? '← cursor →' : 'space'}
  </button>;
  function key(value: string, label = value, cls = '') {
    return <button type="button" className={`glass-key ${cls}`} key={value} aria-label={label}
      {...press(() => edit(shift || caps ? value.toUpperCase() : value))}>
      {shift || caps ? label.toUpperCase() : label}
    </button>;
  }
  const backspace = (cls = '') => <button type="button" className={`glass-key action ${cls}`} aria-label="Delete"
    onPointerDown={e => {
      if (e.button !== 0) return;
      stopRepeat();
      deletePointer.current = e.pointerId;
      e.preventDefault(); e.currentTarget.setPointerCapture(e.pointerId); edit('', true);
      delay.current = setTimeout(() => { repeat.current = setInterval(() => edit('', true), 75); }, 400);
    }} onPointerUp={releaseDelete} onPointerCancel={releaseDelete} onLostPointerCapture={releaseDelete}
    onClick={e => { if (e.detail === 0) edit('', true); }}>
    <svg viewBox="0 0 28 22" aria-hidden="true"><path d="M10 2H24Q26 2 26 4V18Q26 20 24 20H10L2 11Z M13 7L21 15 M21 7L13 15"/></svg>
  </button>;
  const submit = (cls = '') => <button type="button" className={`glass-key submit ${cls}`} aria-label="Submit answer"
    {...press(() => {
      onSubmit(); inputRef.current?.focus({ preventScroll: true });
    })}><svg viewBox="0 0 28 22" aria-hidden="true"><path d="M24 3V10Q24 13 21 13H4 M10 7L4 13L10 19"/></svg><span>enter</span></button>;
  const switcher = (to: typeof layout, label: string, cls = '') => <button type="button" className={`glass-key action label ${cls}`}
    {...press(() => setLayout(to))}>{label}</button>;

  return createPortal(<div ref={panelRef} className={`glass-keyboard ${layout === 'decimal' ? 'numeric' : 'alphabetic'}`} role="group" aria-label="Transparent game keyboard"
    onPointerDownCapture={e => { if ((e.target as Element).closest('button')) keyboardTap(); }}
    onClickCapture={e => { if (e.detail === 0 && (e.target as Element).closest('button')) keyboardTap(); }}>
    {specialChars.length > 0 && <div className="glass-special-characters"><SpecialCharBar chars={specialChars} onInsert={char => edit(char)} /></div>}
    {layout === 'decimal' ? <div className="number-grid">
      {key('7')}{key('8')}{key('9')}{backspace('num-delete')}
      {key('4')}{key('5')}{key('6')}{key('-', '−', 'num-minus')}
      {key('1')}{key('2')}{key('3')}{submit('num-submit')}
      {switcher('text', 'ABC', 'num-abc')}{key('0')}{key('.', '.', 'num-dot')}
      <div className="number-extras">{key(',')}{key('/')}{key(' ' , 'space', 'label')}</div>
    </div> : <div className="letter-grid">
      {(layout === 'text' ? letters : layout === 'symbols' ? ['1234567890', '-/:;()€&@"', '.,?!\''] : accents.map(row => row)).map((row, i) =>
        <div className={`key-row row-${i}`} key={i}>
          {layout === 'text' && i === 2 && <button type="button" className={`glass-key action shift ${shift || caps ? 'selected' : ''}`} aria-label={caps ? 'Caps lock on' : 'Shift'}
            {...press(() => {
              const now = Date.now();
              if (now - lastShift.current < 350) { setCaps(true); setShift(true); }
              else { setCaps(false); setShift(s => !s); }
              lastShift.current = now;
            })}>⇧</button>}
          {[...row].map(char => key(char))}
          {((layout !== 'accents' && i === 2) || (layout === 'accents' && i === accents.length - 1)) && backspace()}
        </div>)}
      <div className="key-row bottom-row">
        {switcher('decimal', '123')}
        {switcher(layout === 'symbols' ? 'text' : 'symbols', layout === 'symbols' ? 'ABC' : '#+=', 'symbol-switch')}
        {switcher(layout === 'accents' ? 'text' : 'accents', layout === 'accents' ? 'ABC' : 'é', 'accent-switch')}
        {spacebar}{submit()}
      </div>
    </div>}

  </div>, document.body);
}
