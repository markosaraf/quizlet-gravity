import {NextRequest,NextResponse} from 'next/server';
import {auth} from '@/lib/community/auth';
import {db} from '@/lib/community/db';
import {communitySettings} from '@/lib/community/settings';
import {isCyberMode} from '@/lib/community/cyber-font';
const json=(value:unknown,status=200)=>NextResponse.json(value,{status,headers:{'Cache-Control':'no-store'}});
export async function GET(request:NextRequest){
 const session=await auth.api.getSession({headers:request.headers});
 if(!session)return json({error:'Sign in first.'},401);
 const {rows}=await db.query('SELECT mode FROM cyber_font_preferences WHERE user_id=$1',[session.user.id]);
 return json({mode:rows[0]?.mode??null});
}
export async function POST(request:NextRequest){
 if(request.headers.get('sec-fetch-site')==='cross-site'||request.headers.get('origin')!==request.nextUrl.origin)return json({error:'Origin not allowed'},403);
 const session=await auth.api.getSession({headers:request.headers});
 if(!session)return json({error:'Sign in first.'},401);
 const input=await request.json().catch(()=>null);
 if(!input||Object.keys(input).length!==1||!isCyberMode(input.mode))return json({error:'Choose a valid font mode.'},400);
 if(!(await communitySettings()).cyberLogoEnabled)return json({error:'The personal font switch is disabled.'},403);
 await db.query('INSERT INTO cyber_font_preferences(user_id,mode) VALUES($1,$2) ON CONFLICT(user_id) DO UPDATE SET mode=EXCLUDED.mode',[session.user.id,input.mode]);
 return json({mode:input.mode});
}
