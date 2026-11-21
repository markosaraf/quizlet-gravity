import {db} from '@/lib/community/db';
import {readWelcomeUnsubscribeToken} from '@/lib/community/welcome-unsubscribe';
import '@/components/community/community.css';
export const dynamic='force-dynamic';
export const metadata={title:'Welcome emails | Quizlet Gravity',robots:{index:false,follow:false},referrer:'no-referrer' as const};
export default async function WelcomeUnsubscribe({searchParams}:{searchParams:Promise<{token?:string}>}){
 const {token=''}=await searchParams,hash=readWelcomeUnsubscribeToken(token);
 const optedOut=hash&&(await db.query('SELECT 1 FROM welcome_email_opt_outs WHERE email_hash=$1',[hash])).rowCount;
 return <main className="community-page" style={{maxWidth:620}}><h1>Welcome emails</h1>
 {!hash?<p>This link has expired or is invalid. Please reply to the email to unsubscribe.</p>:optedOut?<p>You’re unsubscribed from welcome emails. Account-confirmation and password-reset emails will still work.</p>:<>
 <p>Unsubscribe from Quizlet Gravity welcome emails?</p><form method="post" action="/api/welcome/unsubscribe"><input type="hidden" name="token" value={token}/><button type="submit">Unsubscribe</button></form>
 </>}</main>;
}
