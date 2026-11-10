'use client';
import {useEffect,useRef,useState} from 'react';
import Link from 'next/link';
import type {DiscoveredQuizletSet} from '@/lib/gravity/quizlet-map';
import './quizlet-discovery.css';

type Result=DiscoveredQuizletSet&{sharePath:string|null};
type Progress={message:string;failed?:boolean};
const PAGE_SIZE=20,MAX_BATCH=10;
export function QuizletDiscovery({onImported}:{onImported:()=>void}){
 const [topic,setTopic]=useState(''),[limit,setLimit]=useState(100);
 const [results,setResults]=useState<Result[]>([]),[scanned,setScanned]=useState<number|null>(null);
 const [selected,setSelected]=useState<string[]>([]),[progress,setProgress]=useState<Record<string,Progress>>({});
 const [page,setPage]=useState(0),[busy,setBusy]=useState<'discover'|'import'|null>(null),[error,setError]=useState('');
 const [stopping,setStopping]=useState(false);
 const stop=useRef(false);
 useEffect(()=>()=>{stop.current=true;},[]);
 const pages=Math.max(1,Math.ceil(results.length/PAGE_SIZE));
 const visible=results.slice(page*PAGE_SIZE,(page+1)*PAGE_SIZE);
 async function discover(event:React.FormEvent){
  event.preventDefault();if(busy)return;
  setBusy('discover');setError('');
  try{
   const response=await fetch('/api/admin/discover-quizlet',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({topic,limit})});
   const data=await response.json();if(!response.ok)throw Error(data.error||'Discovery failed.');
   setResults(data.sets);setScanned(data.linksScanned);setSelected([]);setProgress({});setPage(0);
  }catch(e){setError(e instanceof Error?e.message:'Discovery failed. Please retry.');}finally{setBusy(null);}
 }
 function select(id:string){setSelected(previous=>previous.includes(id)?previous.filter(s=>s!==id):previous.length<MAX_BATCH?[...previous,id]:previous);}
 async function importSelected(){
  if(busy||!selected.length)return;
  setBusy('import');setError('');setStopping(false);stop.current=false;
  let imported=false;
  try{
   for(const id of selected){
    if(stop.current)break;
    const item=results.find(s=>s.setId===id);if(!item||item.sharePath)continue;
    const started=Date.now();
    setProgress(p=>({...p,[id]:{message:'Importing…'}}));
    try{
     const response=await fetch('/api/import-quizlet',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({url:item.url})});
     const data=await response.json();
     if(!response.ok){
      setProgress(p=>({...p,[id]:{message:data.error||'Could not import this game.',failed:true}}));
      if([401,403,429].includes(response.status)){setError(data.error||'Import paused. Please retry later.');break;}
      continue;
     }
     if(typeof data.sharePath!=='string'||!data.sharePath.startsWith('/')||data.sharePath.startsWith('//'))throw Error('The import returned no game link.');
     setResults(p=>p.map(s=>s.setId===id?{...s,title:data.title||s.title,sharePath:data.sharePath}:s));
     setProgress(p=>({...p,[id]:{message:data.warning||'Ready to play'}}));
     setSelected(p=>p.filter(s=>s!==id));imported=true;
    }catch(e){setProgress(p=>({...p,[id]:{message:e instanceof Error?e.message:'Import failed. You can retry.',failed:true}}));}
    finally{
     // Respect the existing importer limit of ten new imports per minute.
     while(!stop.current&&Date.now()-started<6500)await new Promise(resolve=>setTimeout(resolve,250));
    }
   }
  }finally{setBusy(null);setStopping(false);if(imported)onImported();}
 }
 return <section className="quizlet-discovery" aria-labelledby="discovery-title">
  <h2 id="discovery-title">Discover Quizlet games</h2>
  <p>Find public Quizlet sets, then select which ones to add to the games catalogue.</p>
  <form onSubmit={discover}>
   <label>Topic (optional)<input value={topic} onChange={e=>setTopic(e.target.value)} maxLength={120} placeholder="e.g. French vocabulary or Einmaleins" disabled={!!busy}/></label>
   <label>Links to check<select value={limit} onChange={e=>setLimit(Number(e.target.value))} disabled={!!busy}><option value={100}>100</option><option value={500}>500</option><option value={1000}>1,000</option></select></label>
   <button type="submit" disabled={!!busy}>{busy==='discover'?'Finding games…':'Find games'}</button>
  </form>
  <p className="discovery-note">A topic ranks relevant links first. Leave it empty for broader discovery. Results are not a complete list of Quizlet sets and may include unrelated or unavailable sets.</p>
  {error&&<p role="alert">{error}</p>}
  {scanned!==null&&<>
   <p role="status">{results.length} unique set links found from {scanned} discovered links.</p>
   {!results.length?<p>Try another topic or increase the number of links.</p>:<>
    <div className="community-actions">
     <button disabled={!!busy||!visible.some(s=>!s.sharePath)} onClick={()=>setSelected(visible.filter(s=>!s.sharePath).slice(0,MAX_BATCH).map(s=>s.setId))}>Select up to 10 on this page</button>
     <button disabled={!!busy||!selected.length} onClick={()=>setSelected([])}>Clear selection</button>
     <button disabled={!!busy||!selected.length} onClick={()=>void importSelected()}>Import selected ({selected.length})</button>
     {busy==='import'&&<button disabled={stopping} onClick={()=>{stop.current=true;setStopping(true);}}>{stopping?'Stopping after current import…':'Stop after current import'}</button>}
    </div>
    <p className="discovery-note">Choose up to 10 games at a time. Existing games reuse their link and leaderboard. New imports appear publicly and keep the original Quizlet creator credit.</p>
    <ul className="discovery-results">{visible.map(item=><li key={item.setId}>
     <input type="checkbox" aria-label={'Select '+item.title} checked={selected.includes(item.setId)} disabled={!!busy||!!item.sharePath||(!selected.includes(item.setId)&&selected.length>=MAX_BATCH)} onChange={()=>select(item.setId)}/>
     <div><a href={item.url} target="_blank" rel="noopener noreferrer">{item.title}</a>{item.description&&<p>{item.description}</p>}
      {item.sharePath&&<Link href={item.sharePath}>Open game</Link>}
      {progress[item.setId]&&<small role="status">{progress[item.setId].failed?'Not imported: ':''}{progress[item.setId].message}</small>}
      {item.sharePath&&!progress[item.setId]&&<small>Already in your catalogue</small>}
     </div>
    </li>)}</ul>
    <nav className="community-pagination" aria-label="Discovered games pages"><button disabled={!page||busy==='discover'} onClick={()=>setPage(p=>p-1)}>Previous results</button><span>{page+1} of {pages}</span><button disabled={page+1>=pages||busy==='discover'} onClick={()=>setPage(p=>p+1)}>Next results</button></nav>
   </>}
  </>}
 </section>;
}
