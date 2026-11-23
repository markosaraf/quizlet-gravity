import {NextRequest,NextResponse} from 'next/server';
import {auth} from '@/lib/community/auth';
import {db} from '@/lib/community/db';
const json=(value:unknown,status=200)=>NextResponse.json(value,{status,headers:{'Cache-Control':'private, no-store'}});
export async function POST(request:NextRequest){
 if(request.headers.get('sec-fetch-site')==='cross-site'||request.headers.get('origin')!==request.nextUrl.origin)return json({error:'Origin not allowed'},403);
 const session=await auth.api.getSession({headers:request.headers});if(!session)return json({error:'Sign in first.'},401);
 const input=await request.json().catch(()=>null);
 if(!Array.isArray(input?.ids)||input.ids.length>100||input.ids.some((id:unknown)=>typeof id!=='string'||!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id)))return json({error:'Invalid notifications.'},400);
 // Older installed apps used the delivery ID instead of the inbox ID.
 const legacy=await db.query(`SELECT n.id,i.id AS inbox_id FROM leaderboard_notifications n JOIN notification_inbox i ON i.run_id=n.run_id AND i.recipient_id=n.recipient_id WHERE n.recipient_id=$1 AND n.id=ANY($2::uuid[])`,[session.user.id,input.ids]);
 const mapped=new Map(legacy.rows.map(r=>[r.id,r.inbox_id]));
 const candidates=[...new Set([...input.ids,...mapped.values()])];
 const {rows}=await db.query(`SELECT count(*)::int AS unread_count,coalesce(array_agg(i.id) FILTER(WHERE i.id=ANY($2::uuid[])),ARRAY[]::uuid[]) AS unread_ids FROM notification_inbox i WHERE i.recipient_id=$1 AND i.read_at IS NULL AND NOT EXISTS(SELECT 1 FROM deleted_users d WHERE d.user_id IN(i.actor_id,i.recipient_id)) AND NOT EXISTS(SELECT 1 FROM user_blocks b WHERE (b.blocker_id=i.recipient_id AND b.blocked_id=i.actor_id) OR (b.blocker_id=i.actor_id AND b.blocked_id=i.recipient_id))`,[session.user.id,candidates]);
 const unread=new Set(rows[0].unread_ids);

 return json({unreadCount:rows[0].unread_count,clearIds:input.ids.filter((id:string)=>!unread.has(mapped.get(id)||id))});
}
