import {publishLeaderboardNotifications} from '@/lib/community/notification-queue';
export const runtime='nodejs';
export const maxDuration=60;
export async function GET(request:Request){
 if(!process.env.CRON_SECRET||request.headers.get('authorization')!=='Bearer '+process.env.CRON_SECRET)return new Response('Unauthorized',{status:401});
 return Response.json({published:await publishLeaderboardNotifications()});
}
