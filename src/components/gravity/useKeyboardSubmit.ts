import { useLayoutEffect, useRef } from 'react';

/** iOS software keyboards may send beforeinput without an Enter keydown. */
export function useKeyboardSubmit(
  inputRef: { current: HTMLTextAreaElement | null },
  active: boolean,
  onSubmit: () => void,
) {
  const submitRef = useRef(onSubmit);
  submitRef.current = onSubmit;
  useLayoutEffect(() => {
    const input = inputRef.current;
    if (!input || !active) return;
    const submit = (event: Event) => {
      const e = event as InputEvent;
      if (e.isComposing || (e.inputType !== 'insertLineBreak' && e.inputType !== 'insertParagraph')) return;
      e.preventDefault();
      if (input.value.trim()) submitRef.current();
    };
    const dismissed = () => {
      if (input.inputMode !== 'decimal' && input.inputMode !== 'numeric') return;
      if (input.dataset.keyboardSwitching === 'true') return;
      if (input.value.trim()) submitRef.current();
      input.focus({ preventScroll: true });
    };
    input.addEventListener('beforeinput', submit);
    input.addEventListener('gravity-keyboard-dismiss', dismissed);
    return () => {
      input.removeEventListener('beforeinput', submit);
      input.removeEventListener('gravity-keyboard-dismiss', dismissed);
    };
  }, [inputRef, active]);
}
