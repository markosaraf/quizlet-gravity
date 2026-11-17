'use client';
import {useId,useState} from 'react';
import {changeLabel,type AnalyticsMetric} from '@/lib/analytics-metrics';
const number=(value:number)=>value.toLocaleString('en-US');
export function AnalyticsPanel({metrics,note}:{metrics:AnalyticsMetric[];note:string}){
 const [selected,setSelected]=useState(metrics[0]?.key),[hover,setHover]=useState<number|null>(null);
 const id=useId().replaceAll(':','');
 const metric=metrics.find(m=>m.key===selected)||metrics[0];
 if(!metric)return null;
 const points=metric.points,max=Math.max(1,...points.flatMap(p=>[p.value,p.previous??0]));
 const top=Math.ceil(max/4)*4;
 const x=(i:number)=>points.length===1?510:60+i/(points.length-1)*900;
 const y=(value:number)=>240-value/top*210;
 const path=(previous:boolean)=>points.map((p,i)=>`${i?'L':'M'}${x(i)},${y(previous?(p.previous??0):p.value)}`).join(' ');
 const active=hover===null?null:points[Math.min(hover,points.length-1)];
 return <section className="analytics-panel" aria-label="Selectable analytics">
  <div className="analytics-metrics" data-count={metrics.length}>{metrics.map(m=><button type="button" className="overview-metric analytics-card" key={m.key} aria-pressed={metric.key===m.key} aria-controls={id} onClick={()=>{setSelected(m.key);setHover(null);}}>
   <span className="analytics-card-label">{m.label}</span><span className="analytics-card-value">{number(m.value)}</span>
   <span className={`analytics-change ${m.previous!==null&&m.current>m.previous?'positive':m.previous!==null&&m.current<m.previous?'negative':''}`} aria-label={`${changeLabel(m.current,m.previous)} compared with previous period`}>{changeLabel(m.current,m.previous)}</span>
   <span className="analytics-card-note">{m.note}</span>
  </button>)}</div>
  <div id={id} className="analytics-detail">
   <div className="analytics-chart-heading"><h2>{metric.chartLabel}</h2><span>Daily</span></div>
   <p className="overview-note">{number(metric.current)} in selected period · {metric.previous===null?'previous period unavailable':`${number(metric.previous)} in previous period`}</p>
   <div className="analytics-hover" aria-live="polite">{active?<><strong>{active.date}: {number(active.value)}</strong>{active.previous!==null&&<span>{active.previousDate}: {number(active.previous)} in previous period</span>}</>:<span>Hover, tap or focus a point for daily counts.</span>}</div>
   <svg viewBox="0 0 1000 290" className="analytics-line-chart" role="group" aria-label={`${metric.chartLabel}. Current and previous period. Exact values in the table below.`} onPointerLeave={()=>setHover(null)}>
    <defs><linearGradient id={`${id}-fill`} x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor="#2563eb" stopOpacity=".20"/><stop offset="100%" stopColor="#2563eb" stopOpacity=".03"/></linearGradient></defs>
    {[0,1,2,3,4].map(n=><g key={n}><line x1="60" x2="960" y1={y(top*n/4)} y2={y(top*n/4)} stroke="currentColor" opacity=".12"/><text x="48" y={y(top*n/4)+4} textAnchor="end">{number(top*n/4)}</text></g>)}
    {points.length>1&&<path d={`${path(false)} L${x(points.length-1)},240 L${x(0)},240 Z`} fill={`url(#${id}-fill)`}/>}
    {metric.previous!==null&&<path d={path(true)} fill="none" stroke="#8b93a8" strokeWidth="2" strokeDasharray="6 5"/>}
    <path d={path(false)} fill="none" stroke="#2563eb" strokeWidth="3" strokeLinejoin="round"/>
    {points.map((p,i)=><g key={p.date}>
     {(i===0||i===points.length-1||i%Math.max(1,Math.ceil(points.length/5))===0)&&<text x={x(i)} y="270" textAnchor="middle">{p.date.slice(5)}</text>}
     {points.length===1&&p.previous!==null&&<circle cx={x(i)} cy={y(p.previous)} r={5} fill="#8b93a8"/>}
     <circle cx={x(i)} cy={y(p.value)} r={hover===i||points.length===1?5:2} fill="#2563eb"/>
     <rect className="analytics-hit" x={x(i)-Math.min(30,450/points.length)} y="15" width={Math.min(60,900/points.length)} height="230" fill="transparent" tabIndex={0} role="button" aria-label={`${p.date}: ${p.value}; previous ${p.previousDate}: ${p.previous??'unavailable'}`} onFocus={()=>setHover(i)} onPointerEnter={()=>setHover(i)} onClick={()=>setHover(i)} onKeyDown={e=>{if(e.key==='Enter'||e.key===' '){e.preventDefault();setHover(i);}}}/>
    </g>)}
   </svg>
   <p className="analytics-legend"><span>Selected period</span>{metric.previous!==null&&<span>Previous period</span>}</p>
   <details><summary>View daily counts</summary><table><thead><tr><th>Date</th><th>{metric.chartLabel}</th><th>Previous date</th><th>Previous count</th></tr></thead><tbody>{points.map(p=><tr className="overview-day" key={p.date}><th>{p.date}</th><td>{number(p.value)}</td><td>{p.previousDate}</td><td>{p.previous===null?'—':number(p.previous)}</td></tr>)}</tbody></table></details>
   <p className="overview-note">{note}</p>
  </div>
 </section>;
}
