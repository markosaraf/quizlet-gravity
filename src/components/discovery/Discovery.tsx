'use client';

import Link from 'next/link';
import {useEffect, useRef, useState, type FormEvent} from 'react';
import {createPortal} from 'react-dom';
import {LocalWalkthrough} from '@/components/community/LocalWalkthrough';
import {authClient} from '@/lib/community/auth-client';
import {useRouter} from 'next/navigation';
import {Play, Search, ChevronLeft, ChevronRight, Plus, Link2, ArrowLeft} from 'lucide-react';
import {api, AccountDialog, type SetRecord} from '@/components/community/Community';
import {sharedSetPath} from '@/lib/community/set-links';
import {ImportProgress,progressAfterMs} from '@/components/gravity/ImportProgress';
import {quizletPasteValue} from '@/lib/gravity/quizlet-share-input';
import {parseCsv,parsePastedList,type Separator} from '@/lib/gravity/parse';
import {ThemeToggle} from '@/components/community/ThemeToggle';
import {CardImagePicker} from '@/components/gravity/CardImagePicker';
import {GravityApp} from '@/components/gravity/GravityApp';
import {importedCardsToTerms} from '@/lib/gravity/import-cards';
import type {GravitySet, GravityTerm} from '@/lib/gravity/types';
import '@/gravity/gravity.css';
import './discovery.css';

type LocalGame={set:GravitySet;terms:GravityTerm[]};
const examples=[['2 + 3','5'],['10 − 4','6'],['3 × 3','9'],['8 + 4','12'],['6 × 2','12'],['20 ÷ 4','5'],['7 + 8','15'],['9 − 6','3'],['4 × 4','16'],['18 ÷ 3','6']];
const example:LocalGame={set:{id:'local-example',title:'Quick maths',wordLang:'en',defLang:'en'},terms:importedCardsToTerms(examples.map(([term,definition])=>({term,definition})))!};

