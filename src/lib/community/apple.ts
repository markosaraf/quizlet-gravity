import { importPKCS8, SignJWT } from 'jose';
import type { PoolClient } from 'pg';

export const appleConfigured = () => ['APPLE_CLIENT_ID', 'APPLE_TEAM_ID', 'APPLE_KEY_ID', 'APPLE_PRIVATE_KEY'].every(key => !!process.env[key]);

export async function appleClientSecret() {
  if (!appleConfigured()) throw new Error('Apple sign-in is not configured.');
  const key = await importPKCS8(process.env.APPLE_PRIVATE_KEY!.replace(/\\n/g, '\n'), 'ES256');
  return new SignJWT({}).setProtectedHeader({ alg: 'ES256', kid: process.env.APPLE_KEY_ID! })
    .setIssuer(process.env.APPLE_TEAM_ID!).setSubject(process.env.APPLE_CLIENT_ID!)
    .setAudience('https://appleid.apple.com').setIssuedAt().setExpirationTime('30d').sign(key);
}

// Revoke Apple's grant before removing the only stored token. A provider outage
// leaves the account intact so deletion can be retried without losing the token.
export async function revokeAppleAccess(client: Pick<PoolClient, 'query'>, userId: string) {
  const { rows } = await client.query('SELECT "refreshToken","accessToken" FROM account WHERE "userId"=$1 AND "providerId"=\'apple\' FOR UPDATE', [userId]);
  for (const account of rows) {
    const token = account.refreshToken || account.accessToken;
    if (!token) throw new Error('Apple authorization must be renewed before deletion.');
    const response = await fetch('https://appleid.apple.com/auth/revoke', {
      method: 'POST', headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({ client_id: process.env.APPLE_CLIENT_ID!, client_secret: await appleClientSecret(), token, token_type_hint: account.refreshToken ? 'refresh_token' : 'access_token' }),
      signal: AbortSignal.timeout(10000),
    });
    if (!response.ok) throw new Error('Apple authorization could not be revoked. Please retry.');
  }
}
