import {welcomeEmailMime} from './welcome-email';
import {NotificationDeliveryError} from './notification-delivery';
export async function deliverWelcomeEmail(email:string,id:string){
 const message=welcomeEmailMime(email,id);
 let tokenResponse:Response;
 try{tokenResponse=await fetch('https://oauth2.googleapis.com/token',{method:'POST',headers:{'Content-Type':'application/x-www-form-urlencoded'},body:new URLSearchParams({grant_type:'refresh_token',refresh_token:process.env.GMAIL_REFRESH_TOKEN||'',client_id:process.env.GMAIL_CLIENT_ID||'',client_secret:process.env.GMAIL_CLIENT_SECRET||''}),signal:AbortSignal.timeout(15000),cache:'no-store'});}
 catch{throw new NotificationDeliveryError('gmail_authorization_unavailable',true);}
 if(!tokenResponse.ok)throw new NotificationDeliveryError('gmail_authorization_'+tokenResponse.status,tokenResponse.status===429||tokenResponse.status>=500);
 const {access_token}=await tokenResponse.json();if(!access_token)throw new NotificationDeliveryError('gmail_authorization_invalid',true);
 let response:Response;
 try{response=await fetch('https://gmail.googleapis.com/gmail/v1/users/me/messages/send',{method:'POST',headers:{Authorization:'Bearer '+access_token,'Content-Type':'application/json'},body:JSON.stringify({raw:Buffer.from(message).toString('base64url')}),signal:AbortSignal.timeout(20000)});}
 catch{throw new NotificationDeliveryError('gmail_delivery_unknown',false,false,true);}
 // A server error after submitting an email may have accepted it. Do not resend it blindly.
 if(response.status>=500)throw new NotificationDeliveryError('gmail_delivery_unknown_'+response.status,false,false,true);
 if(!response.ok)throw new NotificationDeliveryError('gmail_delivery_'+response.status,response.status===429);
 try{const data=await response.json();if(!data.id)throw Error();return data.id as string;}
 catch{throw new NotificationDeliveryError('gmail_receipt_unknown',false,false,true);}
}
