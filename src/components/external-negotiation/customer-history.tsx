'use client';
import { useEffect, useMemo, useState } from 'react';
import { Plus, History, Trash2, LoaderCircle } from 'lucide-react';
import { formatINR } from '../../lib/pricing-rules';
import { apiFetch, type HistoryRecord } from '../../lib/api';

type RecordItem = HistoryRecord;

export function CustomerHistory() {
  const [records, setRecords] = useState<RecordItem[]>([]);
  const [customerType, setCustomerType] = useState('');
  const [sector, setSector] = useState('Automotive');
  const [quote, setQuote] = useState('');
  const [firstCounter, setFirstCounter] = useState('');
  const [closedAt, setClosedAt] = useState('');
  const [objection, setObjection] = useState('');
  const [response, setResponse] = useState('');
  const [outcome, setOutcome] = useState<RecordItem['outcome']>('Won');
  const [filterSector, setFilterSector] = useState('All sectors');
  const [busy,setBusy]=useState(false);
  const [error,setError]=useState('');
  useEffect(() => { apiFetch<RecordItem[]>('/api/negotiations').then(setRecords).catch(e=>setError(e instanceof Error?e.message:'Could not load negotiation history.')); }, []);
  const scopedRecords = useMemo(() => records.filter(r => filterSector === 'All sectors' || r.sector === filterSector), [records, filterSector]);
  const insights = useMemo(() => {
    const won = scopedRecords.filter(r => r.outcome === 'Won' && r.quote > 0);
    if (!won.length) return null;
    const medianOf = (values: number[]) => { const sorted = values.sort((a, b) => a - b); const mid = Math.floor(sorted.length / 2); return sorted.length % 2 ? sorted[mid] : (sorted[mid - 1] + sorted[mid]) / 2; };
    const medianDiscount = medianOf(won.map(r => (r.quote - r.closedAt) / r.quote * 100));
    const medianFirstCounter = medianOf(scopedRecords.filter(r => r.quote > 0).map(r => (r.quote - r.firstCounter) / r.quote * 100));
    return { count: won.length, medianDiscount, medianFirstCounter, won };
  }, [scopedRecords]);
  return <section className="panel customer-history"><div className="panel-head"><div><h2>Customer negotiation history</h2><p>Build your own evidence base from completed Indian customer negotiations.</p></div><div className="history-badge"><History size={14}/> PRIVATE · SHARED</div></div>
    <div className="history-disclaimer">Illustrative negotiation scenarios are shown below. Replace them with real customer outcomes before using these insights for decisions.</div>
    <div className="history-filter"><span>Analyze records by sector</span><select value={filterSector} onChange={e => setFilterSector(e.target.value)}><option>All sectors</option>{Array.from(new Set(records.map(r => r.sector))).map(s => <option key={s}>{s}</option>)}</select></div>
    {insights && <div className="history-insight"><b>{insights.count} won {insights.count === 1 ? 'deal' : 'deals'} logged</b><span>Median first-counter ask: <strong>{insights.medianFirstCounter.toFixed(1)}%</strong></span><span>Median final discount: <strong>{insights.medianDiscount.toFixed(1)}%</strong></span></div>}
    {insights && <div className="win-playbook"><b>Responses used on won deals</b>{insights.won.map(r => <p key={r.id}><span>{r.sector} · {r.customerType}</span>{r.response}</p>)}</div>}
    {error&&<div className="app-message" role="alert">{error}</div>}
    <form className="history-form" onSubmit={async e => { e.preventDefault(); setBusy(true);setError('');try{const saved=await apiFetch<RecordItem>('/api/negotiations',{method:'POST',body:JSON.stringify({customerType:customerType.trim(),sector,quote:Number(quote),firstCounter:Number(firstCounter),closedAt:Number(closedAt),outcome,objection:objection.trim(),response:response.trim()})});setRecords(current=>[saved,...current]);setCustomerType('');setQuote('');setFirstCounter('');setClosedAt('');setObjection('');setResponse('')}catch(err){setError(err instanceof Error?err.message:'Could not save record.')}finally{setBusy(false)}}}>
      <label>Customer / segment<input required value={customerType} onChange={e => setCustomerType(e.target.value)} placeholder="e.g. Tier-1 auto supplier"/></label>
      <label>Sector<select value={sector} onChange={e => setSector(e.target.value)}>{['Automotive','Industrial manufacturing','Engineering services','Software / IT','Other'].map(s => <option key={s}>{s}</option>)}</select></label>
      <label>Quote (₹)<input required min="1" type="number" value={quote} onChange={e => setQuote(e.target.value)} placeholder="15000000"/></label>
      <label>First counter (₹)<input required min="1" type="number" value={firstCounter} onChange={e => setFirstCounter(e.target.value)} placeholder="12500000"/></label>
      <label>Final price (₹)<input required={outcome==='Won'} min="1" type="number" value={closedAt} onChange={e => setClosedAt(e.target.value)} placeholder={outcome==='Won'?'14000000':'Leave blank if not closed'}/></label>
      <label>Outcome<select value={outcome} onChange={e => setOutcome(e.target.value as RecordItem['outcome'])}>{['Won','Lost','Open'].map(s => <option key={s}>{s}</option>)}</select></label>
      <label className="history-wide">Customer objection<input required value={objection} onChange={e => setObjection(e.target.value)} placeholder="Price, delivery date, payment terms…"/></label>
      <label className="history-wide">What worked / response<input required value={response} onChange={e => setResponse(e.target.value)} placeholder="Evidence, scope change, phased delivery, commercial terms…"/></label>
      <button className="btn btn-primary history-submit" type="submit" disabled={busy}>{busy?<><LoaderCircle className="spin" size={14}/> Saving…</>:<><Plus size={14}/> Save negotiation record</>}</button>
    </form>
    {records.length > 0 ? <div className="history-table-wrap"><table className="history-table"><thead><tr><th>CUSTOMER / SECTOR</th><th>QUOTE</th><th>FIRST COUNTER</th><th>FINAL PRICE</th><th>RESULT</th><th>WHAT WORKED</th><th></th></tr></thead><tbody>{records.map(r => <tr key={r.id}><td><b>{r.customerType}</b><small>{r.sector} · {r.objection}</small></td><td>{formatINR(r.quote)}</td><td>{formatINR(r.firstCounter)}</td><td>{r.closedAt?formatINR(r.closedAt):'—'}</td><td><span className={`history-result ${r.outcome.toLowerCase()}`}>{r.outcome}</span></td><td>{r.response}</td><td><button className="history-delete" aria-label="Delete record" onClick={async () => {if(!window.confirm('Delete this negotiation record?'))return;try{await apiFetch(`/api/negotiations/${r.id}`,{method:'DELETE'});setRecords(current=>current.filter(x=>x.id!==r.id))}catch(err){setError(err instanceof Error?err.message:'Could not delete record.')}}}><Trash2 size={14}/></button></td></tr>)}</tbody></table></div> : <div className="history-empty">Your shared negotiation history will appear here after the first record is added.</div>}
  </section>;
}
