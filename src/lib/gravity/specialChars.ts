import type { GravityTerm } from './types';

/** Collect visible non-ASCII-letter/digit characters from the requested answer side.
 * Grapheme segmentation keeps accented letters and joined emoji intact.
 * Whitespace and invisible control/format characters are not useful keys.
 */
const graphemes = new Intl.Segmenter(undefined, { granularity: 'grapheme' });

/** base letter for sorting: "é" -> "e", "Š" -> "s", "ß" -> "ß" */
function baseLetter(ch: string): string {
  return ch.normalize('NFD').replace(/\p{M}/gu, '').toLowerCase();
}

export function collectSpecialChars(terms: GravityTerm[], answerSide: 'word' | 'definition' | 'random'): string[] {
  const seen = new Set<string>();
  for (const term of terms) {
    for (const text of (answerSide === 'random' ? [term.word, term.definition] : [term[answerSide]])) {
      if (!text) continue;
      for (const { segment: ch } of graphemes.segment(text.normalize('NFC'))) {
        if (!/^[a-zA-Z0-9\s\p{Cc}\p{Cf}]+$/u.test(ch)) {
          seen.add(ch);
        }
      }
    }
  }
  return Array.from(seen).sort((a, b) => {
    // Keep accented/non-ASCII letters ahead of punctuation and symbols.
    const byKind = Number(/\p{L}/u.test(b)) - Number(/\p{L}/u.test(a));
    if (byKind !== 0) return byKind;
    const byBase = baseLetter(a).localeCompare(baseLetter(b));
    if (byBase !== 0) return byBase;
    // same base letter (e.g. é vs è vs ê): keep a stable, predictable order
    return (a.codePointAt(0) ?? 0) - (b.codePointAt(0) ?? 0);
  });
}
