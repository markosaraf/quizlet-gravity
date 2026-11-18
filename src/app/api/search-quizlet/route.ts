import {NextRequest, NextResponse} from 'next/server';
import {unstable_cache} from 'next/cache';
import {communitySettings} from '@/lib/community/settings';
import {auth} from '@/lib/community/auth';
import {ImportGuard} from '@/lib/gravity/quizlet-import-guard';
import {discoverQuizletSets, QuizletMapError} from '@/lib/gravity/quizlet-map';
import {creatorUsername, discoverQuizletCreator} from '@/lib/gravity/quizlet-creator';

export const runtime = 'nodejs';
export const maxDuration = 60;
const guard = new ImportGuard();
const json = (data: unknown, status = 200) => NextResponse.json(data, {status, headers: {
  'Cache-Control': 'no-store', ...(status === 429 ? {'Retry-After': '60'} : {}),
}});

export async function POST(request: NextRequest) {
  if (request.headers.get('sec-fetch-site') === 'cross-site' || request.headers.get('origin') !== request.nextUrl.origin)
    return json({error: 'Open this search on Quizlet Gravity.'}, 403);
  if (!(await communitySettings()).quizletSearchEnabled) return json({error: 'Quizlet search is currently disabled. Paste a set link to import it.'}, 403);
  const session = await auth.api.getSession({headers: request.headers});
  if (!session) return json({error: 'Choose a guest name or sign in to search Quizlet.'}, 401);
  if (!session.user.isAnonymous && !session.user.emailVerified) return json({error: 'Confirm your email before searching.'}, 403);
  if (!request.headers.get('content-type')?.startsWith('application/json')) return json({error: 'Send JSON.'}, 415);
  const reader = request.body?.getReader();
  if (!reader) return json({error: 'Enter a title or creator.'}, 400);
  let text = '', bytes = 0;
  const decoder = new TextDecoder();
  try {
    while (true) {
      const {done, value} = await reader.read();
      if (done) break;
      bytes += value.byteLength;
      if (bytes > 2048) { await reader.cancel(); return json({error: 'Request too large.'}, 413); }
      text += decoder.decode(value, {stream: true});
    }
  } finally { reader.releaseLock(); }
  let input;
  try { input = JSON.parse(text + decoder.decode()); }
  catch { return json({error: 'Send valid JSON.'}, 400); }
  try {
    if (!input || !['title', 'creator'].includes(input.mode) || typeof input.query !== 'string' || !input.query.trim() || input.query.length > 120 || /[\u0000-\u001f]/.test(input.query))
      return json({error: 'Enter a title or creator of up to 120 characters.'}, 400);
    const query = input.mode === 'creator' ? creatorUsername(input.query) : input.query.trim();
    if (!guard.allow(session.user.id)) return json({error: 'Please wait a minute before searching again.'}, 429);
    // Reuse the administrator's public discovery functions and shared caches.
    // Private Quizlet connections and bulk importing stay administrator-only.
    const task = guard.run(JSON.stringify([input.mode, query]), () => input.mode === 'creator'
      ? unstable_cache(() => discoverQuizletCreator(query), ['quizlet-creator-v3', query.toLowerCase()], {revalidate: 300})()
      : unstable_cache(() => discoverQuizletSets({topic: query, limit: 100}), ['quizlet-map-v1', query, '100'], {revalidate: 300})());
    if (!task) return json({error: 'Search is busy. Please try again in a moment.'}, 429);
    return json(await task);
  } catch (error) {
    return json({error: error instanceof QuizletMapError ? error.message : 'Could not search Quizlet. Please try again.'}, error instanceof QuizletMapError ? error.status : 500);
  }
}
