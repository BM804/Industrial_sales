'use client';
import { useEffect, useState } from 'react';
import { ChevronDown, ChevronRight, History, LoaderCircle } from 'lucide-react';
import { formatINR } from '../../lib/pricing-rules';
import { apiFetch, type Deal, type HistoryRecord } from '../../lib/api';

export function CustomerHistory({deals=[],activeDealId='',refreshToken=0}:{deals?:Deal[];activeDealId?:string;refreshToken?:number}) {
  const [records,setRecords]=useState<HistoryRecord[]>([]);
  const [error,setError]=useState('');
  const [loading,setLoading]=useState(true);
  const [expandedDealId,setExpandedDealId]=useState('');
  useEffect(()=>{let canceled=false;setLoading(true);setError('');apiFetch<HistoryRecord[]>('/api/negotiations').then(items=>{if(!canceled)setRecords(items)}).catch(e=>{if(!canceled)setError(e instanceof Error?e.message:'Could not load negotiation history.')}).finally(()=>{if(!canceled)setLoading(false)});return()=>{canceled=true}},[refreshToken]);
  const selectedDeal=deals.find(deal=>deal.id===activeDealId);
  const dealRounds=(dealId:string)=>records.filter(record=>record.dealId===dealId).sort((a,b)=>(a.createdAt||'').localeCompare(b.createdAt||''));
  const normalizeTechnicality=(name:string)=>name.replace(/\s*[·-]\s*Phase\s*\d+$/i,'').replace(/\s+phase\s*\d+$/i,'').trim().toLowerCase();
  const normalizeSector=(sector:string)=>sector.trim().toLowerCase().replace(/\s+/g,' ');
  const genericSectors=new Set(['industrial','industry','manufacturing','all sector','all sectors']);
  const selectedSector=selectedDeal?normalizeSector(selectedDeal.tag):'';
  const hasSpecificSector=Boolean(selectedSector&&!genericSectors.has(selectedSector));
  const wonBacklog=selectedDeal?deals.filter(deal=>deal.stage==='Closed Won'&&(
    normalizeTechnicality(deal.name)===normalizeTechnicality(selectedDeal.name)||
    (hasSpecificSector&&normalizeSector(deal.tag)===selectedSector)
  )):[];
  const renderRounds=(rounds:HistoryRecord[])=>rounds.length?<div className="negotiation-round-list">{rounds.map((record,index)=><article className="negotiation-round-card" key={record.id}><div className="negotiation-round-head"><b>Round {index+1}</b><span>{record.suggestionApplied?'AI suggestion applied':record.aiSuggestion?.toLowerCase().includes('pending')?'AI suggestion pending':record.aiSuggestion?'AI suggestion saved':'No AI suggestion'}</span></div><div className="negotiation-round-values"><div><small>Amount quoted</small><b>{formatINR(record.quote)}</b></div><div><small>Client counter offer</small><b>{formatINR(record.firstCounter)}</b></div></div><div className="negotiation-round-reason"><small>Client reason</small><p>{record.objection}</p></div><div className="negotiation-round-ai"><small>AI suggestion</small><p>{record.aiSuggestion||record.response||'No AI response recorded.'}</p></div></article>)}</div>:<div className="history-empty">No submitted negotiation rounds have been saved for this project.</div>;
  return <section className="panel customer-history"><div className="panel-head"><div><h2>Negotiation history</h2><p>Submitted counter offers and AI guidance are saved by project.</p></div><div className="history-badge"><History size={14}/> ROUND HISTORY</div></div>
    {error&&<div className="app-message" role="alert">{error}</div>}
    {loading?<div className="loading-workspace"><LoaderCircle className="spin" size={16}/> Loading negotiation rounds…</div>:<>
      <div className="history-section-head"><div><h3>Current project rounds</h3><p>{selectedDeal?`${selectedDeal.customer} · ${selectedDeal.name}`:'Select a deal in the negotiation desk to see its rounds.'}</p></div></div>
      {selectedDeal&&renderRounds(dealRounds(selectedDeal.id))}
      <div className="history-section-head"><div><h3>Past won projects in this segment</h3><p>Only won work matching the selected project’s sector or technicality is shown.</p></div></div>
      {!selectedDeal?<div className="history-empty">Choose a current project to find related won work.</div>:wonBacklog.length?<div className="history-project-list">{wonBacklog.map(deal=>{const expanded=expandedDealId===deal.id;return <div className="history-past-project" key={deal.id}><button type="button" aria-expanded={expanded} onClick={()=>setExpandedDealId(expanded?'':deal.id)}><span><b>{deal.name}</b><small>{deal.customer} · {deal.tag} · Closed Won</small></span><strong>{formatINR(deal.value)}</strong>{expanded?<ChevronDown size={16}/>:<ChevronRight size={16}/>}</button>{expanded&&renderRounds(dealRounds(deal.id))}</div>})}</div>:<div className="history-empty">No closed won projects match this project’s segment yet.</div>}
    </>}
  </section>;
}
