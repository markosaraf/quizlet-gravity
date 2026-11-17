'use client';
import {useEffect,useState} from 'react';
import {AnalyticsPanel} from './AnalyticsPanel';
import type {vercelAnalytics} from '@/lib/community/vercel-analytics';
type Traffic=Awaited<ReturnType<typeof vercelAnalytics>>;
export function VercelTraffic({days,version,connected}:{days:1|7|30;version:number;connected:boolean}){
 const [data,setData]=useState<Traffic|null>(null),[error,setError]=useState(''),[retry,setRetry]=useState(0);
 useEffect(()=>{if(!connected)return;const abort=new AbortController();setError('');setData(null);fetch(`/api/admin/traffic?days=${days}`,{signal:abort.signal}).then(async response=>{const result=await response.json();if(!response.ok)throw Error(result.error);setData(result);}).catch(error=>{if(error.name!=='AbortError')setError(error.message);});return()=>abort.abort();},[days,version,retry,connected]);
 return <section className="overview-section" aria-label="Vercel Web Analytics"><h2>Vercel Web Analytics</h2><p>Real visitors and page views from your production website.</p>
 {!connected?<p>Live traffic is ready to connect. Complete the identity verification in your Vercel account to enable visitors, page views and their charts here.</p>:error?<p role="alert">{error} <button onClick={()=>setRetry(n=>n+1)}>Retry</button></p>:data?.days===days?<><p className="overview-period">{data.since} – {data.until} · UTC · refreshed at most every 5 minutes</p><AnalyticsPanel metrics={data.metrics} note={(data.previousAvailable?'':'The current Vercel Hobby plan exposes 31 days through its API, so the previous 30-day period is unavailable. ')+"Percentages compare with the previous equal number of UTC calendar days. Today is still in progress. Visitors are deduplicated by Vercel for each period; daily visitor counts do not necessarily add up to the period total. Bounce rate is available in the full Vercel report."}/></>:<p role="status">Loading Vercel traffic…</p>}
 <a href={`https://vercel.com/markosarafs-projects/quizletgravity-launch/analytics?period=${days}d`} target="_blank" rel="noreferrer">Open full Vercel report ↗</a></section>;
}
