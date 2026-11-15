'use client';

import {useEffect, useRef, useState, type FormEvent} from 'react';
import {AccountDialog} from '@/components/community/Community';
import type {DiscoveredQuizletSet} from '@/lib/gravity/quizlet-map';
import type {QuizletImportResult} from '@/lib/gravity/quizlet-parser';
import './quizlet-search.css';

type Action = {kind: 'search'; mode: 'title' | 'creator'; query: string} | {kind: 'preview'; url: string};
export function QuizletSearch({onImport, importing, edit}: {onImport: (url: string) => void; importing: boolean; edit: boolean}) {
  const [mode, setMode] = useState<'title' | 'creator'>('title');
  const [query, setQuery] = useState('');
  const [sets, setSets] = useState<DiscoveredQuizletSet[] | null>(null);
  const [preview, setPreview] = useState<QuizletImportResult | null>(null);
  const [partial, setPartial] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [accountOpen, setAccountOpen] = useState(false);
  const request = useRef<AbortController | null>(null);
  const pending = useRef<Action | null>(null);
  const previewHeading = useRef<HTMLHeadingElement>(null);
  useEffect(() => () => request.current?.abort(), []);
  useEffect(() => { if (preview) previewHeading.current?.focus(); }, [preview]);

  async function run(action: Action) {
    if (request.current || importing) return;
    pending.current = action;
    const controller = new AbortController();
    request.current = controller;
    const timeout = setTimeout(() => controller.abort(), 65000);
    setBusy(true); setError(''); setPreview(null);
    if (action.kind === 'search') { setSets(null); setPartial(false); }
    try {
      const response = await fetch(action.kind === 'search' ? '/api/search-quizlet' : '/api/import-quizlet', {
        method: 'POST', headers: {'Content-Type': 'application/json'}, signal: controller.signal,
        body: JSON.stringify(action.kind === 'search' ? {mode: action.mode, query: action.query} : {url: action.url, preview: true}),
      });
      const result = await response.json();
      if (response.status === 401) { setAccountOpen(true); return; }
      if (!response.ok) throw Error(result.error || 'Could not load this Quizlet set.');
      if (action.kind === 'search') { setSets(result.sets); setPartial(result.creator?.complete === false); }
      else setPreview(result);
    } catch (error) {
      setError(controller.signal.aborted ? 'This took too long. Please try again or paste a Quizlet link below.' : error instanceof Error ? error.message : 'Please try again.');
    } finally { clearTimeout(timeout); request.current = null; setBusy(false); }
  }
  function submit(event: FormEvent) { event.preventDefault(); void run({kind: 'search', mode, query: query.trim()}); }
  return <section className="quizlet-search" aria-labelledby="quizlet-search-title">
    <h2 id="quizlet-search-title">Search Quizlet</h2>
    <p>Find a public set, check its terms and definitions, then import it.</p>
    <form onSubmit={submit}>
      <div className="quizlet-search-modes" role="group" aria-label="Search Quizlet by">
        {(['title', 'creator'] as const).map(value => <button type="button" className="d-button d-secondary" key={value} aria-pressed={mode === value} disabled={busy || importing} onClick={() => {setMode(value); setError('');}}>{value === 'title' ? 'Title' : 'Creator'}</button>)}
      </div>
      <label className="d-label">{mode === 'title' ? 'Set title or topic' : 'Quizlet creator username'}<input type="search" value={query} onChange={e => setQuery(e.target.value)} maxLength={120} autoCapitalize="none" autoCorrect="off" spellCheck={false} placeholder={mode === 'title' ? 'e.g. French food vocabulary' : 'Exact Quizlet username'} required disabled={busy || importing}/></label>
      <button className="d-button d-primary" disabled={busy || importing || !query.trim()}>{busy ? 'Loading…' : 'Search Quizlet'}</button>
    </form>
    {busy && <p role="status">{pending.current?.kind === 'preview' ? 'Loading terms and definitions…' : 'Searching public Quizlet sets…'}</p>}
    {error && <p className="d-error" role="alert">{error}</p>}
    {preview ? <div className="quizlet-preview">
      <button type="button" className="d-button d-secondary" disabled={importing} onClick={() => setPreview(null)}>Back to search results</button>
      <h3 ref={previewHeading} tabIndex={-1}>{preview.title}</h3>
      <p>{preview.cards.length} terms{preview.creatorName ? ` · By ${preview.creatorName}` : ''}</p>
      <div className="quizlet-preview-actions">
      <button type="button" className="d-button d-primary" disabled={importing} onClick={() => onImport(preview.url)}>{importing ? 'Importing…' : edit ? 'Import & edit this set' : 'Import & play this set'}</button>
      </div>
      <div className="quizlet-preview-pairs" role="region" aria-label="Terms and definitions" tabIndex={0}>
        <table><thead><tr><th scope="col">Term</th><th scope="col">Definition</th></tr></thead><tbody>{preview.cards.map((card, index) => <tr key={index}>
          <td>{card.term}{card.termImage && <img src={card.termImage} alt="Term illustration" loading="lazy"/>}</td>
          <td>{card.definition}{card.definitionImage && <img src={card.definitionImage} alt="Definition illustration" loading="lazy"/>}</td>
        </tr>)}</tbody></table>
      </div>
    </div> : sets && <div className="quizlet-search-results">
      <p role="status">{sets.length ? `${sets.length} public ${sets.length === 1 ? 'set' : 'sets'} found` : 'No public sets found. Try another title or username, or paste a link below.'}</p>
      {partial && <p>Some of this creator’s public sets could not be loaded. You can also paste a specific set link below.</p>}
      <ul>{sets.map(set => <li key={set.setId}><div><h3>{set.title}</h3>{set.description && <p>{set.description}</p>}</div><div className="quizlet-result-actions"><button type="button" className="d-button d-secondary" disabled={busy || importing} onClick={() => void run({kind: 'preview', url: set.url})}>View terms</button><button type="button" className="d-button d-primary" disabled={busy || importing} onClick={() => onImport(set.url)}>{edit ? 'Import & edit' : 'Import & play'}</button></div></li>)}</ul>
    </div>}
    <AccountDialog open={accountOpen} onOpenChange={setAccountOpen} onDone={() => {if (pending.current) void run(pending.current);}}/>
  </section>;
}
