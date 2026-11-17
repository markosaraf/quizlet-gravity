'use client';
import {useEffect,useState} from 'react';
import Link from 'next/link';
import {ArrowLeft,RefreshCw,ExternalLink} from 'lucide-react';
import {sharedSetPath} from '@/lib/community/set-links';
import type {adminOverview} from '@/lib/community/admin-overview';
import './admin-overview.css';
import {AnalyticsPanel} from './AnalyticsPanel';
import {VercelTraffic} from './VercelTraffic';
import type {MetricKey,AnalyticsMetric} from '@/lib/analytics-metrics';
type Overview=Awaited<ReturnType<typeof adminOverview>>;
const format=(n:number)=>n.toLocaleString('en-US');
export function AdminOverview({trafficConnected=false}:{trafficConnected?:boolean}){
 const [days,setDays]=useState<1|7|30>(1),[data,setData]=useState<Overview|null>(null),[error,setError]=useState(''),[loading,setLoading]=useState(true),[version,setVersion]=useState(0),[submitting,setSubmitting]=useState(false),[message,setMessage]=useState('');
 useEffect(()=>{const controller=new AbortController();setLoading(true);setError('');fetch(`/api/admin/overview?days=${days}`,{signal:controller.signal}).then(async r=>{const d=await r.json();if(!r.ok)throw Error(d.error);setData(d);}).catch(e=>{if(e.name!=='AbortError')setError(e.message);}).finally(()=>{if(!controller.signal.aborted)setLoading(false);});return()=>controller.abort();},[days,version]);
 async function submit(){setSubmitting(true);setMessage('');try{const r=await fetch('/api/indexnow',{method:'POST'});const d=await r.json();if(!r.ok)throw Error(d.error||'Submission failed; URLs remain queued for retry.');setMessage(d.skipped?'Submissions are disabled on previews.':d.submitted?`${d.submitted} URLs submitted to IndexNow. Indexing is decided by each search engine.`:'No URLs are due for submission.');setVersion(v=>v+1);}catch(e){setMessage((e as Error).message);}finally{setSubmitting(false);}}
 const label=days===1?'today':`in ${days} days`;
 const current=data?.days===days?data:null;
 const currentRows=current?.trends.filter(row=>!row.previous)||[];
 const previousRows=current?.trends.filter(row=>row.previous)||[];
 const metrics:AnalyticsMetric[]=current?(['registered','guests','played','created'] as MetricKey[]).map(key=>{
  const total=currentRows.reduce((n,row)=>n+row[key],0),previous=previousRows.reduce((n,row)=>n+row[key],0);
  const labels={registered:'Registered accounts',guests:'Guest accounts',played:`Games played ${label}`,created:`Games created ${label}`};
  const account=key==='registered'||key==='guests';
  return {key,label:labels[key],value:account?current.accounts[key]:total,current:total,previous,
   note:account?`Current total · ${format(total)} created ${label}`:key==='played'?`${format(current.activity.completed)} completed · ${format(current.activity.players)} players`:`${format(current.activity.total_games)} public games in total`,
   chartLabel:account?`${labels[key]} · created per day`:key==='played'?'Games played':'Games created',
   points:currentRows.map((row,i)=>({date:row.day,value:row[key],previous:previousRows[i]?.[key]||0,previousDate:previousRows[i]?.day||''}))};
 }):[];
 return <main className="community-page admin-overview">
  <Link href="/admin/users" className="overview-back"><ArrowLeft size={18}/> Users and settings</Link>
  <header className="overview-header"><div><p className="overview-kicker">QUIZLET GRAVITY</p><h1>Admin overview</h1></div><button aria-label="Refresh overview" disabled={loading} onClick={()=>setVersion(v=>v+1)}><RefreshCw size={18}/></button></header>
  <p className="overview-subtitle">Your community, activity and search discovery.</p>
  <div className="overview-filters" aria-label="Activity period">{([1,7,30] as const).map(n=><button key={n} aria-pressed={days===n} onClick={()=>setDays(n)}>{n===1?'Today':`${n} days`}</button>)}</div>
  <p className="overview-period">{current?`${current.start} – ${current.today}`:'Loading…'} · Europe/Zurich</p>
  {error&&<p role="alert">{error} <button onClick={()=>setVersion(v=>v+1)}>Retry</button></p>}
  {loading&&<p role="status">Updating overview…</p>}
  {current&&<>
   <AnalyticsPanel metrics={metrics} note="Percentages compare activity with the same length of time immediately before this period, ending at the same Zurich time of day. Account cards show current totals; their charts and percentages use creation dates of current accounts, grouped by their current registered/guest status. Past conversions and deleted accounts cannot be reconstructed. Games played includes replays; created games counts games still in the catalogue."/>
   <section className="overview-section"><h2>Search discovery</h2><div className="overview-search-stats"><p><strong>{format(current.activity.total_games)}</strong> public games in the sitemap</p><p><strong>{format(current.indexing.submitted_games)}</strong> games submitted to IndexNow</p><p><strong>{format(current.indexing.pending)}</strong> queued URL changes · {current.indexing.retrying} awaiting retry</p></div><p className="overview-automatic"><strong>Automatic indexing notifications are on.</strong> New public games are submitted automatically. Failed requests are retried daily. No button press is needed.</p><p>Google discovers games through the live sitemap and public game links. Bing and other IndexNow participants also receive automatic URL notifications.</p><p className="overview-note">Submission does not mean indexing. Search Console and Bing Webmaster Tools report actual search visibility. {current.indexing.key_verification_pending>0&&`${current.indexing.key_verification_pending} submissions await IndexNow key verification.`}</p>{!current.indexing.cronConfigured&&<p role="alert">Automatic retry scheduling needs configuration.</p>}<div className="community-actions"><a href="/sitemap.xml" target="_blank" rel="noreferrer">Open sitemap <ExternalLink size={14}/></a><button disabled={submitting} onClick={()=>void submit()}>{submitting?'Submitting…':'Retry due URLs now (optional)'}</button></div>{message&&<p role="status">{message}</p>}{current.indexing.last_submitted&&<p className="overview-note">Last accepted submission: {new Date(current.indexing.last_submitted).toLocaleString('en-GB',{timeZone:'Europe/Zurich'})} (Zurich)</p>}</section>
   <VercelTraffic days={days} version={version} connected={trafficConnected}/>
   <section className="overview-section"><h2>Traffic reports</h2><p>These services measure different things. Compare matching dates before comparing totals.</p><div className="overview-report-links"><a href="https://search.google.com/search-console?resource_id=sc-domain%3Aquizletgravity.com" target="_blank" rel="noreferrer"><strong>Google Search Console ↗</strong><span>Clicks and impressions in Google Search.</span></a><a href="https://www.bing.com/webmasters/home?siteUrl=https://quizletgravity.com/" target="_blank" rel="noreferrer"><strong>Bing Webmaster Tools ↗</strong><span>Clicks and impressions in Bing Search.</span></a><a href="https://vercel.com/markosarafs-projects/quizletgravity-launch/analytics" target="_blank" rel="noreferrer"><strong>Vercel Analytics ↗</strong><span>Measured visits and page views across traffic sources.</span></a></div></section>
   <section className="overview-section"><h2>Latest public games</h2><ul className="overview-recent">{current.recent.map(game=><li key={game.public_id}><Link href={sharedSetPath(game)}>{game.title}</Link><span>{game.term_count} terms · {new Date(game.created_at).toLocaleDateString('en-GB',{timeZone:'Europe/Zurich'})}</span></li>)}</ul></section>
  </>}
 </main>;
}
