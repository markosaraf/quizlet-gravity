import {db} from '@/lib/community/db';
import {notificationEmailMatches,readNotificationUnsubscribeToken} from '@/lib/community/notification-unsubscribe';
import '@/components/community/community.css';

export const dynamic='force-dynamic';
export const metadata={title:'Leaderboard email notifications | Quizlet Gravity',robots:{index:false,follow:false},referrer:'no-referrer' as const};

export default async function EmailNotifications({searchParams}:{searchParams:Promise<{token?:string}>}){
 const {token=''}=await searchParams;
 const identity=readNotificationUnsubscribeToken(token);
 const user=identity?(await db.query(`SELECT u.email,coalesce(p.email_enabled,true) AS enabled FROM "user" u LEFT JOIN notification_preferences p ON p.user_id=u.id WHERE u.id=$1`,[identity.user])).rows[0]:null;
 const valid=identity&&user&&notificationEmailMatches(user.email,identity.email);
 return <main className="community-page" style={{maxWidth:620}}>
  <h1>Leaderboard emails</h1>
  {!valid?<p>This link has expired or is no longer valid. Open the link in your latest leaderboard email.</p>:!user.enabled?<>
   <h2>Leaderboard emails are off</h2><p>You won’t receive emails when someone overtakes you. Password-reset and account-confirmation emails will still work.</p>
  </>:<>
   <p>Turn off emails when another player overtakes your best score?</p>
   <form action="/api/notifications/email-opt-out" method="post">
    <input type="hidden" name="token" value={token}/>
    <button type="submit">Turn off leaderboard emails</button>
   </form>
   <p>Password-reset and account-confirmation emails won’t be affected.</p>
  </>}
 </main>;
}
