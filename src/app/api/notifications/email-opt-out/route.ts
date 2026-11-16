import {NextRequest,NextResponse} from 'next/server';
import {db} from '@/lib/community/db';
import {notificationEmailMatches,readNotificationUnsubscribeToken} from '@/lib/community/notification-unsubscribe';

export async function POST(request:NextRequest){
 if(Number(request.headers.get('content-length')||0)>4096)return new Response('Request too large',{status:413});
 const body=await request.text();if(body.length>4096)return new Response('Request too large',{status:413});
 const form=new URLSearchParams(body);
 const token=request.nextUrl.searchParams.get('token')||form.get('token')||'';
 const identity=readNotificationUnsubscribeToken(token);
 if(!identity)return new Response('Invalid or expired notification link',{status:400});
 const {rows}=await db.query('SELECT email FROM "user" WHERE id=$1',[identity.user]);
 if(!rows[0]||!notificationEmailMatches(rows[0].email,identity.email))return new Response('Invalid notification link',{status:400});
 await db.query('INSERT INTO notification_preferences(user_id,email_enabled) VALUES($1,false) ON CONFLICT(user_id) DO UPDATE SET email_enabled=false,updated_at=now()',[identity.user]);
 await db.query("UPDATE leaderboard_notifications SET status='cancelled',updated_at=now(),last_error='recipient_opted_out' WHERE recipient_id=$1 AND channel='email' AND status='pending'",[identity.user]);
 // RFC 8058 one-click requests are POSTs; merely opening/scanning an email link
 // never changes the preference. Browsers get the visible confirmation page.
 if(form.get('List-Unsubscribe')==='One-Click')return new Response('Unsubscribed',{headers:{'Cache-Control':'no-store'}});
 return NextResponse.redirect(new URL('/notifications/email?token='+encodeURIComponent(token),request.url),303);
}
