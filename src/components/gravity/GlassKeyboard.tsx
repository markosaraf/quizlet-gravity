'use client';

import { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import './GlassKeyboard.css';
import { keyboardTap } from './keyboardHaptics';

type Props = {
  inputRef: { current: HTMLTextAreaElement | null };
  mode: 'decimal' | 'text';
  onChange: (value: string) => void;
  onSubmit: () => void;
};

const letters = ['qwertyuiop', 'asdfghjkl', 'zxcvbnm'];
const accents = ['àáâäæèéêë', 'ìíîïòóôöœ', 'ùúûüçñßšž'];

/** Edits the actual game input and calls its submit handler. */
export function GlassKeyboard({ inputRef, mode, onChange, onSubmit }: Props) {
  const [layout, setLayout] = useState<'text' | 'decimal' | 'symbols' | 'accents'>(mode);
  const [shift, setShift] = useState(false);
  const [caps, setCaps] = useState(false);
  const lastShift = useRef(0);
  const panelRef = useRef<HTMLDivElement>(null);
  const repeat = useRef<ReturnType<typeof setInterval> | null>(null);
  const delay = useRef<ReturnType<typeof setTimeout> | null>(null);
  const latestChange = useRef(onChange);
  latestChange.current = onChange;
  useEffect(() => { setLayout(mode); }, [mode]);
  useEffect(() => {
    const panel = panelRef.current;
    if (!panel) return;
    const measure = () => document.documentElement.style.setProperty('--keyboard-height', `${panel.offsetHeight}px`);
    const observer = new ResizeObserver(measure);
    observer.observe(panel); measure();
    return () => observer.disconnect();
  }, []);

  const stopRepeat = () => {
    if (repeat.current) clearInterval(repeat.current);
    if (delay.current) clearTimeout(delay.current);
    repeat.current = null; delay.current = null;
  };
  useEffect(() => stopRepeat, []);

  function edit(text: string, remove = false) {
    const input = inputRef.current;
    if (!input) return;
    let start = input.selectionStart ?? input.value.length;
    const end = input.selectionEnd ?? start;
    if (remove && start === end && start > 0) {
      // Delete one code point (including supplementary-plane characters).
      start -= [...input.value.slice(0, start)].at(-1)?.length ?? 1;
    }
    const next = input.value.slice(0, start) + text + input.value.slice(end);
    // Keep repeated keys accurate even before the next controlled render.
    input.value = next;
    latestChange.current(next);
    input.focus({ preventScroll: true });
    input.setSelectionRange(start + text.length, start + text.length);
    requestAnimationFrame(() => {
      if (inputRef.current === input) input.setSelectionRange(start + text.length, start + text.length);
    });
    if (!caps) setShift(false);
  }
  function key(value: string, label = value, cls = '') {
    return <button type="button" className={`glass-key ${cls}`} key={value} aria-label={label}
      onPointerDown={e => e.preventDefault()} onClick={() => edit(shift || caps ? value.toUpperCase() : value)}>
      {shift || caps ? label.toUpperCase() : label}
    </button>;
  }
  const backspace = (cls = '') => <button type="button" className={`glass-key action ${cls}`} aria-label="Delete"
    onPointerDown={e => {
      e.preventDefault(); e.currentTarget.setPointerCapture(e.pointerId); edit('', true);
      delay.current = setTimeout(() => { repeat.current = setInterval(() => edit('', true), 75); }, 400);
    }} onPointerUp={stopRepeat} onPointerCancel={stopRepeat} onLostPointerCapture={stopRepeat}
    onClick={e => { if (e.detail === 0) edit('', true); }}>
    <svg viewBox="0 0 28 22" aria-hidden="true"><path d="M10 2H24Q26 2 26 4V18Q26 20 24 20H10L2 11Z M13 7L21 15 M21 7L13 15"/></svg>
  </button>;
  const submit = (cls = '') => <button type="button" className={`glass-key submit ${cls}`} aria-label="Submit answer"
    onPointerDown={e => e.preventDefault()} onClick={() => {
      onSubmit(); inputRef.current?.focus({ preventScroll: true });
    }}><svg viewBox="0 0 28 22" aria-hidden="true"><path d="M24 3V10Q24 13 21 13H4 M10 7L4 13L10 19"/></svg><span>enter</span></button>;
  const switcher = (to: typeof layout, label: string, cls = '') => <button type="button" className={`glass-key action label ${cls}`}
    onPointerDown={e => e.preventDefault()} onClick={() => setLayout(to)}>{label}</button>;

  return createPortal(<div ref={panelRef} className={`glass-keyboard ${layout === 'decimal' ? 'numeric' : 'alphabetic'}`} role="group" aria-label="Transparent game keyboard"
    onPointerDownCapture={e => { if ((e.target as Element).closest('button')) keyboardTap(); }}
    onClickCapture={e => { if (e.detail === 0 && (e.target as Element).closest('button')) keyboardTap(); }}>
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
            onPointerDown={e => e.preventDefault()} onClick={() => {
              const now = Date.now();
              if (now - lastShift.current < 350) { setCaps(true); setShift(true); }
              else { setCaps(false); setShift(s => !s); }
              lastShift.current = now;
            }}>⇧</button>}
          {[...row].map(char => key(char))}
          {((layout !== 'accents' && i === 2) || (layout === 'accents' && i === accents.length - 1)) && backspace()}
        </div>)}
      <div className="key-row bottom-row">
        {switcher('decimal', '123')}
        {switcher(layout === 'symbols' ? 'text' : 'symbols', layout === 'symbols' ? 'ABC' : '#+=', 'symbol-switch')}
        {switcher(layout === 'accents' ? 'text' : 'accents', layout === 'accents' ? 'ABC' : 'é', 'accent-switch')}
        {key(' ', 'space', 'space label')}{submit()}
      </div>
    </div>}

  </div>, document.body);
}