export function ExampleGame(){return <GravityApp localGame={example} autoPlay exitHref="/"/>;}
export function DiscoveryLanding(){
 const [tutorialEnabled,setTutorialEnabled]=useState(false),[tutorialOpen,setTutorialOpen]=useState(false);
 const {data:session}=authClient.useSession();
 useEffect(()=>{api('config').then(r=>setTutorialEnabled(r.tutorialEnabled===true)).catch(()=>{});},[]);
 const [query,setQuery]=useState('');const [page,setPage]=useState(0);const gallery=useRef<HTMLDivElement>(null);
 const [games,setGames]=useState<SetRecord[]>([]),[offset,setOffset]=useState(0),[more,setMore]=useState(false),[loading,setLoading]=useState(true),[error,setError]=useState('');
 useEffect(()=>{let active=true;const controller=new AbortController();const timer=setTimeout(async()=>{setLoading(true);try{const response=await fetch('/api/community/sets?q='+encodeURIComponent(query)+'&offset='+offset+'&sort=popular',{signal:controller.signal});const result=await response.json();if(!response.ok)throw Error(result.error);if(active){setGames(previous=>offset?[...previous,...result.sets]:result.sets);setMore(result.hasMore);setError('');}}catch(e){if(active)setError(e instanceof Error?e.message:'Unable to load games.');}finally{if(active)setLoading(false);}},200);return()=>{active=false;clearTimeout(timer);controller.abort();};},[query,offset,session?.user.id]);
 const groups=Array.from({length:Math.ceil(games.length/6)},(_,i)=>games.slice(i*6,i*6+6));
 function move(direction:number){const el=gallery.current;if(el)el.scrollBy({left:direction*el.clientWidth,behavior:'smooth'});}
 return <main className="d-shell d-landing">
  <div className="d-topline"><div className="d-try"><Link className="d-button d-primary d-example" href="/example"><Play size={21} fill="currentColor"/>Try Example Game</Link><span>Jump straight in. No account needed.</span></div><div className="d-theme-tools">{tutorialEnabled&&<button className="d-button d-secondary d-tutorial" onClick={()=>setTutorialOpen(true)}>Tutorial</button>}<ThemeToggle/></div></div>
  <section className="d-discover" aria-labelledby="d-heading">
   <h1 id="d-heading">Search and/or choose a game.</h1>
   <label className="d-search"><Search size={24}/><span className="d-sr">Search games</span><input type="search" placeholder="Search games by title or creator" value={query} onChange={e=>{setQuery(e.target.value);setGames([]);setOffset(0);setPage(0);gallery.current?.scrollTo({left:0});}}/></label>
   <div className="d-gallery-label"><span aria-live="polite">{query?`Matching games${more?' (more available)':''}`:'Games to try'}</span><div className="d-gallery-controls">{groups.length>1&&<><span>{page+1} / {groups.length}</span><button aria-label="Previous games" disabled={page===0} onClick={()=>move(-1)}><ChevronLeft size={19}/></button><button aria-label="More games" disabled={page===groups.length-1} onClick={()=>move(1)}><ChevronRight size={19}/></button></>}</div></div>
   <div className="d-gallery" ref={gallery} onScroll={e=>{const el=e.currentTarget;setPage(Math.round(el.scrollLeft/el.clientWidth));}} aria-label="Swipe through games">
    {groups.map((group,index)=><div className="d-game-page" key={index}>{group.map((s)=><Link className="d-game" href={sharedSetPath(s)} key={s.id}><small>{s.term_count.toLocaleString()} terms</small><h2>{s.title}</h2><p>{s.creator_name?<>Original Quizlet set creator:<br/><strong>{s.creator_name}</strong>{!s.quizlet_id&&<><br/>Quizlet Gravity game creator: {s.added_by}</>}</>:<>Quizlet Gravity game creator:<br/><strong>{s.added_by}</strong></>}</p><span className="d-play"><Play size={15} fill="currentColor"/>Play game</span></Link>)}</div>)}
   </div>
   {loading&&<p role="status">Loading games…</p>}{error&&<p role="alert">{error}</p>}{more&&<button className="d-button d-secondary" disabled={loading} onClick={()=>setOffset(n=>n+24)}>More games</button>}
   {!loading&&!error&&!games.length&&<p className="d-empty">No matching games. Try another title or import a Quizlet set below.</p>}
  </section>
  <div className="d-alternatives"><div><Link href="/create-set" data-tour="create-game-bottom" className="d-button d-secondary"><Plus size={21}/>Create your own game</Link><Link href="/import-game" data-tour="import-game" className="d-button d-secondary"><Link2 size={21}/>Import game from Quizlet</Link></div></div>
 {tutorialOpen&&createPortal(<LocalWalkthrough hasUser={!!session?.user} openAccount={()=>{setTutorialOpen(false);document.querySelector<HTMLButtonElement>('[data-tour="username"]')?.click();}} onClose={()=>setTutorialOpen(false)}/>,document.body)}
 </main>;
}

