const API_BASE = process.env.NEXT_PUBLIC_API_URL?.replace(/\/$/, '') || '';
const TOKEN_KEY = 'forge-workspace-session';
const DEMO_KEYS = { deals: 'forge-demo-deals', planner: 'forge-demo-planner', goal: 'forge-demo-goal', history: 'forge-demo-history' };
const DURATION_VERSION_KEY = 'forge-project-timeline-version';

const representatives = ['Avinab Koushik', 'Aarav Mehta', 'Priya Sharma', 'Rohan Iyer', 'Sneha Nair', 'Vikram Desai', 'Neha Kapoor', 'Kabir Malhotra'];
const accountNames = ['Al Noor Industries', 'Bharat Auto Components', 'Western Foundry Group', 'Meridian Engineering', 'Suryatech Motors', 'Apex Process Systems', 'Indus Motion Controls', 'Trident Packaging Works', 'Vardhan Industrial Systems', 'BluePeak Manufacturing', 'Kaveri Precision Components', 'Northstar Automation', 'Summit Heavy Equipment', 'Crestline Logistics', 'Pioneer Energy Systems', 'Silverline Castings', 'Aarohan Electrical Works', 'Evergreen Plant Technologies', 'Vertex Materials Group', 'Horizon Machine Tools'];
const projectTypes = ['Smart Factory Modernization', 'Automated Press Line', 'Predictive Maintenance Platform', 'Warehouse Robotics System', 'Quality Vision Inspection', 'Energy Optimization Program', 'CNC Modernization', 'Assembly Line Traceability', 'Digital Twin Deployment', 'Industrial IoT Gateway', 'Robotic Welding Cell', 'Packaging Automation', 'Condition Monitoring Network', 'Material Handling Upgrade', 'Batch Control System', 'Fleet Telematics Rollout', 'Safety Interlock Modernization', 'Process Analytics Platform', 'Vision Guided Assembly', 'Plant Network Resilience'];
const stages = ['Technical sizing', 'Proposal preparation', 'Proposal submit', 'In negotiation'];
export function normalizeDealStage(stage: string) {
  if (stage === 'Internal rationalization') return 'Proposal preparation';
  if (stage === 'Quote submitted') return 'Proposal submit';
  return stage;
}
const projectDurations = [8, 9, 7, 10, 6, 5, 4, 6, 8, 3, 5, 6, 4, 5, 7, 4, 3, 5, 6, 4];
const clientReviews = [
  'Commissioning completed to the agreed acceptance criteria; handover documentation was clear.',
  'The phased rollout reduced production disruption and kept the plant team aligned.',
  'Responsive engineering support during integration and operator training.',
  'Delivered the agreed scope with a clear weekly status and risk log.',
  'The team resolved line-integration issues quickly and documented corrective actions.'
];
function shiftedMonth(monthOffset:number, day:number){const date=new Date(Date.UTC(2026,9+monthOffset,Math.min(day,28)));return date.toISOString().slice(0,10)}
const illustrativeDeals: Deal[] = Array.from({ length: 100 }, (_, index) => {
  const cycle = Math.floor(index / projectTypes.length) + 1;
  const value = 2_000_000 + ((index * 791_337) % 16_000_000);
  const margin = 32 + ((index * 7) % 22);
  const stage = index % 10 === 9 ? 'Closed won' : index % 17 === 16 ? 'Closed lost' : stages[index % stages.length];
  const durationMonths=Math.min(18,projectDurations[index%projectDurations.length]+cycle-1);
  const completed=stage==='Closed won'||stage==='Closed lost';
  const closeOffset=completed?-1-Math.floor((index%30)/5):1+Math.floor((index%12)/3);
  const close=shiftedMonth(closeOffset,5+(index%22));
  const startDate=shiftedMonth(closeOffset-durationMonths,3+(index%24));
  return {
    id: 'FSD-2026-' + String(index + 1).padStart(3, '0'),
    name: projectTypes[index % projectTypes.length] + (cycle > 1 ? ' · Phase ' + cycle : ''),
    customer: accountNames[index % accountNames.length],
    rep: index < 40 ? representatives[0] : representatives[1 + ((index - 40) % 7)],
    stage, value, close, startDate, durationMonths,
    margin, tag: ['Manufacturing', 'Automotive', 'Industrial', 'Logistics', 'Energy'][index % 5],
    marketPrice: Math.round(value * (1.04 + (index % 9) / 100)), teamCost: Math.round(value * (1 - margin / 100)),
    feedback:stage==='Closed won'?clientReviews[index%clientReviews.length]:''
  };
});
const negotiationScenarios = [
  { deal:9, rounds:[['The procurement target is 12% below the quote.','Separated the requested reduction from the commissioning scope and presented a phased acceptance plan.'],['Can payment milestones reduce the first-year cash outlay?','Kept the project price intact and aligned milestone invoices to design approval, factory acceptance, and commissioning.']] },
  { deal:19, rounds:[['The plant wants a shorter outage window before approving the full rollout.','Proposed a site survey and pilot cell first, then sequenced installation around the customer’s maintenance window.']] },
  { deal:29, rounds:[['A competing proposal appears lower, but excludes operator training.','Compared deliverables line by line and offered optional training sessions without removing safety validation.'],['Could the support period be priced separately?','Presented base commissioning and an optional annual support package as separate line items.']] },
  { deal:39, rounds:[['Budget approval is split across two financial quarters.','Offered two milestone phases with separate acceptance and payment dates, keeping each phase independently usable.']] },
  { deal:49, rounds:[['The customer requested a discount before technical validation.','Held the price pending a joint scope review and documented assumptions for interfaces and data access.']] },
  { deal:0, rounds:[['The customer asked for a revised estimate after adding a second production line.','Requested updated throughput and integration details before revising headcount or the delivery schedule.'],['Their budget is below the current scope estimate.','Prepared a phased option that preserves the critical controls and defers nonessential reporting features.']] }
];
const illustrativeHistory: HistoryRecord[] = negotiationScenarios.flatMap(({deal:dealIndex,rounds})=>{
  const deal=illustrativeDeals[dealIndex];
  return rounds.map(([objection,response],round)=>{
    const finalRound=round===rounds.length-1;
    const won=deal.stage==='Closed won'&&finalRound;
    return {id:`round-${deal.id}-${round+1}`,dealId:deal.id,projectName:deal.name,customerType:deal.name,sector:deal.tag,quote:deal.value,firstCounter:Math.round(deal.value*(.86+round*.035)),closedAt:won?Math.round(deal.value*(.94+round*.01)):0,outcome:won?'Won' as const:'Open' as const,objection,response};
  });
});

