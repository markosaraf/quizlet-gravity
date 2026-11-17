import {SITE_URL} from '@/lib/game-seo';
export function GET(){
 const paths=['/','/sets','/games','/create-set','/import-game','/example'];
 return new Response(`<?xml version="1.0" encoding="UTF-8"?><urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">${paths.map(path=>`<url><loc>${SITE_URL}${path}</loc></url>`).join('')}</urlset>`,{headers:{'Content-Type':'application/xml; charset=utf-8'}});
}
