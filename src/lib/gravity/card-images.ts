/** Image locations accepted in saved cards. No arbitrary remote URLs or inline markup. */
export function isCardImage(value: unknown): value is string {
  if (typeof value !== 'string' || value.length > 2048) return false;
  if (/^\/api\/set-images\/[0-9a-f-]{36}$/.test(value)) return true;
  try {
    const url = new URL(value);
    return url.protocol === 'https:' && url.hostname === 'o.quizlet.com' && !url.port && !url.username && !url.password && !url.hash;
  } catch { return false; }
}
