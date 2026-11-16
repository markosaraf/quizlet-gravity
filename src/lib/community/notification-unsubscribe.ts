import {createHash,createHmac,timingSafeEqual} from 'node:crypto';

function secret(){
 const value=process.env.BETTER_AUTH_SECRET;
 if(!value)throw Error('Notification link signing is not configured');
 return value;
}
const emailHash=(email:string)=>createHash('sha256').update(email.trim().toLowerCase()).digest('hex');
export function notificationUnsubscribeToken(userId:string,email:string){
 const payload=Buffer.from(JSON.stringify({user:userId,email:emailHash(email),expires:Math.floor(Date.now()/1000)+365*86400})).toString('base64url');
 return payload+'.'+createHmac('sha256',secret()).update('leaderboard-email-opt-out:'+payload).digest('base64url');
}
export function readNotificationUnsubscribeToken(token:string):{user:string;email:string}|null{
 try{
  if(token.length>2048)return null;
  const [payload,signature,extra]=token.split('.');if(!payload||!signature||extra)return null;
  const actual=Buffer.from(signature,'base64url');
  const expected=createHmac('sha256',secret()).update('leaderboard-email-opt-out:'+payload).digest();
  if(actual.length!==expected.length||!timingSafeEqual(actual,expected))return null;
  const value=JSON.parse(Buffer.from(payload,'base64url').toString());
  if(typeof value.user!=='string'||typeof value.email!=='string'||!Number.isFinite(value.expires)||value.expires< Date.now()/1000)return null;
  return {user:value.user,email:value.email};
 }catch{return null;}
}
export function notificationEmailMatches(email:string,hash:string){return emailHash(email)===hash;}
export function notificationUnsubscribeUrl(userId:string,email:string){
 return 'https://www.quizletgravity.com/notifications/email?token='+encodeURIComponent(notificationUnsubscribeToken(userId,email));
}
