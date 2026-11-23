import {notificationOpenToken} from './notification-open';
import {connect} from 'node:http2';
import {importPKCS8,SignJWT} from 'jose';
import {renderOvertakenEmail,type OvertakenGame,overtakenMessage} from './overtaken-message';
import {notificationUnsubscribeUrl} from './notification-unsubscribe';

export class NotificationDeliveryError extends Error{
 constructor(public code:string,public retryable=false,public invalidToken=false,public uncertain=false){super(code);}
}
export type NotificationJob={id:string;notification_id?:string;unread_count?:number;actor_name:string;recipient_id:string;email:string;game:OvertakenGame;device?:{token:string;platform:string;environment:string}};

export async function deliverLeaderboardEmail(job:NotificationJob){
 const unsubscribeUrl=notificationUnsubscribeUrl(job.recipient_id,job.email);
 const mail=renderOvertakenEmail(job.actor_name,job.game,{unsubscribeUrl,open:job.notification_id?{id:job.notification_id,token:notificationOpenToken(job.notification_id,job.recipient_id)}:undefined});
 if(/[\r\n]/.test(job.email))throw new NotificationDeliveryError('invalid_recipient');
 const tokenResponse=await fetch('https://oauth2.googleapis.com/token',{method:'POST',headers:{'Content-Type':'application/x-www-form-urlencoded'},body:new URLSearchParams({grant_type:'refresh_token',refresh_token:process.env.GMAIL_REFRESH_TOKEN||'',client_id:process.env.GMAIL_CLIENT_ID||'',client_secret:process.env.GMAIL_CLIENT_SECRET||''}),signal:AbortSignal.timeout(15000)});
 if(!tokenResponse.ok)throw new NotificationDeliveryError('gmail_authorization_'+tokenResponse.status,tokenResponse.status>=500||tokenResponse.status===429);
 const {access_token}=await tokenResponse.json();
 const boundary='gravity_notification_'+job.id;
 const base64=(s:string)=>Buffer.from(s).toString('base64').match(/.{1,76}/g)!.join('\r\n');
 const token=new URL(unsubscribeUrl).searchParams.get('token')!;
 const message=['From: Quizlet Gravity <quizletgravity@gmail.com>',`To: ${job.email}`,
  `Subject: =?UTF-8?B?${Buffer.from(mail.subject).toString('base64')}?=`,
  `Message-ID: <leaderboard-${job.id}@quizletgravity.com>`,
  `List-Unsubscribe: <https://www.quizletgravity.com/api/notifications/email-opt-out?token=${encodeURIComponent(token)}>`,
  'List-Unsubscribe-Post: List-Unsubscribe=One-Click','Auto-Submitted: auto-generated','MIME-Version: 1.0',
  `Content-Type: multipart/alternative; boundary="${boundary}"`,'',
  '--'+boundary,'Content-Type: text/plain; charset=UTF-8','Content-Transfer-Encoding: base64','',base64(mail.text),
  '--'+boundary,'Content-Type: text/html; charset=UTF-8','Content-Transfer-Encoding: base64','',base64(mail.html),'--'+boundary+'--',''].join('\r\n');
 let response:Response;
 try{response=await fetch('https://gmail.googleapis.com/gmail/v1/users/me/messages/send',{method:'POST',headers:{Authorization:'Bearer '+access_token,'Content-Type':'application/json'},body:JSON.stringify({raw:Buffer.from(message).toString('base64url')}),signal:AbortSignal.timeout(20000)});}
 catch{throw new NotificationDeliveryError('gmail_delivery_unknown',false,false,true);}
 if(!response.ok)throw new NotificationDeliveryError('gmail_delivery_'+response.status,response.status===429||response.status>=500);
 try{return (await response.json()).id as string;}catch{throw new NotificationDeliveryError('gmail_receipt_unknown',false,false,true);}
}

let fcmToken:{value:string;expires:number}|undefined;
async function firebaseAuthorization(){
 if(fcmToken&&fcmToken.expires>Date.now())return fcmToken.value;
 const config=JSON.parse(process.env.FCM_SERVICE_ACCOUNT_JSON||'{}');
 if(!config.client_email||!config.private_key)throw new NotificationDeliveryError('fcm_not_configured');
 const key=await importPKCS8(config.private_key,'RS256');
 const assertion=await new SignJWT({scope:'https://www.googleapis.com/auth/firebase.messaging'}).setProtectedHeader({alg:'RS256'}).setIssuer(config.client_email).setAudience('https://oauth2.googleapis.com/token').setIssuedAt().setExpirationTime('1h').sign(key);
 const response=await fetch('https://oauth2.googleapis.com/token',{method:'POST',headers:{'Content-Type':'application/x-www-form-urlencoded'},body:new URLSearchParams({grant_type:'urn:ietf:params:oauth:grant-type:jwt-bearer',assertion}),signal:AbortSignal.timeout(15000)});
 if(!response.ok)throw new NotificationDeliveryError('fcm_authorization_'+response.status,response.status>=500);
 const data=await response.json();fcmToken={value:data.access_token,expires:Date.now()+Math.max(60,data.expires_in-120)*1000};return fcmToken.value;
}

