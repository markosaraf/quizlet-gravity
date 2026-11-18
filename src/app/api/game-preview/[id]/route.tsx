import {ImageResponse} from 'next/og';
import {db} from '@/lib/community/db';
import {readFile} from 'node:fs/promises';
import {join} from 'node:path';
export const runtime='nodejs';

// Use the same artwork, font, translucent surface and hover border as the site.
async function artwork(){
 const [background,font]=await Promise.all([
  readFile(join(process.cwd(),'public/assets/gravity/intro-bg.jpg')),
  readFile(join(process.cwd(),'public/assets/gravity/hurmegeosans-no2-400.woff')),
 ]);
 return {background:'data:image/jpeg;base64,'+background.toString('base64'),font};
}

export async function GET(_request:Request,{params}:{params:Promise<{id:string}>}){
 const {id}=await params;
 if(!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id))return new Response('Not found',{status:404});
 const {rows}=await db.query(`SELECT s.title,s.term_count,s.creator_name,coalesce(u."displayUsername",u.username,u.name,'Community') AS added_by FROM shared_sets s LEFT JOIN "user" u ON u.id=s.created_by WHERE s.id=$1`,[id]);
 if(!rows[0])return new Response('Not found',{status:404});
 const game=rows[0];
 const {background,font}=await artwork();
 return new ImageResponse(<div style={{display:'flex',width:'100%',height:'100%',padding:38,backgroundColor:'#2e384f',backgroundImage:`url(${background})`,backgroundPosition:'center bottom',backgroundSize:'cover',fontFamily:'Hurme',color:'#1a1a1a'}}>
  <div style={{display:'flex',width:'100%',padding:44,flexDirection:'column',justifyContent:'space-between',border:'3px solid #d4af37',borderRadius:16,background:'rgba(255,255,255,.9)',boxShadow:'0 0 22px 6px rgba(212,175,55,.3)'}}>
   <div style={{display:'flex',fontSize:28,color:'#586380'}}>{game.term_count} terms</div>
   <div style={{display:'flex',fontSize:game.title.length>85?42:54,lineHeight:1.12,margin:'18px 0'}}>{game.title.slice(0,200)}</div>
   <div style={{display:'flex',flexDirection:'column',fontSize:25,color:'#586380'}}>
    <span>{game.creator_name?'Original Quizlet set creator:':'Quizlet Gravity game creator:'}</span>
    <span>{game.creator_name||game.added_by||'Quizlet Gravity'}</span>
   </div>
   <div style={{display:'flex',alignItems:'center',gap:12,fontSize:30,color:'#2563eb',marginTop:24}}><svg width="24" height="24" viewBox="0 0 24 24"><path d="M5 3L21 12L5 21Z" fill="#2563eb"/></svg>Play game</div>
  </div>
 </div>,{width:1008,height:560,fonts:[{name:'Hurme',data:font,weight:400,style:'normal'}],headers:{'Cache-Control':'public, max-age=3600, s-maxage=3600'}});
}
