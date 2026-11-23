import {createHmac,timingSafeEqual} from 'node:crypto';
const uuid=/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
export function notificationOpenToken(id:string,recipient:string){
 const payload=Buffer.from(JSON.stringify({id,recipient,expires:Math.floor(Date.now()/1000)+365*86400})).toString('base64url');
 if(!process.env.BETTER_AUTH_SECRET)throw Error('Notification signing is not configured');
 return payload+'.'+createHmac('sha256',process.env.BETTER_AUTH_SECRET).update('notification-open:'+payload).digest('base64url');
}
export function readNotificationOpenToken(token:unknown):{id:string;recipient:string}|null{
 try{
  if(typeof token!=='string'||token.length>2048||!process.env.BETTER_AUTH_SECRET)return null;
  const [payload,signature,extra]=token.split('.');if(!payload||!signature||extra)return null;
  const actual=Buffer.from(signature,'base64url'),expected=createHmac('sha256',process.env.BETTER_AUTH_SECRET).update('notification-open:'+payload).digest();
  if(actual.length!==expected.length||!timingSafeEqual(actual,expected))return null;
  const data=JSON.parse(Buffer.from(payload,'base64url').toString());
  return uuid.test(data.id)&&typeof data.recipient==='string'&&data.recipient.length>0&&Number.isFinite(data.expires)&&data.expires>Date.now()/1000?data:null;
 }catch{return null;}
}
