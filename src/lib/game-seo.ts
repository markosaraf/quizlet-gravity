import { sharedSetPath } from './community/set-links';
export const SITE_URL = 'https://www.quizletgravity.com';
export const SITEMAP_PAGE_SIZE = 1000;
export type PublicGame = { public_id: string; title: string; source_url?: string | null; term_count: number };
export function gameUrl(game: Pick<PublicGame, 'public_id' | 'title' | 'source_url'>) {
 return new URL(sharedSetPath(game), SITE_URL).href;
}
export function gameDescription(game: PublicGame) {
 return `Practice ${game.title} with ${game.term_count} flashcards in Quizlet Gravity. Learn by playing, share the game with friends and compete on the leaderboard.`;
}
export function xmlEscape(value: string) {
 return value.replace(/[<>&"']/g, c => ({'<':'&lt;','>':'&gt;','&':'&amp;','"':'&quot;',"'":'&apos;'}[c]!));
}
