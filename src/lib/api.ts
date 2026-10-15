const API_BASE = process.env.NEXT_PUBLIC_API_URL?.replace(/\/$/, '') || '';
const TOKEN_KEY = 'forge-workspace-session';
const DEMO_KEYS = { deals: 'forge-demo-deals', planner: 'forge-demo-planner', goal: 'forge-demo-goal', history: 'forge-demo-history' };

const representatives = ['Avinab Koushik', 'Aarav Mehta', 'Priya Sharma', 'Rohan Iyer', 'Sneha Nair', 'Vikram Desai', 'Neha Kapoor', 'Kabir Malhotra'];
const accountNames = ['Al Noor Industries', 'Bharat Auto Components', 'Western Foundry Group', 'Meridian Engineering', 'Suryatech Motors', 'Apex Process Systems', 'Indus Motion Controls', 'Trident Packaging Works', 'Vardhan Industrial Systems', 'BluePeak Manufacturing', 'Kaveri Precision Components', 'Northstar Automation', 'Summit Heavy Equipment', 'Crestline Logistics', 'Pioneer Energy Systems', 'Silverline Castings', 'Aarohan Electrical Works', 'Evergreen Plant Technologies', 'Vertex Materials Group', 'Horizon Machine Tools'];
const projectTypes = ['Smart Factory Modernization', 'Automated Press Line', 'Predictive Maintenance Platform', 'Warehouse Robotics System', 'Quality Vision Inspection', 'Energy Optimization Program', 'CNC Modernization', 'Assembly Line Traceability', 'Digital Twin Deployment', 'Industrial IoT Gateway', 'Robotic Welding Cell', 'Packaging Automation', 'Condition Monitoring Network', 'Material Handling Upgrade', 'Batch Control System', 'Fleet Telematics Rollout', 'Safety Interlock Modernization', 'Process Analytics Platform', 'Vision Guided Assembly', 'Plant Network Resilience'];
const stages = ['Technical sizing', 'Internal rationalization', 'Quote submitted', 'In negotiation'];
const illustrativeDeals: Deal[] = Array.from({ length: 100 }, (_, index) => {
  const cycle = Math.floor(index / projectTypes.length) + 1;
  const value = 2_000_000 + ((index * 791_337) % 16_000_000);
  const margin = 32 + ((index * 7) % 22);
  const stage = index % 10 === 9 ? 'Closed won' : index % 17 === 16 ? 'Closed lost' : stages[index % stages.length];
  return {
    id: 'FSD-2026-' + String(index + 1).padStart(3, '0'),
    name: projectTypes[index % projectTypes.length] + (cycle > 1 ? ' · Phase ' + cycle : ''),
    customer: accountNames[index % accountNames.length],
    rep: index < 40 ? representatives[0] : representatives[1 + ((index - 40) % 7)],
    stage, value, close: '2026-' + String(11 + (index % 2)).padStart(2, '0') + '-' + String(1 + (index % 27)).padStart(2, '0'),
    margin, tag: ['Manufacturing', 'Automotive', 'Industrial', 'Logistics', 'Energy'][index % 5],
    marketPrice: Math.round(value * 1.08), teamCost: Math.round(value * (1 - margin / 100))
  };
});
const illustrativeHistory: HistoryRecord[] = [
  { id:'history-1', customerType:'Tier-1 auto supplier', sector:'Automotive', quote:15000000, firstCounter:12500000, closedAt:14100000, outcome:'Won', objection:'Requested a lower price and faster delivery', response:'Protected acceptance criteria and offered phased commissioning with a milestone-linked payment plan.' },
  { id:'history-2', customerType:'Regional equipment manufacturer', sector:'Industrial manufacturing', quote:9200000, firstCounter:7600000, closedAt:0, outcome:'Open', objection:'Asked for a larger discount before technical validation', response:'Reframed the discussion around uptime impact and proposed a paid discovery phase.' },
];

function demoRead<T>(key: string, fallback: T): T {
  try { const value = localStorage.getItem(key); return value ? JSON.parse(value) as T : fallback; } catch { return fallback; }
}
function demoWrite<T>(key: string, value: T) { localStorage.setItem(key, JSON.stringify(value)); }
function demoRequest<T>(path: string, init: RequestInit): T {
  const method = (init.method || 'GET').toUpperCase();
  const body = init.body ? JSON.parse(String(init.body)) : {};
  const deals = () => {
    const stored = demoRead<Deal[]>(DEMO_KEYS.deals, illustrativeDeals);
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

export type Deal = { id:string; name:string; customer:string; rep:string; stage:string; value:number; close:string; margin:number; tag:string; marketPrice?:number; teamCost?:number };
export type HistoryRecord = { id:string; customerType:string; sector:string; quote:number; firstCounter:number; closedAt:number; outcome:'Won'|'Lost'|'Open'; objection:string; response:string };

