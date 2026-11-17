const PROJECT='prj_R6u5AFA00O4splXf4tj5JQh3chL2';
const TEAM='team_p1My5mPrmKTl9LepAtU6Cjt2';
type TrafficRow={timestamp?:string;visitors:number;pageviews:number;environment?:string};
function dateOffset(date:Date,offset:number){const d=new Date(date);d.setUTCDate(d.getUTCDate()+offset);return d.toISOString().slice(0,10);}
async function query(since:string,until:string,by:'day'|'environment'){
 const token=process.env.VERCEL_ANALYTICS_TOKEN;
 if(!token)throw Error('Vercel Analytics connection needs configuration.');
 const params=new URLSearchParams({projectId:PROJECT,teamId:TEAM,since,until,by,limit:'100',filter:"environment eq 'production'"});
 const response=await fetch(`https://api.vercel.com/v1/query/web-analytics/visits/aggregate?${params}`,{headers:{Authorization:`Bearer ${token}`},signal:AbortSignal.timeout(15000),next:{revalidate:300}});
 if(!response.ok)throw Error(response.status===401||response.status===403?'Vercel Analytics authorization needs renewal.':'Vercel Analytics is temporarily unavailable.');
 const body=await response.json();
 if(!Array.isArray(body.data)||body.data.some((r:TrafficRow)=>!Number.isFinite(r.visitors)||!Number.isFinite(r.pageviews)))throw Error('Vercel Analytics returned an unexpected response.');
 return body.data as TrafficRow[];
}
export async function vercelAnalytics(days:1|7|30){
 const now=new Date(),until=dateOffset(now,0),since=dateOffset(now,1-days),previousSince=dateOffset(now,1-2*days),previousUntil=dateOffset(now,-days);
 const previousAvailable=days<30; // Hobby API retains 31 days; never substitute zero for unavailable history.
 const [daily,previousDaily,totalRows,previousTotalRows]=await Promise.all([query(since,now.toISOString(),'day'),previousAvailable?query(previousSince,previousUntil+'T23:59:59.999Z','day'):Promise.resolve([]),query(since,now.toISOString(),'environment'),previousAvailable?query(previousSince,previousUntil+'T23:59:59.999Z','environment'):Promise.resolve([])]);
 const current=totalRows.find(r=>r.environment==='production'),previous=previousTotalRows.find(r=>r.environment==='production');
 const points=Array.from({length:days},(_,i)=>{const date=dateOffset(now,1-days+i),previousDate=dateOffset(now,1-2*days+i);return {date,previousDate,current:daily.find(r=>r.timestamp?.slice(0,10)===date)||{visitors:0,pageviews:0},previous:previousDaily.find(r=>r.timestamp?.slice(0,10)===previousDate)||{visitors:0,pageviews:0}};});
 return {days,previousAvailable,since,until,previousSince,previousUntil,timeZone:'UTC',fetchedAt:now.toISOString(),metrics:([
  ['visitors','Visitors'],['pageviews','Page Views'],
 ] as const).map(([key,label])=>({key,label,value:current?.[key]||0,current:current?.[key]||0,previous:previousAvailable?(previous?.[key]||0):null,note:'Vercel · production traffic',chartLabel:label,points:points.map(p=>({date:p.date,previousDate:p.previousDate,value:p.current[key],previous:previousAvailable?p.previous[key]:null}))}))};
}
