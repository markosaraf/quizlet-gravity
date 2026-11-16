import {NextRequest,NextResponse} from 'next/server';
import {auth} from '@/lib/community/auth';
import {db} from '@/lib/community/db';
import {z} from 'zod';
const schema=z.object({platform:z.enum(['android','ios','macos']),environment:z.enum(['production','sandbox']).default('production'),token:z.string().min(20).max(4096)});
export async function POST(request:NextRequest){
 if(request.headers.get('origin')!==request.nextUrl.origin||request.headers.get('sec-fetch-site')==='cross-site')return new Response('Origin not allowed',{status:403});
 const session=await auth.api.getSession({headers:request.headers});if(!session)return new Response('Sign in first',{status:401});
 const parsed=schema.safeParse(await request.json().catch(()=>null));if(!parsed.success)return new Response('Invalid device',{status:400});
 const {platform,environment,token}=parsed.data;
 if(!(platform==='android'?/^[A-Za-z0-9:_-]+$/:/^[0-9a-f]{64,512}$/i).test(token))return new Response('Invalid token',{status:400});
 // One token belongs to one current account/session, including after switching
 // accounts on the same phone. Signing out removes its session and registration.
 await db.query(`INSERT INTO notification_devices(user_id,session_id,platform,environment,token) VALUES($1,$2,$3,$4,$5)
  ON CONFLICT(platform,environment,token) DO UPDATE SET user_id=EXCLUDED.user_id,session_id=EXCLUDED.session_id,last_seen_at=now()`,[session.user.id,session.session.id,platform,environment,token]);
 await db.query(`DELETE FROM notification_devices WHERE user_id=$1 AND id IN (SELECT id FROM notification_devices WHERE user_id=$1 ORDER BY last_seen_at DESC OFFSET 10)`,[session.user.id]);
 return NextResponse.json({registered:true},{headers:{'Cache-Control':'no-store'}});
}
