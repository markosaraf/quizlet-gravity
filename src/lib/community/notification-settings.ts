import {db} from './db';

export async function notificationSettings(){
 const {rows}=await db.query("SELECT key,enabled FROM community_settings WHERE key IN ('overtaken_email','overtaken_push')");
 const flags=new Map<string,boolean>(rows.map(r=>[r.key,r.enabled]));
 return {overtakenEmailEnabled:flags.get('overtaken_email')===true,overtakenPushEnabled:flags.get('overtaken_push')===true};
}

export function notificationReadiness(){
 return {
  email:!!(process.env.GMAIL_CLIENT_ID&&process.env.GMAIL_CLIENT_SECRET&&process.env.GMAIL_REFRESH_TOKEN),
  android:!!process.env.FCM_SERVICE_ACCOUNT_JSON,
  apple:!!(process.env.APNS_KEY_ID&&process.env.APNS_TEAM_ID&&process.env.APNS_PRIVATE_KEY),
 };
}
