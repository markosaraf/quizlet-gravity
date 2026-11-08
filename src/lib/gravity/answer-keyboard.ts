import type { GravityTerm, LiveTerms } from './types';

/** Request the number keyboard without restricting mixed answers to a number type. */
export function answerInputMode(answer: string): 'decimal' | 'text' {
  return /^\p{Decimal_Number}/u.test(answer.trimStart()) ? 'decimal' : 'text';
}

/** The oldest falling asteroid is the next one to reach the planet. */
export function nextAnswer(liveTerms: LiveTerms, terms: Record<string, GravityTerm>): string {
  for (const live of Object.values(liveTerms)) {
    const term = terms[live.luid];
    if (!term) continue;
    const answer = live.side === 'word' ? term.definition : term.word;
    if (answer.trim()) return answer;
  }
  return '';
}