function demoRead<T>(key: string, fallback: T): T {
  try { const value = localStorage.getItem(key); return value ? JSON.parse(value) as T : fallback; } catch { return fallback; }
}
function demoWrite<T>(key: string, value: T) { localStorage.setItem(key, JSON.stringify(value)); }
function demoRequest<T>(path: string, init: RequestInit): T {
  const method = (init.method || 'GET').toUpperCase();
  const body = init.body ? JSON.parse(String(init.body)) : {};
  const deals = () => {
    let stored = demoRead<Deal[]>(DEMO_KEYS.deals, illustrativeDeals);
    if (localStorage.getItem(DURATION_VERSION_KEY) !== '2') {
      stored=stored.map((deal,index)=>{const seed=illustrativeDeals.find(item=>item.id===deal.id)||illustrativeDeals[(index*7)%illustrativeDeals.length];return {...deal,durationMonths:(deal.durationMonths&&deal.durationMonths>1)?deal.durationMonths:seed.durationMonths,startDate:deal.startDate||seed.startDate,feedback:deal.feedback||seed.feedback||''}});
      demoWrite(DEMO_KEYS.deals,stored);
      localStorage.setItem(DURATION_VERSION_KEY,'2');
    }
    const normalized = stored.map(deal => ({ ...deal, stage: normalizeDealStage(deal.stage) }));
    if (normalized.some((deal, index) => deal.stage !== stored[index]?.stage)) {
      stored = normalized;
      demoWrite(DEMO_KEYS.deals, stored);
    }
    const legacySeedIds = new Set(['demo-1', 'demo-2', 'demo-3', 'demo-4', 'demo-5']);
    if (stored.length === 5 && stored.every(row => legacySeedIds.has(row.id))) {
      const migrated = illustrativeDeals.map((seed, index) => {
        const previous = stored.find(row => row.id === 'demo-' + (index + 1));
        return previous ? { ...seed, name: previous.name, customer: previous.customer, stage: previous.stage, value: previous.value, close: previous.close, margin: previous.margin, tag: previous.tag, marketPrice: previous.marketPrice, teamCost: previous.teamCost } : seed;
      });
      demoWrite(DEMO_KEYS.deals, migrated);
      return migrated;
    }
    return stored;
  };
  const history = () => demoRead<HistoryRecord[]>(DEMO_KEYS.history, illustrativeHistory);
  let result: unknown = { ok: true };
  if (path === '/api/deals') {
    if (method === 'GET') result = deals();
    else { const row = { ...body, id: `FSD-${Date.now()}` }; demoWrite(DEMO_KEYS.deals, [row, ...deals()]); result = row; }
  } else if (path.startsWith('/api/deals/')) {
    const id = path.split('/').pop()!;
    if (method === 'DELETE') demoWrite(DEMO_KEYS.deals, deals().filter(d => d.id !== id));
    else { const updated = { ...body, id }; demoWrite(DEMO_KEYS.deals, deals().map(d => d.id === id ? updated : d)); result = updated; }
  } else if (path === '/api/planner') {
    if (method === 'GET') result = demoRead(DEMO_KEYS.planner, { roles: null, milestones: null });
    else { demoWrite(DEMO_KEYS.planner, body); result = { saved: true }; }
  } else if (path === '/api/goal') {
    if (method === 'GET') result = demoRead(DEMO_KEYS.goal, { target: 30000000 });
    else { demoWrite(DEMO_KEYS.goal, body); result = body; }
  } else if (path === '/api/negotiations') {
    if (method === 'GET') result = history();
    else { const row = { ...body, id: `history-${Date.now()}` }; demoWrite(DEMO_KEYS.history, [row, ...history()]); result = row; }
  } else if (path.startsWith('/api/negotiations/')) {
    const id = path.split('/').pop()!; demoWrite(DEMO_KEYS.history, history().filter(record => record.id !== id));
  }
  return result as T;
}

