import {createHash,createHmac,timingSafeEqual} from 'node:crypto';
export const welcomeEmailHash=(email:string)=>createHash('sha256').update(email.trim().toLowerCase()).digest('hex');
function secret(){if(!process.env.BETTER_AUTH_SECRET)throw Error('Email link signing unavailable');return process.env.BETTER_AUTH_SECRET;}
export function welcomeUnsubscribeToken(email:string){
 const payload=Buffer.from(JSON.stringify({hash:welcomeEmailHash(email),expires:Math.floor(Date.now()/1000)+365*86400})).toString('base64url');
 return payload+'.'+createHmac('sha256',secret()).update('welcome-opt-out:'+payload).digest('base64url');
}
export function readWelcomeUnsubscribeToken(token:string):string|null{
 try{
  if(token.length>2048)return null;
  const [payload,signature,extra]=token.split('.');if(!payload||!signature||extra)return null;
  const expected=createHmac('sha256',secret()).update('welcome-opt-out:'+payload).digest(),actual=Buffer.from(signature,'base64url');
  if(actual.length!==expected.length||!timingSafeEqual(actual,expected))return null;
  const value=JSON.parse(Buffer.from(payload,'base64url').toString());
  return /^[a-f0-9]{64}$/.test(value.hash)&&Number.isFinite(value.expires)&&value.expires>Date.now()/1000?value.hash:null;
 }catch{return null;}
}
