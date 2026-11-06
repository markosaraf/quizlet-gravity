import { randomUUID } from 'node:crypto';
import type { Pool } from 'pg';

export class AccountDeletionError extends Error {
  constructor(message: string, public status: number, public code?: string) { super(message); }
}

// Keep an anonymous leaderboard record, never the deleted account's identity.
export async function deleteOwnAccount(
  pool: Pool,
  userId: string,
  sessionId: string,
  password: string | undefined,
  verifyPassword: (hash: string, password: string) => Promise<boolean>,
) {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const { rows: users } = await client.query('SELECT id,email,"isAnonymous" FROM "user" WHERE id=$1 FOR UPDATE', [userId]);
    const { rows: sessions } = await client.query('SELECT "createdAt" FROM session WHERE id=$1 AND "userId"=$2 AND "expiresAt">now() FOR UPDATE', [sessionId, userId]);
    if (!users.length || !sessions.length) throw new AccountDeletionError('Sign in again to delete your account.', 401);
    const { rows: accounts } = await client.query('SELECT password FROM account WHERE "userId"=$1 AND "providerId"=\'credential\' FOR UPDATE', [userId]);
    if (accounts[0]?.password) {
      if (!password || !await verifyPassword(accounts[0].password, password)) throw new AccountDeletionError('Enter your current password to confirm deletion.', 403, 'PASSWORD_REQUIRED');
    } else if (!users[0].isAnonymous && Date.now() - new Date(sessions[0].createdAt).getTime() > 5 * 60 * 1000) {
      throw new AccountDeletionError('Sign in again, then return here to delete your account.', 403, 'REAUTH_REQUIRED');
    }
    await client.query('DELETE FROM session WHERE "userId"=$1', [userId]);
    await client.query('DELETE FROM account WHERE "userId"=$1', [userId]);
    await client.query('DELETE FROM verification WHERE identifier=$1 OR value=$2', [users[0].email, userId]);
    await client.query('DELETE FROM community_admins WHERE user_id=$1', [userId]);
    await client.query(`UPDATE "user" SET name='Deleted user',username=NULL,"displayUsername"=NULL,email=$2,"emailVerified"=false,image=NULL,"isAnonymous"=false,"updatedAt"=now() WHERE id=$1`, [userId, randomUUID() + '@deleted.invalid']);
    await client.query('INSERT INTO deleted_users(user_id) VALUES($1) ON CONFLICT DO NOTHING', [userId]);
    await client.query('COMMIT');
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally { client.release(); }
}
