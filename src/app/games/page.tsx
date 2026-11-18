import Link from 'next/link';
import {db} from '@/lib/community/db';
import {sharedSetPath} from '@/lib/community/set-links';
export const dynamic='force-dynamic';
export async function generateMetadata({searchParams}:{searchParams:Promise<{page?:string}>}){
 const page=Math.max(1,Math.min(100000,Number((await searchParams).page)||1));
 return {title:'Browse study games | Quizlet Gravity',description:'Find a study game, practice flashcards and challenge your friends on the leaderboard.',alternates:{canonical:page===1?'/games':`/games?page=${page}`}};
}
export default async function Games({searchParams}:{searchParams:Promise<{page?:string}>}){
 const input=(await searchParams).page;const page=/^\d{1,6}$/.test(input||'')?Math.max(1,Number(input)):1;
 const {rows}=await db.query('SELECT public_id,title,source_url,term_count FROM shared_sets ORDER BY created_at,id LIMIT 61 OFFSET $1',[(page-1)*60]);
 return <main className="community-page"><h1>Browse study games</h1><p>Choose a game to practice its flashcards, share it with friends and compete on the leaderboard.</p><ul className="admin-list">{rows.slice(0,60).map(game=><li key={game.public_id}><Link href={sharedSetPath(game)}>{game.title}</Link><span>{game.term_count} flashcards</span></li>)}</ul><nav className="community-pagination" aria-label="Game directory pages">{page>1&&<Link href={page===2?'/games':`/games?page=${page-1}`}>Previous games</Link>}{rows.length>60&&<Link href={`/games?page=${page+1}`}>Next games</Link>}</nav><p><Link href="/sets">Search games</Link></p></main>;
}
