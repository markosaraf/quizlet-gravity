import Link from 'next/link';
import {DiscoveryLanding} from '@/components/discovery/Discovery';
import {SetsLandingHelp} from '@/app/seo-content';
export const metadata={title:'Study games | Quizlet Gravity',alternates:{canonical:'/sets'}};
export default function Page(){return <><DiscoveryLanding/><SetsLandingHelp/><p className="community-page"><Link href="/games">Browse all study games</Link></p></>;}
