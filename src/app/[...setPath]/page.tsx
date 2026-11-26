import {cache} from 'react';
import type {Metadata} from 'next';
import {notFound,permanentRedirect} from 'next/navigation';
import {db} from '@/lib/community/db';
import {sharedSetPath,matchesSharedSetPath} from '@/lib/community/set-links';
import {gameUrl,gameDescription} from '@/lib/game-seo';
import {SharedSet} from '@/components/community/SharedSet';

type Props={params:Promise<{setPath:string[]}>};
const loadGame=cache(async(path:string)=>{
 const match=path.match(/^\/(?:[a-z]{2}(?:-[a-z]{2})?\/)?(\d{1,20})\/[^/]+-flash-cards$/i);
 if(!match)notFound();
 const {rows}=await db.query(`SELECT s.id,s.public_id,s.quizlet_id,s.title,s.source_url,s.creator_name,s.creator_url,
  s.created_by,s.cards,s.term_count,coalesce(u."displayUsername",u.username,u.name,'Community') AS added_by
  FROM shared_sets s LEFT JOIN "user" u ON u.id=s.created_by WHERE s.public_id=$1`,[match[1]]);
 if(!rows[0])notFound();return rows[0];
});
export async function generateMetadata({params}:Props):Promise<Metadata>{
 const game=await loadGame('/'+(await params).setPath.join('/'));
 const description=gameDescription(game),url=gameUrl(game);
 return {title:{absolute:game.title},description,alternates:{canonical:url},
  openGraph:{title:game.title,description,url,type:'website',siteName:'Quizlet Gravity',images:[{url:`/api/game-preview/${game.id}`,width:1200,height:630}]},
  twitter:{card:'summary_large_image',title:game.title,description,images:[`/api/game-preview/${game.id}`]}};
}
export default async function SetPage({params}:Props){
 const path='/'+(await params).setPath.join('/');
 const game=await loadGame(path);const canonical=sharedSetPath(game);
 if(!matchesSharedSetPath(path,canonical))permanentRedirect(canonical);
 const structured={'@context':'https://schema.org','@type':'LearningResource',name:game.title,
  description:gameDescription(game),url:gameUrl(game),learningResourceType:'Flashcards and study game',isAccessibleForFree:true};
 return <><script type="application/ld+json" dangerouslySetInnerHTML={{__html:JSON.stringify(structured).replace(/</g,'\\u003c')}}/><SharedSet key={game.id} id={game.id} initialSet={game}/></>;
}