function Back(){return <Link className="d-back" href="/"><ArrowLeft size={18}/>Back to games</Link>;}
type EditableCard={term:string;definition:string;termImage?:string;definitionImage?:string};
const completeCard=(r:EditableCard)=>!!((r.term.trim()||r.termImage)&&(r.definition.trim()||r.definitionImage));
export function CreateGame({sourceId}:{sourceId?:string}){
 const router=useRouter();const {data:session}=authClient.useSession();
 const [source,setSource]=useState<SetRecord|null>(null),[sourceLoading,setSourceLoading]=useState(!!sourceId);
 const [title,setTitle]=useState(''),[rows,setRows]=useState<EditableCard[]>([{term:'',definition:''},{term:'',definition:''}]);
 const [busy,setBusy]=useState(false),[error,setError]=useState(''),[accountOpen,setAccountOpen]=useState(false),[pendingSave,setPendingSave]=useState(false);
 const [paste,setPaste]=useState(''),[separator,setSeparator]=useState<Separator>('comma');
 useEffect(()=>{if(!sourceId)return;let active=true;api('sets/'+sourceId).then(s=>{if(active){setSource(s);setTitle(s.title);setRows(s.cards);}}).catch(e=>{if(active)setError(e.message);}).finally(()=>{if(active)setSourceLoading(false);});return()=>{active=false;};},[sourceId]);
 async function save(){if(busy)return;setError('');const current=await authClient.getSession();if(!current.data){setPendingSave(true);setAccountOpen(true);return;}setBusy(true);try{const result=await api('sets',{title:title.trim(),cards:rows.filter(completeCard),...(sourceId?{sourceSetId:sourceId}:{})});router.push(sharedSetPath(result));}catch(e){setError(e instanceof Error?e.message:'Unable to save game.');}finally{setBusy(false);}}
 function submit(e:FormEvent){e.preventDefault();if(title.trim()&&rows.filter(completeCard).length>=2)void save();}
 function addTerms(terms:GravityTerm[]){if(!terms.length){setError('No pairs found. Check the selected separator.');return;}setRows(previous=>[...previous.filter(r=>r.term||r.definition||r.termImage||r.definitionImage),...terms.map(t=>({term:t.word,definition:t.definition}))]);setPaste('');setError('');}
 const ready=!busy&&!sourceLoading&&(!sourceId||!!source)&&!!title.trim()&&rows.filter(completeCard).length>=2;
 return <main className="d-shell d-editor"><Back/><h1>Create your own game</h1><p className="d-subtitle">Name your game, add at least two pairs using text, images, or both, then play.</p>
  {!source&&<Link href="/import-edit" className="d-import-edit d-button d-secondary"><Link2 size={20}/>Import &amp; edit from Quizlet</Link>}
  {source&&<p className="d-source">Editing {source.title} · Original Quizlet set creator: <a href={source.creator_url} target="_blank" rel="noreferrer">{source.creator_name}</a>. Imported images are included.</p>}
  {sourceLoading&&<p role="status">Loading original set…</p>}
  {!session?.user&&<p><button type="button" className="d-button d-secondary" onClick={()=>{setPendingSave(false);setAccountOpen(true);}}>Log in</button> to upload images and save your game.</p>}
  <details className="d-bulk"><summary>Paste pairs or upload a CSV</summary><label>Separator <select value={separator} onChange={e=>setSeparator(e.target.value as Separator)}><option value="comma">Comma</option><option value="semicolon">Semicolon</option><option value="dash">Dash</option></select></label><textarea aria-label="Terms and definitions" placeholder="One term and answer per line" value={paste} onChange={e=>setPaste(e.target.value)}/><button type="button" className="d-button d-secondary" onClick={()=>addTerms(parsePastedList(paste,separator))}>Add pairs</button><label className="d-button d-secondary">Upload CSV<input type="file" accept=".csv,text/csv" onChange={async e=>{const file=e.target.files?.[0];if(file){const result=parseCsv(await file.text(),separator);addTerms(result.terms);}e.target.value='';}}/></label></details>
  <form onSubmit={submit}>
  <label className="d-label">Game title<input required maxLength={120} placeholder="e.g. French food vocabulary" value={title} onChange={e=>setTitle(e.target.value)}/></label>
  <div className="d-pair-head"><span>Term on the asteroid</span><span>Answer (text or image)</span></div>
  {rows.map((r,i)=><div className="d-pair" key={i}>
   <div className="d-pair-side"><input aria-label={`Term ${i+1}`} placeholder={!source&&i===0&&!r.termImage?'e.g. le pain':'Term (optional with image)'} value={r.term} onChange={e=>setRows(prev=>prev.map((x,j)=>j===i?{...x,term:e.target.value}:x))}/><CardImagePicker disabled={!session?.user} label={`Term ${i+1}`} image={r.termImage} onChange={image=>setRows(prev=>prev.map((x,j)=>j===i?{...x,termImage:image}:x))}/></div>
   <div className="d-pair-side"><input aria-label={`Answer ${i+1}`} placeholder={!source&&i===0&&!r.definitionImage?'bread':'Answer (optional with image)'} value={r.definition} onChange={e=>setRows(prev=>prev.map((x,j)=>j===i?{...x,definition:e.target.value}:x))}/><CardImagePicker disabled={!session?.user} label={`Answer ${i+1}`} image={r.definitionImage} onChange={image=>setRows(prev=>prev.map((x,j)=>j===i?{...x,definitionImage:image}:x))}/></div>
  </div>)}
  <div className="d-form-actions"><button type="button" className="d-button d-secondary" onClick={()=>setRows([...rows,{term:'',definition:''}])}><Plus size={20}/>Add another pair</button><button className="d-button d-primary" disabled={!ready}>{busy?'Saving…':'Create & play'}</button></div>
 </form>{error&&<p role="alert" className="d-error">{error}</p>}<AccountDialog open={accountOpen} onOpenChange={setAccountOpen} onDone={()=>{if(pendingSave)void save();}}/></main>;
}

