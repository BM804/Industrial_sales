'use client';
import { useEffect, useMemo, useState } from 'react';
import { ArrowLeft, Plus, History, Trash2, LoaderCircle } from 'lucide-react';
import { formatINR } from '../../lib/pricing-rules';
import { apiFetch, type Deal, type HistoryRecord } from '../../lib/api';

type RecordItem = HistoryRecord;
const historyKey=(record:RecordItem)=>record.dealId||record.projectName||record.customerType;

export function CustomerHistory({deals=[],activeDealId=''}:{deals?:Deal[];activeDealId?:string}) {
  const [records, setRecords] = useState<RecordItem[]>([]);
  const [dealId, setDealId] = useState(activeDealId);
  const [customerType, setCustomerType] = useState('');
  const [sector, setSector] = useState('Automotive');
  const [quote, setQuote] = useState('');
  const [firstCounter, setFirstCounter] = useState('');
  const [closedAt, setClosedAt] = useState('');
  const [objection, setObjection] = useState('');
  const [response, setResponse] = useState('');
  const [outcome, setOutcome] = useState<RecordItem['outcome']>('Open');
  const [filterSector, setFilterSector] = useState('All sectors');
  const [detailKey,setDetailKey]=useState<string|null>(null);
  const [busy,setBusy]=useState(false);
  const [error,setError]=useState('');
  useEffect(() => { apiFetch<RecordItem[]>('/api/negotiations').then(setRecords).catch(e=>setError(e instanceof Error?e.message:'Could not load negotiation history.')); }, []);
  useEffect(()=>{if(activeDealId)setDealId(activeDealId)},[activeDealId]);
  const selectedDeal=deals.find(deal=>deal.id===dealId);
  const scopedRecords = useMemo(() => records.filter(r => filterSector === 'All sectors' || r.sector === filterSector), [records, filterSector]);
  const selectedHistory=records.filter(record=>detailKey!==null&&historyKey(record)===detailKey).sort((a,b)=>(a.createdAt||'').localeCompare(b.createdAt||''));
  const deleteRecord=async(id:string)=>{if(!window.confirm('Delete this negotiation round?'))return;try{await apiFetch(`/api/negotiations/${id}`,{method:'DELETE'});setRecords(current=>current.filter(record=>record.id!==id))}catch(err){setError(err instanceof Error?err.message:'Could not delete record.')}};
  const grouped=new Map<string,RecordItem[]>();
  for(const record of scopedRecords){const key=historyKey(record);grouped.set(key,[...(grouped.get(key)||[]),record]);}
  const recordForm= <form className="history-form" onSubmit={async e => { e.preventDefault(); setBusy(true);setError('');try{const projectName=selectedDeal?.name||customerType.trim();const saved=await apiFetch<RecordItem>('/api/negotiations',{method:'POST',body:JSON.stringify({dealId:dealId||null,projectName,customerType:customerType.trim()||projectName,sector,quote:Number(quote),firstCounter:Number(firstCounter),closedAt:Number(closedAt),outcome,objection:objection.trim(),response:response.trim()})});setRecords(current=>[saved,...current]);setCustomerType('');setQuote('');setFirstCounter('');setClosedAt('');setObjection('');setResponse('')}catch(err){setError(err instanceof Error?err.message:'Could not save record.')}finally{setBusy(false)}}}>
      <label>Project / customer<input required value={customerType} onChange={e => setCustomerType(e.target.value)} placeholder={selectedDeal?.name||'Project name or customer segment'}/></label>
      <label>Link to opportunity<select value={dealId} onChange={e=>{setDealId(e.target.value);const linked=deals.find(item=>item.id===e.target.value);if(linked)setCustomerType(linked.name)}}><option value="">No linked opportunity</option>{deals.map(deal=><option key={deal.id} value={deal.id}>{deal.customer} · {deal.name}</option>)}</select></label>
      <label>Sector<select value={sector} onChange={e => setSector(e.target.value)}>{['Automotive','Industrial manufacturing','Engineering services','Software / IT','Other'].map(s => <option key={s}>{s}</option>)}</select></label>
      <label>Initial quote (₹)<input required min="1" type="number" value={quote} onChange={e => setQuote(e.target.value)} placeholder="15000000"/></label>
      <label>Client first counter (₹)<input required min="1" type="number" value={firstCounter} onChange={e => setFirstCounter(e.target.value)} placeholder="12500000"/></label>
      <label>Final price (₹)<input required={outcome==='Won'} min="1" type="number" value={closedAt} onChange={e => setClosedAt(e.target.value)} placeholder={outcome==='Won'?'14000000':'Optional until closed'}/></label>
      <label>Outcome<select value={outcome} onChange={e => setOutcome(e.target.value as RecordItem['outcome'])}>{['Open','Won','Lost'].map(s => <option key={s}>{s}</option>)}</select></label>
      <label className="history-wide">Client’s reason for the counter<input required value={objection} onChange={e => setObjection(e.target.value)} placeholder="Price, delivery date, payment terms…"/></label>
      <label className="history-wide">Salesperson response / what was discussed<input required value={response} onChange={e => setResponse(e.target.value)} placeholder="Evidence, scope change, phased delivery, commercial terms…"/></label>
      <button className="btn btn-primary history-submit" type="submit" disabled={busy}>{busy?<><LoaderCircle className="spin" size={14}/> Saving…</>:<><Plus size={14}/> Save negotiation round</>}</button>
    </form>;
  return <section className="panel customer-history"><div className="panel-head"><div><h2>{detailKey?'Project negotiation history':'Negotiation history'}</h2><p>{detailKey?'Every saved offer and response for this project, in one place.':'Log each offer round against its project; older project negotiations stay available below.'}</p></div><div className="history-badge"><History size={14}/> PROJECT LINKED</div></div>
    {detailKey?<><button className="text-button" onClick={()=>setDetailKey(null)}><ArrowLeft size={14}/> Back to negotiation desk</button><div className="history-project-title"><h3>{selectedHistory[0]?.projectName||selectedHistory[0]?.customerType}</h3><span>{selectedHistory.length} negotiation rounds</span></div><div className="history-table-wrap"><table className="history-table"><thead><tr><th>ROUND</th><th>INITIAL QUOTE</th><th>CLIENT COUNTER</th><th>FINAL PRICE</th><th>RESULT</th><th>CLIENT REASON & SALESPERSON RESPONSE</th><th></th></tr></thead><tbody>{selectedHistory.map((r,i)=><tr key={r.id}><td>{i+1}</td><td>{formatINR(r.quote)}</td><td>{formatINR(r.firstCounter)}</td><td>{r.closedAt?formatINR(r.closedAt):'—'}</td><td><span className={`history-result ${r.outcome.toLowerCase()}`}>{r.outcome}</span></td><td><b>{r.objection}</b><small>{r.response}</small></td><td><button className="history-delete" aria-label="Delete negotiation round" onClick={()=>void deleteRecord(r.id)}><Trash2 size={14}/></button></td></tr>)}</tbody></table></div></>:<>
    <div className="history-disclaimer">Each saved entry is one negotiation round. Choose the opportunity to keep its history attached to the correct project.</div>
    <div className="history-filter"><span>Review evidence by sector</span><select value={filterSector} onChange={e => setFilterSector(e.target.value)}><option>All sectors</option>{Array.from(new Set(records.map(r => r.sector))).map(s => <option key={s}>{s}</option>)}</select></div>
    {error&&<div className="app-message" role="alert">{error}</div>}
    <div className="history-section-head"><div><h3>Current project rounds</h3><p>{selectedDeal?`${selectedDeal.customer} · ${selectedDeal.name}`:'Choose a project above to see its active negotiation.'}</p></div></div>
    {selectedDeal&&<div className="history-project-rounds">{records.filter(record=>record.dealId===selectedDeal.id).length?records.filter(record=>record.dealId===selectedDeal.id).slice().reverse().map((record,index)=><button key={record.id} onClick={()=>setDetailKey(selectedDeal.id)}><b>Round {index+1} · {formatINR(record.firstCounter)}</b><span>{record.objection}</span></button>):<div className="history-empty">No negotiation rounds have been saved for this project yet.</div>}</div>}
    {recordForm}
    <div className="history-section-head"><div><h3>Past project backlog</h3><p>Open a project to review every offer, counter and response from its rounds.</p></div></div>
    {grouped.size>0?<div className="history-project-list">{Array.from(grouped.entries()).map(([key,items])=><button key={key} onClick={()=>setDetailKey(key)}><span><b>{items[0].projectName||items[0].customerType}</b><small>{items[0].sector} · {items.length} {items.length===1?'round':'rounds'} · Latest: {items[0].outcome}</small></span><strong>{items[0].closedAt?formatINR(items[0].closedAt):formatINR(items[0].firstCounter)}</strong><span className="account-open-arrow">→</span></button>)}</div>:<div className="history-empty">No negotiation history has been saved yet.</div>}
    </>}
  </section>;
}
