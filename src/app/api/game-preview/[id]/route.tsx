import {ImageResponse} from 'next/og';
import {db} from '@/lib/community/db';
export const runtime='nodejs';

export async function GET(_request:Request,{params}:{params:Promise<{id:string}>}){
 const {id}=await params;
 if(!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id))return new Response('Not found',{status:404});
 const {rows}=await db.query('SELECT title,term_count FROM shared_sets WHERE id=$1',[id]);
 if(!rows[0])return new Response('Not found',{status:404});
 const game=rows[0];
 return new ImageResponse(<div style={{display:'flex',width:'100%',height:'100%',padding:64,flexDirection:'column',justifyContent:'space-between',background:'linear-gradient(135deg,#080d25,#263475)',color:'white'}}>
  <div style={{display:'flex',alignItems:'center',gap:20,fontSize:32}}><img src="https://www.quizletgravity.com/brand-q-original-gold-thick-transparent.png" width="70" height="70" alt=""/>Quizlet Gravity</div>
  <div style={{display:'flex',fontSize:game.title.length>85?46:58,lineHeight:1.15,fontWeight:700}}>{game.title.slice(0,200)}</div>
  <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',fontSize:29}}><span>{game.term_count} terms</span><span style={{color:'#e8c65b'}}>Earn your place back →</span></div>
 </div>,{width:1008,height:560,headers:{'Cache-Control':'public, max-age=3600, s-maxage=3600'}});
}