export class ApiError extends Error {
  constructor(message: string, public status = 0) { super(message); }
}

export function apiConfigured() { return Boolean(API_BASE); }
export function demoMode() { return !API_BASE; }
export function getSessionToken() { return typeof window === 'undefined' ? null : localStorage.getItem(TOKEN_KEY); }
export function setSessionToken(token: string | null) {
  if (typeof window === 'undefined') return;
  if (token) localStorage.setItem(TOKEN_KEY, token);
  else localStorage.removeItem(TOKEN_KEY);
}

export async function apiFetch<T>(path: string, init: RequestInit = {}): Promise<T> {
  if (!API_BASE) {
    if (typeof window === 'undefined') throw new ApiError('Illustrative workspace data is available in the browser.', 0);
    return demoRequest<T>(path, init);
  }
  const headers = new Headers(init.headers);
  if (init.body && !headers.has('Content-Type')) headers.set('Content-Type', 'application/json');
  const token = getSessionToken();
  if (token) headers.set('Authorization', `Bearer ${token}`);
  let response: Response;
  try { response = await fetch(`${API_BASE}${path}`, { ...init, headers, cache: 'no-store' }); }
  catch { throw new ApiError('Could not reach the API. Check that the Render backend is running.', 0); }
  const result = await response.json().catch(() => ({}));
  if (!response.ok) {
    if (response.status === 401 && path !== '/api/auth/login') {
      setSessionToken(null);
      if (typeof window !== 'undefined') window.dispatchEvent(new Event('forge-session-expired'));
    }
    throw new ApiError(result.error || `Request failed (${response.status}).`, response.status);
  }
  return result as T;
}

export type Deal = { id:string; name:string; customer:string; rep:string; stage:string; value:number; close:string; startDate?:string; margin:number; tag:string; marketPrice?:number; teamCost?:number; durationMonths?:number; feedback?:string };
export type HistoryRecord = { id:string; customerType:string; sector:string; quote:number; firstCounter:number; closedAt:number; outcome:'Won'|'Lost'|'Open'; objection:string; response:string; dealId?:string|null; projectName?:string|null; createdAt?:string };
