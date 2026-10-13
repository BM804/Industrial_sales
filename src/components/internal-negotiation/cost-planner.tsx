'use client';
import { Sparkles, Settings2 } from 'lucide-react';
import { defaultRoles, formatINR, manDays, manMonths, roleCost, type Role } from '../../lib/pricing-rules';

const milestones = [
  { name: 'Figma design & requirements', owner: 'UI/UX + BA', start: 1, duration: 1.5, color: '#8979eb' },
  { name: 'AI architecture & prototype', owner: 'AI engineers', start: 1, duration: 2, color: '#47a88a' },
  { name: 'Core implementation', owner: 'Frontend + backend', start: 1, duration: 2, color: '#718ed5' },
  { name: 'Integration & QA cycles', owner: 'QA + developers', start: 3, duration: 1.5, color: '#d6a456' },
  { name: 'Acceptance & handover', owner: 'Core + PM', start: 4.5, duration: .5, color: '#cf7b79' }
];

export function CostPlanner({ roles, setRoles, cost }: { roles: Role[]; setRoles: (roles: Role[]) => void; cost: number }) {
  const update = (index: number, change: Partial<Role>) => setRoles(roles.map((role, i) => i === index ? { ...role, ...change } : role));
  const months = [1, 2, 3, 4, 5];
  return <>
    <div className="metric-grid">
      <div className="metric-card"><span className="metric-label">Utilized delivery cost</span><strong className="metric-value">{formatINR(cost)}</strong><span className="metric-note">Only scheduled effort is billed</span></div>
      <div className="metric-card"><span className="metric-label">Total planned effort</span><strong className="metric-value">{roles.reduce((n, r) => n + manMonths(r), 0).toFixed(1)} MM</strong><span className="metric-note">Headcount × duration × utilization</span></div>
      <div className="metric-card"><span className="metric-label">Quoted QA example</span><strong className="metric-value">{formatINR(200000 * 1.5)}</strong><span className="metric-note">₹2L/month × 1.5 months at 100%</span></div>
      <div className="metric-card"><span className="metric-label">Project span</span><strong className="metric-value">5 months</strong><span className="metric-note">Resources start when work is ready</span></div>
    </div>
    <section className="panel utilization-panel">
      <div className="panel-head"><div><h2>Milestones & dependencies</h2><p>Design and AI run in parallel; QA starts after the first two coding months.</p></div></div>
      <div className="milestone-timeline"><div className="milestone-axis"><span>MILESTONE</span><div>{months.map(m => <span key={m}>Month {m}</span>)}</div></div>
        {milestones.map(item => <div className="milestone-row" key={item.name}><div className="milestone-label"><b>{item.name}</b><small>{item.owner}</small></div><div className="milestone-track">{months.map(m => <i key={m}/>)}<span className="milestone-bar" style={{ left: `${(item.start - 1) * 20}%`, width: `${item.duration * 20}%`, background: item.color }} title={`${item.name}: month ${item.start} for ${item.duration} months`}/></div></div>)}
      </div>
      <div className="dependency-note"><Sparkles size={15}/><span><b>Dependency rule:</b> Core coding runs in months 1–2; QA begins in month 3 after that coding milestone completes. No tester cost is charged before deployment.</span></div>
    </section>
    <div className="planner-grid utilization-grid"><section className="panel"><div className="panel-head"><div><h2>Resource plan & cost</h2><p>Enter deployed months and utilization for each role.</p></div><button className="btn btn-light compact" onClick={() => setRoles(defaultRoles.map(r => ({...r})))}><Settings2 size={14}/> Reset plan</button></div>
      <div className="resource-list"><div className="resource-head effort-head"><span>ROLE / EXPERIENCE</span><span>HC</span><span>RATE / MONTH</span><span>START</span><span>DURATION</span><span>UTIL.</span><span>EFFORT</span><span>COST</span></div>
        {roles.map((r, i) => <div className="resource-row effort-row" key={r.name}><div><b>{r.name}</b><select className="experience-select" aria-label={`${r.name} experience tier`} value={r.senior?'senior':'mid'} onChange={e => update(i, { senior: e.target.value === 'senior' })}><option value="senior">Senior · 8–9 yrs</option><option value="mid">Mid / junior · 2–3 yrs</option></select></div><input aria-label={`${r.name} headcount`} type="number" min="0" max="20" value={r.count} onChange={e => update(i, { count: Number(e.target.value) })}/><label className="rate-input">₹<input aria-label={`${r.name} monthly rate`} type="number" min="0" value={r.rate} onChange={e => update(i, { rate: Number(e.target.value) })}/></label><select aria-label={`${r.name} start month`} value={r.startMonth} onChange={e => update(i, { startMonth: Number(e.target.value) })}>{months.map(m => <option key={m} value={m}>M{m}</option>)}</select><input aria-label={`${r.name} utilized duration in months`} type="number" min="0" max={6-r.startMonth} step="0.5" value={r.durationMonths} onChange={e => update(i, { durationMonths: Number(e.target.value) })}/><input aria-label={`${r.name} utilization percent`} type="number" min="0" max="100" step="5" value={r.utilizationPct} onChange={e => update(i, { utilizationPct: Number(e.target.value) })}/><strong title="22 working days per man-month">{manMonths(r).toFixed(1)} MM · {Math.round(manDays(r))}d</strong><strong>{formatINR(roleCost(r))}</strong></div>)}
      </div><div className="resource-total"><span>Resource cost total <small>Man-months are prorated by utilization.</small></span><strong>{formatINR(cost)}</strong></div>
    </section><section className="panel utilization-side"><div className="panel-head"><div><h2>Resource utilization</h2><p>Five-month deployment map</p></div></div><div className="util-chart"><div className="util-months"><span>RESOURCE</span>{months.map(m => <span key={m}>M{m}</span>)}</div>{roles.map(r => <div className="util-row" key={r.name}><span>{r.name.replace(' developers', ' dev.')}</span><div className="util-track">{months.map(m => <i key={m}/>)}<b style={{ left: `${(r.startMonth - 1) * 20}%`, width: `${Math.min(r.durationMonths, 6 - r.startMonth) * 20}%`, opacity: .35 + (r.utilizationPct / 100) * .65 }} title={`${r.utilizationPct}% utilization for ${r.durationMonths} months`}/></div><small>{r.utilizationPct}%</small></div>)}</div><div className="dependency-note"><b>Overlap:</b><span>Figma design and AI prototype both start in month 1.</span></div><div className="swap-callout"><div><b>Experience and rates drive cost</b><small>Keep critical roles senior; review other rates against scope.</small></div></div></section></div>
  </>;
}

