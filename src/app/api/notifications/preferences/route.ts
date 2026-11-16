import {NextRequest,NextResponse} from 'next/server';
import {auth} from '@/lib/community/auth';
import {db} from '@/lib/community/db';
const json=(value:unknown,status=200)=>NextResponse.json(value,{status,headers:{'Cache-Control':'no-store'}});
export async function GET(request:NextRequest){
 const session=await auth.api.getSession({headers:request.headers});if(!session)return json({error:'Sign in or choose a guest name first.'},401);
 const {rows}=await db.query('SELECT email_enabled,push_enabled FROM notification_preferences WHERE user_id=$1',[session.user.id]);
 return json({emailEnabled:rows[0]?.email_enabled!==false,pushEnabled:rows[0]?.push_enabled!==false,canEmail:!session.user.isAnonymous&&session.user.emailVerified});
}
export async function POST(request:NextRequest){
 if(request.headers.get('sec-fetch-site')==='cross-site'||request.headers.get('origin')!==request.nextUrl.origin)return json({error:'Origin not allowed'},403);
 const session=await auth.api.getSession({headers:request.headers});if(!session)return json({error:'Sign in first.'},401);
 const input=await request.json().catch(()=>null);
 if(!input||Object.keys(input).some(k=>!['emailEnabled','pushEnabled'].includes(k))||Object.values(input).some(v=>typeof v!=='boolean')||!Object.keys(input).length)return json({error:'Choose on or off.'},400);
 await db.query(`INSERT INTO notification_preferences(user_id,email_enabled,push_enabled) VALUES($1,coalesce($2,true),coalesce($3,true)) ON CONFLICT(user_id) DO UPDATE SET email_enabled=coalesce($2,notification_preferences.email_enabled),push_enabled=coalesce($3,notification_preferences.push_enabled),updated_at=now()`,[session.user.id,input.emailEnabled??null,input.pushEnabled??null]);
 const off=[...(input.emailEnabled===false?['email']:[]),...(input.pushEnabled===false?['push']:[])];
 if(off.length)await db.query("UPDATE leaderboard_notifications SET status='cancelled',last_error='recipient_opted_out',updated_at=now() WHERE recipient_id=$1 AND channel=ANY($2::text[]) AND status='pending'",[session.user.id,off]);
 return GET(request);
}
