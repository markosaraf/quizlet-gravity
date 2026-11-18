import { SITE_URL } from './game-seo';
export const INDEXNOW_KEY = process.env.INDEXNOW_KEY || '27d1a1f6394a898f94fcd03d71f91f5e';
export function validateIndexNowUrls(urls: string[]) {
 if (!urls.length || urls.length > 10000) throw new Error('Submit 1–10,000 URLs.');
 return [...new Set(urls.map(value => {
  const url = new URL(value);
  if (url.origin !== SITE_URL || url.username || url.password || url.hash || url.search) throw new Error('Only canonical public site URLs are allowed.');
  return url.href;
 }))];
}
export async function submitToIndexNow(urls: string[]) {
 const urlList = validateIndexNowUrls(urls);
 const response = await fetch('https://api.indexnow.org/indexnow', {
  method: 'POST', headers: { 'Content-Type': 'application/json; charset=utf-8' },
  body: JSON.stringify({host: new URL(SITE_URL).host, key: INDEXNOW_KEY,
   keyLocation: `${SITE_URL}/indexnow-key.txt`, urlList}),
  signal: AbortSignal.timeout(20000),
 });
 // Accepted means received, never a promise of crawling or indexing.
 if (response.status !== 200 && response.status !== 202) throw new Error(`IndexNow HTTP ${response.status}`);
 return {status: response.status, submitted: urlList.length};
}
