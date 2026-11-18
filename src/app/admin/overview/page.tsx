import {headers} from 'next/headers';
import Link from 'next/link';
import {auth} from '@/lib/community/auth';
import {isAdmin} from '@/lib/community/admin';
import {AdminOverview} from '@/components/community/AdminOverview';
export const metadata={title:'Admin overview | Quizlet Gravity',robots:{index:false,follow:false}};
export default async function Page(){
 const session=await auth.api.getSession({headers:await headers()});
 if(!session||session.user.isAnonymous||!await isAdmin(session.user.id))return <main className="community-page"><h1>Admin overview</h1><p>Sign in with your administrator account to view this dashboard.</p><Link href="/">Back to games</Link></main>;
 return <AdminOverview/>;
}
