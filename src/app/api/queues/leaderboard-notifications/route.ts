import {handleCallback} from '@vercel/queue';
import {processLeaderboardNotification} from '@/lib/community/notification-worker';
export const runtime='nodejs';
export const maxDuration=60;
export const POST=handleCallback<{notificationId:string}>(async message=>{
 if(process.env.VERCEL_ENV!=='production')return;
 if(!/^[0-9a-f-]{36}$/i.test(message.notificationId))return;
 await processLeaderboardNotification(message.notificationId);
},{retry:(_error,metadata)=>metadata.deliveryCount>8?{acknowledge:true}:{afterSeconds:Math.min(600,30*2**metadata.deliveryCount)}});
