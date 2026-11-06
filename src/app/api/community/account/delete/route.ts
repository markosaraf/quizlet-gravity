import { createHash } from 'node:crypto';
import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/community/auth';
import { db } from '@/lib/community/db';
import { AccountDeletionError, deleteOwnAccount } from '@/lib/community/delete-account';
export const runtime = 'nodejs';
const json = (data: unknown, status = 200) => NextResponse.json(data, { status, headers: { 'Cache-Control': 'no-store' } });

export async function POST(request: NextRequest) {
  if (request.headers.get('origin') !== request.nextUrl.origin || request.headers.get('sec-fetch-site') === 'cross-site') return json({ error: 'Origin not allowed.' }, 403);
  try {
    const session = await auth.api.getSession({ headers: request.headers });
    if (!session) return json({ error: 'Sign in first.' }, 401);
    const key = createHash('sha256').update('delete-account:' + session.user.id).digest('hex');
    const { rows } = await db.query(`INSERT INTO api_limits(key,count,expires_at) VALUES($1,1,now()+interval '1 minute') ON CONFLICT(key) DO UPDATE SET count=CASE WHEN api_limits.expires_at<now() THEN 1 ELSE api_limits.count+1 END,expires_at=CASE WHEN api_limits.expires_at<now() THEN now()+interval '1 minute' ELSE api_limits.expires_at END RETURNING count`, [key]);
    if (rows[0].count > 5) return json({ error: 'Please wait a minute before trying again.' }, 429);
    if (!request.headers.get('content-type')?.includes('application/json')) return json({ error: 'Invalid request.' }, 400);
    // Bound the body before parsing it, even with a missing Content-Length header.
    const reader = request.body?.getReader();
    if (!reader) return json({ error: 'Confirmation required.' }, 400);
    let raw = ''; let size = 0; const decoder = new TextDecoder();
    try {
      while (true) {
        const { done, value } = await reader.read(); if (done) break;
        size += value.length; if (size > 2048) { await reader.cancel(); return json({ error: 'Request too large.' }, 413); }
        raw += decoder.decode(value, { stream: true });
      }
      raw += decoder.decode();
    } finally { reader.releaseLock(); }
    let input; try { input = JSON.parse(raw); } catch { return json({ error: 'Invalid request.' }, 400); }
    if (input?.confirmation !== 'DELETE' || (input.password !== undefined && (typeof input.password !== 'string' || input.password.length > 128))) return json({ error: 'Confirm that you want to delete your account.' }, 400);
    const context = await auth.$context;
    await deleteOwnAccount(db, session.user.id, session.session.id, input.password, (hash, password) => context.password.verify({ hash, password }));
    // Sign-out clears the browser cookie as well as the sessions already removed above.
    const signedOut = await auth.api.signOut({ headers: request.headers, asResponse: true });
    const response = json({ deleted: true });
    for (const cookie of signedOut.headers.getSetCookie()) response.headers.append('Set-Cookie', cookie);
    return response;
  } catch (error) {
    if (error instanceof AccountDeletionError) return json({ error: error.message, code: error.code }, error.status);
    return json({ error: 'Unable to delete your account. Please try again.' }, 500);
  }
}
