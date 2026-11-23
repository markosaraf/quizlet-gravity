import {NextRequest,NextResponse} from 'next/server';
import {auth} from '@/lib/community/auth';
import {db} from '@/lib/community/db';
import {readNotificationOpenToken} from '@/lib/community/notification-open';
import {sharedSetPath} from '@/lib/community/set-links';
export const runtime='nodejs';
const json=(value:unknown,status=200)=>NextResponse.json(value,{status,headers:{'Cache-Control':'private, no-store'}});
const visible=`NOT EXISTS(SELECT 1 FROM deleted_users d WHERE d.user_id IN(i.actor_id,i.recipient_id)) AND NOT EXISTS(SELECT 1 FROM user_blocks b WHERE (b.blocker_id=i.recipient_id AND b.blocked_id=i.actor_id) OR (b.blocker_id=i.actor_id AND b.blocked_id=i.recipient_id))`;
async function unread(userId:string){
 const {rows}=await db.query(`SELECT count(*)::int AS count FROM notification_inbox i WHERE i.recipient_id=$1 AND i.read_at IS NULL AND ${visible}`,[userId]);
 return rows[0].count as number;
}
export async function GET(request:NextRequest){
 const session=await auth.api.getSession({headers:request.headers});if(!session)return json({error:'Sign in or choose a guest name first.'},401);
 try{
  const unreadCount=await unread(session.user.id);
  if(request.nextUrl.searchParams.get('count')==='true')return json({unreadCount});
  const offset=Math.max(0,Math.min(100000,Math.floor(Number(request.nextUrl.searchParams.get('offset'))||0)));
  const {rows}=await db.query(`SELECT i.id,i.actor_name,i.created_at,i.read_at,g.title,g.public_id,g.source_url FROM notification_inbox i JOIN shared_sets g ON g.id=i.set_id WHERE i.recipient_id=$1 AND ${visible} ORDER BY i.created_at DESC,i.id DESC LIMIT 26 OFFSET $2`,[session.user.id,offset]);
  return json({unreadCount,hasMore:rows.length>25,notifications:rows.slice(0,25).map(({public_id,source_url,...row})=>({...row,url:sharedSetPath({public_id,source_url,title:row.title})}))});
 }catch{return json({error:'Could not load notifications. Please try again.'},500);}
}
export async function POST(request:NextRequest){
 if(request.headers.get('sec-fetch-site')==='cross-site'||request.headers.get('origin')!==request.nextUrl.origin)return json({error:'Origin not allowed'},403);
 const session=await auth.api.getSession({headers:request.headers});
 const input=await request.json().catch(()=>null);
 if(!input||typeof input.id!=='string'||!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(input.id))return json({error:'Choose a notification.'},400);
 const signed=readNotificationOpenToken(input.token);
 const recipient=signed&&signed.id===input.id?signed.recipient:session?.user.id;
 if(!recipient)return json({error:'Sign in first.'},401);
 try{
  const {rows}=await db.query(`UPDATE notification_inbox i SET read_at=coalesce(i.read_at,now()) WHERE i.id=$1 AND i.recipient_id=$2 AND ${visible} RETURNING read_at`,[input.id,recipient]);
  if(!rows.length)return json({error:'Notification not found.'},404);
  return json({readAt:rows[0].read_at,unreadCount:session?.user.id===recipient?await unread(recipient):null});
 }catch{return json({error:'Could not mark this notification as read. Please try again.'},500);}
}
