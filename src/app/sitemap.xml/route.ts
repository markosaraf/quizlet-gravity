import {db} from '@/lib/community/db';
import {SITE_URL,SITEMAP_PAGE_SIZE} from '@/lib/game-seo';
export const dynamic='force-dynamic';
export async function GET(){
 const {rows}=await db.query('SELECT count(*)::int AS count FROM shared_sets');
 const paths=['/sitemaps/static.xml',...Array.from({length:Math.ceil(rows[0].count/SITEMAP_PAGE_SIZE)},(_,i)=>`/sitemaps/games/${i}.xml`)];
 return new Response(`<?xml version="1.0" encoding="UTF-8"?><sitemapindex xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">${paths.map(path=>`<sitemap><loc>${SITE_URL}${path}</loc></sitemap>`).join('')}</sitemapindex>`,{headers:{'Content-Type':'application/xml; charset=utf-8','Cache-Control':'public, max-age=0, s-maxage=60'}});
}
