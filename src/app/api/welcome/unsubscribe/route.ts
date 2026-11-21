import {NextRequest,NextResponse} from 'next/server';
import {db} from '@/lib/community/db';
import {readWelcomeUnsubscribeToken} from '@/lib/community/welcome-unsubscribe';
export async function POST(request:NextRequest){
 if(Number(request.headers.get('content-length')||0)>4096)return new Response('Request too large',{status:413});
 const body=await request.text();if(body.length>4096)return new Response('Request too large',{status:413});
 const form=new URLSearchParams(body),token=request.nextUrl.searchParams.get('token')||form.get('token')||'';
 const hash=readWelcomeUnsubscribeToken(token);if(!hash)return new Response('Invalid or expired link',{status:400});
 await db.query('INSERT INTO welcome_email_opt_outs(email_hash) VALUES($1) ON CONFLICT DO NOTHING',[hash]);
 if(form.get('List-Unsubscribe')==='One-Click')return new Response('Unsubscribed',{headers:{'Cache-Control':'no-store'}});
 return NextResponse.redirect(new URL('/welcome/unsubscribe?token='+encodeURIComponent(token),request.url),303);
}
