import {handleCallback} from '@vercel/queue';
import {dispatchWelcomeEmails,processWelcomeEmail,type WelcomeJob} from '@/lib/community/welcome-emails';
export const maxDuration=60;
export const POST=handleCallback<WelcomeJob>(async job=>{
 if(process.env.VERCEL_ENV!=='production')return;
 const scheduled=Date.parse(job.scheduledFor);
 if(!Number.isFinite(scheduled)||scheduled<Date.now()-86400000)return;
 if(scheduled>Date.now()+1000)throw Error('Welcome delivery is not due yet');
 if(job.kind==='dispatch'&&typeof job.cursor==='string')await dispatchWelcomeEmails(job);
 else if(job.kind==='deliver'&&typeof job.userId==='string'&&/^[a-f0-9]{64}$/.test(job.emailHash))await processWelcomeEmail(job.userId,job.emailHash);
},{retry:(_error,metadata)=>metadata.deliveryCount>8?{acknowledge:true}:{afterSeconds:Math.min(600,30*2**metadata.deliveryCount)}});
