import { memo, useEffect, useRef, useState } from 'react';
import { COPY_SUBMIT_DEBOUNCE, COPY_SUBMIT_INITIAL_DELAY, COPY_FOCUS_DELAY } from '@/lib/gravity/constants';
import { answerInputMode } from '@/lib/gravity/answer-keyboard';
import { STRINGS } from '@/lib/gravity/strings';
import type { GravityTerm } from '@/lib/gravity/types';

/** see TypingPrompt.tsx — inserter published through a ref so the shared
    special-character squares can route clicks to the active field */
type CharInserter = (char: string) => void;

interface Props {
  term: GravityTerm;
  showingSide: 'word' | 'definition';
  previouslyTypedText: string;
  /** this field publishes its inserter here so the special-character
      squares (which rest above the MAIN typing field, unmoving) can
      insert into this field while the copy view is open */
  insertRef: { current: CharInserter | null };
  onSubmit: (liveTermId: string, answer: string, acknowledgeImage?: boolean) => void;
  liveTermId: string;
}

function CopyTermViewBase({
  term,
  showingSide,
  previouslyTypedText,
  insertRef,
  onSubmit,
  liveTermId,
}: Props) {
  const promptImage = showingSide === 'word' ? term._wordImageUrl : term._imageUrl;
  const answerImage = showingSide === 'word' ? term._imageUrl : term._wordImageUrl;
  const answerText = showingSide === 'word' ? term.definition : term.word;
  const imageOnlyAnswer = !answerText.trim() && !!answerImage;
  const [inputValue, setInputValue] = useState(previouslyTypedText);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const submitTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  // caret to restore after a special-char button insertion
  const pendingCaretRef = useRef<number | null>(null);

  useEffect(() => {
    const t = setTimeout(() => {
      // preventScroll: no mobile auto-scroll-to-input jump when the modal opens
      inputRef.current?.focus({ preventScroll: true });
      // place caret at end
      const el = inputRef.current;
      if (el) el.setSelectionRange(el.value.length, el.value.length);
    }, COPY_FOCUS_DELAY);
    return () => clearTimeout(t);
  }, []);

  useEffect(() => {
    if (imageOnlyAnswer) return;
    // initial auto-submit of the previously typed text (original behavior)
    submitTimer.current = setTimeout(() => {
      onSubmit(liveTermId, previouslyTypedText);
    }, COPY_SUBMIT_INITIAL_DELAY);
    return () => {
      if (submitTimer.current) clearTimeout(submitTimer.current);
    };
  }, [liveTermId, onSubmit, previouslyTypedText, imageOnlyAnswer]);

  useEffect(() => {
    const focus = () => {
      if (!document.hidden) inputRef.current?.focus({ preventScroll: true });
    };
    window.addEventListener('focus', focus);
    document.addEventListener('visibilitychange', focus);
    return () => {
      window.removeEventListener('focus', focus);
      document.removeEventListener('visibilitychange', focus);
    };
  }, []);

  // restore the caret after a special-character insertion
  useEffect(() => {
    if (pendingCaretRef.current === null) return;
    const pos = pendingCaretRef.current;
    pendingCaretRef.current = null;
    const el = inputRef.current;
    if (el) {
      el.setSelectionRange(pos, pos);
      el.focus({ preventScroll: true });
    }
  }, [inputValue]);

  const scheduleSubmit = (value: string) => {
    if (submitTimer.current) clearTimeout(submitTimer.current);
    submitTimer.current = setTimeout(() => {
      onSubmit(liveTermId, value);
    }, COPY_SUBMIT_DEBOUNCE);
  };

  /** insert a special character at the caret (replacing any selection) */
  const insertSpecialChar = (char: string) => {
    const el = inputRef.current;
    if (!el) return;
    const start = el.selectionStart ?? el.value.length;
    const end = el.selectionEnd ?? start;
    const next = el.value.slice(0, start) + char + el.value.slice(end);
    pendingCaretRef.current = start + char.length;
    setInputValue(next);
    scheduleSubmit(next);
  };

  // publish this field's inserter (re-registered on every render so the
  // closure never goes stale; cleared again when this view unmounts)
  useEffect(() => {
    insertRef.current = insertSpecialChar;
    return () => {
      insertRef.current = null;
    };
  });

  // original: prompt section shows the side that was falling,
  // answer section shows the other side
  const promptSideContent =
    showingSide === 'word' ? term.word : term.definition;
  const answerSideContent =
    showingSide === 'word' ? term.definition : term.word;

  return (
    <div className="GravityCopyTermView">
      <div className="GravityCopyTermView-inner">
        <div className="GravityCopyTermView-heading">
          {STRINGS.copy_answer_modal.prompt}
        </div>
        <div className="GravityCopyTermView-prompt">
          <div className="GravityCopyTermView-promptText">{promptSideContent}</div>
          {promptImage ? (
            <img
              alt={term.definition}
              className="GravityCopyTermView-definitionImage"
              src={promptImage}
            />
          ) : null}
        </div>
        <div className="GravityCopyTermView-heading">
          {STRINGS.copy_answer_modal.correct_answer}
        </div>
        <div className="GravityCopyTermView-answer">
          <div>{answerSideContent}</div>
          {answerImage && <img className="GravityCopyTermView-definitionImage" src={answerImage} alt="Correct answer image"/>}
        </div>
        <div className="GravityCopyTermView-inputWrapper">
          {/* NOTE: intentionally NO special-character squares here — they
              always rest in the same place above the main typing field at
              the bottom and route their clicks into this field instead of
              moving to the top with the copy view. */}
          <textarea
            ref={inputRef}
            autoCapitalize="none"
            autoComplete="off"
            autoCorrect="off"
            className="GravityCopyTermView-input"
            rows={1}
            inputMode={answerInputMode(answerText)}
            spellCheck={false}
            value={imageOnlyAnswer ? "" : inputValue}
            readOnly={imageOnlyAnswer}
            aria-label={imageOnlyAnswer ? "Review the image, then continue" : "Type the correct answer"}
            placeholder={imageOnlyAnswer ? "Review the image" : STRINGS.copy_answer_modal.placeholder}
            onChange={(e) => {
              const v = e.currentTarget.value;
              setInputValue(v);
              scheduleSubmit(v);
            }}
            onKeyDown={(e) => {
              if (e.key === 'Enter') e.preventDefault();
            }}
          />
          {imageOnlyAnswer && <button className="UIButton UIButton--hero" onClick={()=>onSubmit(liveTermId,"",true)}>Continue</button>}
        </div>
      </div>
    </div>
  );
}

export const CopyTermView = memo(CopyTermViewBase);
