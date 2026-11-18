import {db} from '@/lib/community/db';
import {gameUrl,xmlEscape,SITEMAP_PAGE_SIZE} from '@/lib/game-seo';
export const dynamic='force-dynamic';
export async function GET(_request:Request,{params}:{params:Promise<{page:string}>}){
 const {page}=await params;if(!/^\d{1,6}\.xml$/.test(page))return new Response('Not found',{status:404});
 const offset=Number(page.slice(0,-4))*SITEMAP_PAGE_SIZE;
 const {rows}=await db.query('SELECT public_id,title,source_url,updated_at FROM shared_sets ORDER BY created_at,id LIMIT $1 OFFSET $2',[SITEMAP_PAGE_SIZE,offset]);
 if(!rows.length)return new Response('Not found',{status:404});
 return new Response(`<?xml version="1.0" encoding="UTF-8"?><urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">${rows.map(game=>`<url><loc>${xmlEscape(gameUrl(game))}</loc><lastmod>${new Date(game.updated_at).toISOString()}</lastmod></url>`).join('')}</urlset>`,{headers:{'Content-Type':'application/xml; charset=utf-8','Cache-Control':'public, max-age=0, s-maxage=60'}});
}