export function ImportGame({edit=false}:{edit?:boolean}){
 const [url,setUrl]=useState(''),[error,setError]=useState(''),[busy,setBusy]=useState(false),[accountOpen,setAccountOpen]=useState(false),[progress,setProgress]=useState<number|null>(null);const router=useRouter();const request=useRef<AbortController|null>(null);
 useEffect(()=>()=>request.current?.abort(),[]);
 async function importGame(){if(!url.trim()||request.current)return;const controller=new AbortController();request.current=controller;const timeout=setTimeout(()=>controller.abort(),75000);let ticker:ReturnType<typeof setInterval>|undefined;setBusy(true);setError('');setProgress(null);try{const current=await authClient.getSession();if(controller.signal.aborted)return;if(!current.data){setAccountOpen(true);return;}setProgress(0);const started=Date.now();ticker=setInterval(()=>setProgress(progressAfterMs(Date.now()-started)),150);const response=await fetch('/api/import-quizlet',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({url:quizletPasteValue(url)}),signal:controller.signal});const result=await response.json();if(!response.ok)throw Error(result.error||'Unable to import this Quizlet set.');if(!result.sharedId)throw Error('The game could not be saved. Please try again.');clearInterval(ticker);setProgress(100);router.push(edit?'/edit-game/'+result.sharedId:result.sharePath);}catch(e){setProgress(null);setError(controller.signal.aborted?'The import took too long. Please try again.':e instanceof Error?e.message:'Please try again.');}finally{clearInterval(ticker);clearTimeout(timeout);request.current=null;setBusy(false);}}
 function submit(e:FormEvent){e.preventDefault();void importGame();}
 return <main className="d-shell d-editor"><Back/><h1>{edit?'Import & edit from Quizlet':'Import game from Quizlet'}</h1><p className="d-subtitle">{edit?'Start with a public Quizlet set. Keep its images, then change or add your own text and images.':'Turn a public Quizlet set into a game, including its images.'}</p><ol className="d-steps"><li><span>1</span><div><strong>Find a set</strong><p><a href="https://quizlet.com/latest" target="_blank" rel="noreferrer">Open Quizlet</a> and choose a public set.</p></div></li><li><span>2</span><div><strong>Copy its link</strong><p>Copy the address, or choose Share → Copy link in the Quizlet app.</p></div></li><li><span>3</span><div><strong>Come back and paste</strong><p>{edit?'Paste the link below, then edit the terms, answers, or images before playing.':'Paste the link below to add the game and play.'}</p></div></li></ol><form onSubmit={submit}><label className="d-label">Quizlet set link<input autoCapitalize="none" autoCorrect="off" spellCheck={false} onPaste={e=>{e.preventDefault();setUrl(quizletPasteValue(e.clipboardData.getData('text/plain')));}} value={url} onChange={e=>{setUrl(e.target.value);setError('');}} placeholder="https://quizlet.com/…" required/></label>{error&&<p className="d-error" role="alert">{error}</p>}<button className="d-button d-primary" disabled={busy||!url.trim()}>{busy?'Importing…':edit?'Import & edit':'Add & play'}</button></form>{progress!==null&&<ImportProgress progress={progress} busy={busy}/>}<AccountDialog open={accountOpen} onOpenChange={setAccountOpen} onDone={()=>void importGame()}/></main>;
}
