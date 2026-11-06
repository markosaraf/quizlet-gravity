'use client';
import { useState } from 'react';
import { authClient } from '@/lib/community/auth-client';

export function DeleteAccount({ guest = false }: { guest?: boolean }) {
  const [open, setOpen] = useState(false);
  const [password, setPassword] = useState('');
  const [needsPassword, setNeedsPassword] = useState(false);
  const [reauth, setReauth] = useState(false);
  const [confirmed, setConfirmed] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  async function start() {
    setBusy(true); setError('');
    try {
      if (!guest) {
        const accounts = await authClient.listAccounts();
        if (accounts.error) throw Error('Could not load your account. Please try again.');
        setNeedsPassword(accounts.data?.some(account => account.providerId === 'credential') ?? false);
      }
      setOpen(true);
    } catch (e) { setError(e instanceof Error ? e.message : 'Please try again.'); }
    finally { setBusy(false); }
  }
  async function remove(event: React.FormEvent) {
    event.preventDefault(); if (!confirmed) return;
    setBusy(true); setError('');
    try {
      const response = await fetch('/api/community/account/delete', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ confirmation: 'DELETE', ...(needsPassword ? { password } : {}) }) });
      const result = await response.json();
      if (!response.ok) {
        if (result.code === 'REAUTH_REQUIRED') setReauth(true);
        if (result.code === 'PASSWORD_REQUIRED') setNeedsPassword(true);
        throw Error(result.error || 'Please try again.');
      }
      // Full navigation drops stale authenticated UI and any ongoing game state.
      window.location.replace('/?account=deleted');
    } catch (e) { setError(e instanceof Error ? e.message : 'Please try again.'); }
    finally { setBusy(false); }
  }
  return <div className="community-delete-account">
    {!open ? <button type="button" disabled={busy} onClick={start}>{guest ? 'Delete guest profile' : 'Delete account'}</button> : <form onSubmit={remove}>
      <h3>{guest ? 'Delete your guest profile?' : 'Delete your account?'}</h3>
      <p>Your login and personal account details will be permanently removed. Your shared sets and scores will remain under “Deleted user”. You will be signed out on all devices. This cannot be undone.</p>
      {needsPassword && <label>Current password<input type="password" autoComplete="current-password" required maxLength={128} value={password} onChange={event => setPassword(event.target.value)} /></label>}
      <label className="community-delete-confirm"><input type="checkbox" checked={confirmed} onChange={event => setConfirmed(event.target.checked)} />I understand and want to delete my {guest ? 'guest profile' : 'account'}.</label>
      <div className="community-auth-actions"><button type="button" disabled={busy} onClick={() => { setOpen(false); setPassword(''); setConfirmed(false); setError(''); setReauth(false); }}>Cancel</button><button type="submit" disabled={busy || !confirmed || reauth}>{busy ? 'Deleting…' : 'Permanently delete'}</button></div>
      {reauth && <button type="button" onClick={async () => { setBusy(true); const revoked = await authClient.revokeSessions(); if (revoked.error) { setError('Could not sign out. Please try again.'); setBusy(false); return; } await authClient.signOut(); window.location.replace('/?reauth=delete'); }}>Sign out on all devices and sign in again</button>}
    </form>}
    {error && <p role="alert">{error}</p>}
  </div>;
}
