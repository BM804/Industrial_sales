'use client';
import { useEffect, useMemo, useState } from 'react';
import { Plus, History, Trash2 } from 'lucide-react';
import { formatINR } from '../../lib/pricing-rules';

type RecordItem = { id: string; customerType: string; sector: string; quote: number; firstCounter: number; closedAt: number; outcome: 'Won' | 'Lost' | 'Open'; objection: string; response: string };
const KEY = 'forge-indian-customer-negotiation-history';

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
  useEffect(() => { try { setRecords(JSON.parse(localStorage.getItem(KEY) || '[]') as RecordItem[]); } catch { localStorage.removeItem(KEY); } }, []);
  const save = (next: RecordItem[]) => { setRecords(next); localStorage.setItem(KEY, JSON.stringify(next)); };
  const scopedRecords = useMemo(() => records.filter(r => filterSector === 'All sectors' || r.sector === filterSector), [records, filterSector]);
  const insights = useMemo(() => {
    const won = scopedRecords.filter(r => r.outcome === 'Won' && r.quote > 0);
    if (!won.length) return null;
    const medianOf = (values: number[]) => { const sorted = values.sort((a, b) => a - b); const mid = Math.floor(sorted.length / 2); return sorted.length % 2 ? sorted[mid] : (sorted[mid - 1] + sorted[mid]) / 2; };
    const medianDiscount = medianOf(won.map(r => (r.quote - r.closedAt) / r.quote * 100));
    const medianFirstCounter = medianOf(scopedRecords.filter(r => r.quote > 0).map(r => (r.quote - r.firstCounter) / r.quote * 100));
    return { count: won.length, medianDiscount, medianFirstCounter, won };
  }, [scopedRecords]);
  return <section className="panel customer-history"><div className="panel-head"><div><h2>Customer negotiation history</h2><p>Build your own evidence base from completed Indian customer negotiations.</p></div><div className="history-badge"><History size={14}/> PRIVATE · LOCAL</div></div>
    <div className="history-disclaimer">No customer behavior is prefilled. Add your team’s actual quote, first counter, close price, objection, and response to surface patterns you can reuse.</div>
    <div className="history-filter"><span>Analyze records by sector</span><select value={filterSector} onChange={e => setFilterSector(e.target.value)}><option>All sectors</option>{Array.from(new Set(records.map(r => r.sector))).map(s => <option key={s}>{s}</option>)}</select></div>
    {insights && <div className="history-insight"><b>{insights.count} won {insights.count === 1 ? 'deal' : 'deals'} logged</b><span>Median first-counter ask: <strong>{insights.medianFirstCounter.toFixed(1)}%</strong></span><span>Median final discount: <strong>{insights.medianDiscount.toFixed(1)}%</strong></span></div>}
    {insights && <div className="win-playbook"><b>Responses used on won deals</b>{insights.won.map(r => <p key={r.id}><span>{r.sector} · {r.customerType}</span>{r.response}</p>)}</div>}
    <form className="history-form" onSubmit={e => { e.preventDefault(); const next = [{ id: crypto.randomUUID(), customerType: customerType.trim(), sector, quote: Number(quote), firstCounter: Number(firstCounter), closedAt: Number(closedAt), outcome, objection: objection.trim(), response: response.trim() }, ...records]; save(next); setCustomerType(''); setQuote(''); setFirstCounter(''); setClosedAt(''); setObjection(''); setResponse(''); }}>
      <label>Customer / segment<input required value={customerType} onChange={e => setCustomerType(e.target.value)} placeholder="e.g. Tier-1 auto supplier"/></label>
      <label>Sector<select value={sector} onChange={e => setSector(e.target.value)}>{['Automotive','Industrial manufacturing','Engineering services','Software / IT','Other'].map(s => <option key={s}>{s}</option>)}</select></label>
      <label>Quote (₹)<input required min="1" type="number" value={quote} onChange={e => setQuote(e.target.value)} placeholder="15000000"/></label>
      <label>First counter (₹)<input required min="1" type="number" value={firstCounter} onChange={e => setFirstCounter(e.target.value)} placeholder="12500000"/></label>
      <label>Final price (₹)<input required min="1" type="number" value={closedAt} onChange={e => setClosedAt(e.target.value)} placeholder="14000000"/></label>
      <label>Outcome<select value={outcome} onChange={e => setOutcome(e.target.value as RecordItem['outcome'])}>{['Won','Lost','Open'].map(s => <option key={s}>{s}</option>)}</select></label>
      <label className="history-wide">Customer objection<input required value={objection} onChange={e => setObjection(e.target.value)} placeholder="Price, delivery date, payment terms…"/></label>
      <label className="history-wide">What worked / response<input required value={response} onChange={e => setResponse(e.target.value)} placeholder="Evidence, scope change, phased delivery, commercial terms…"/></label>
      <button className="btn btn-primary history-submit" type="submit"><Plus size={14}/> Save negotiation record</button>
    </form>
    {records.length > 0 ? <div className="history-table-wrap"><table className="history-table"><thead><tr><th>CUSTOMER / SECTOR</th><th>QUOTE</th><th>FIRST COUNTER</th><th>CLOSED AT</th><th>RESULT</th><th>WHAT WORKED</th><th></th></tr></thead><tbody>{records.map(r => <tr key={r.id}><td><b>{r.customerType}</b><small>{r.sector} · {r.objection}</small></td><td>{formatINR(r.quote)}</td><td>{formatINR(r.firstCounter)}</td><td>{formatINR(r.closedAt)}</td><td><span className={`history-result ${r.outcome.toLowerCase()}`}>{r.outcome}</span></td><td>{r.response}</td><td><button className="history-delete" aria-label="Delete record" onClick={() => save(records.filter(x => x.id !== r.id))}><Trash2 size={14}/></button></td></tr>)}</tbody></table></div> : <div className="history-empty">Your negotiation history will appear here once you add a real customer record.</div>}
  </section>;
}
