import Link from 'next/link';
import '@/components/community/community.css';
export const metadata={title:'Enable app notifications | Quizlet Gravity',robots:{index:false,follow:false}};
export default function Page(){return <main className="community-page"><h1>Enable app notifications</h1><p>Open Notifications in the latest Quizlet Gravity app to enable push notifications on this device.</p><Link href="/notifications">Back to notification preferences</Link></main>;}