export async function deliverAndroidNotification(job:NotificationJob){
 if(!job.device)throw new NotificationDeliveryError('device_missing');
 const config=JSON.parse(process.env.FCM_SERVICE_ACCOUNT_JSON||'{}');
 const auth=await firebaseAuthorization(),message=overtakenMessage(job.actor_name,job.game,job.notification_id?{id:job.notification_id,token:notificationOpenToken(job.notification_id,job.recipient_id)}:undefined);
 const response=await fetch(`https://fcm.googleapis.com/v1/projects/${encodeURIComponent(config.project_id)}/messages:send`,{method:'POST',headers:{Authorization:'Bearer '+auth,'Content-Type':'application/json'},body:JSON.stringify({message:{token:job.device.token,data:{...message,eventId:job.notification_id||job.id},android:{priority:'HIGH',ttl:'86400s',collapse_key:'leaderboard_'+job.game.id}}}),signal:AbortSignal.timeout(20000)});
 const result=await response.json();
 if(!response.ok){
  const invalid=result.error?.details?.some((d:{errorCode?:string})=>d.errorCode==='UNREGISTERED');
  throw new NotificationDeliveryError('fcm_delivery_'+response.status,response.status===429||response.status>=500,invalid);
 }
 return result.name as string;
}

let appleToken:{value:string;expires:number}|undefined;
async function appleAuthorization(){
 if(appleToken&&appleToken.expires>Date.now())return appleToken.value;
 if(!process.env.APNS_PRIVATE_KEY||!process.env.APNS_KEY_ID||!process.env.APNS_TEAM_ID)throw new NotificationDeliveryError('apns_not_configured');
 const key=await importPKCS8(process.env.APNS_PRIVATE_KEY.replace(/\\n/g,'\n'),'ES256');
 const token=await new SignJWT({}).setProtectedHeader({alg:'ES256',kid:process.env.APNS_KEY_ID}).setIssuer(process.env.APNS_TEAM_ID).setIssuedAt().sign(key);
 appleToken={value:token,expires:Date.now()+50*60*1000};return token;
}

export async function deliverAppleNotification(job:NotificationJob){
 if(!job.device)throw new NotificationDeliveryError('device_missing');
 const authorization=await appleAuthorization(),message=overtakenMessage(job.actor_name,job.game,job.notification_id?{id:job.notification_id,token:notificationOpenToken(job.notification_id,job.recipient_id)}:undefined);
 const payload=JSON.stringify({aps:{...(job.unread_count===undefined?{}:{badge:job.unread_count}),alert:{title:message.title,body:message.body},sound:'default','thread-id':'leaderboard_'+job.game.id},url:message.url,eventId:job.notification_id||job.id});
 return new Promise<string>((resolve,reject)=>{
  const client=connect(job.device!.environment==='sandbox'?'https://api.sandbox.push.apple.com':'https://api.push.apple.com');
  const timer=setTimeout(()=>{client.destroy();reject(new NotificationDeliveryError('apns_timeout',true));},20000);
  let status=0,body='';
  client.on('error',()=>{clearTimeout(timer);client.destroy();reject(new NotificationDeliveryError('apns_connection',true));});
  const request=client.request({':method':'POST',':path':'/3/device/'+encodeURIComponent(job.device!.token),authorization:'bearer '+authorization,'apns-topic':process.env.APNS_TOPIC||'com.quizletgravity.ios','apns-push-type':'alert','apns-priority':'10','apns-id':job.id,'apns-collapse-id':'leaderboard_'+job.game.id,'apns-expiration':String(Math.floor(Date.now()/1000)+86400)});
  request.on('response',headers=>{status=Number(headers[':status']);});
  request.setEncoding('utf8');request.on('data',chunk=>{if(body.length<4096)body+=chunk;});
  request.on('error',()=>{clearTimeout(timer);client.destroy();reject(new NotificationDeliveryError('apns_request',true));});
  request.on('end',()=>{clearTimeout(timer);client.close();if(status===200){resolve(job.id);return;}let reason='';try{reason=JSON.parse(body).reason}catch{}
   reject(new NotificationDeliveryError('apns_'+(reason||status),status===429||status>=500,status===410||reason==='BadDeviceToken'||reason==='DeviceTokenNotForTopic'));
  });
  request.end(payload);
 });
}
