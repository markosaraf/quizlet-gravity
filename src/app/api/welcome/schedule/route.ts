import {scheduleWelcomeEmails} from '@/lib/community/welcome-emails';
export const maxDuration=60;
export async function GET(request:Request){
 if(!process.env.CRON_SECRET||request.headers.get('authorization')!=='Bearer '+process.env.CRON_SECRET)return new Response('Unauthorized',{status:401});
 try{return Response.json({scheduledFor:await scheduleWelcomeEmails()});}
 catch{console.error('Welcome email scheduling failed');return Response.json({error:'Scheduling unavailable'},{status:503});}
}
