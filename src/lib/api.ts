const API_BASE = process.env.NEXT_PUBLIC_API_URL?.replace(/\/$/, '') || '';
const TOKEN_KEY = 'forge-workspace-session';
const DEMO_KEYS = { deals: 'forge-demo-deals', planner: 'forge-demo-planner', goal: 'forge-demo-goal', history: 'forge-demo-history' };

const demoDeals: Deal[] = [
  { id:'demo-1', name:'Dubai Smart Factory Upgrade', customer:'Al Noor Industries', rep:'Aarav Mehta', stage:'In negotiation', value:18500000, close:'2026-12-15', margin:38, tag:'Manufacturing', marketPrice:20500000, teamCost:11470000 },
  { id:'demo-2', name:'Automated Press Line', customer:'Bharat Auto Components', rep:'Priya Sharma', stage:'Quote submitted', value:12400000, close:'2026-11-28', margin:42, tag:'Automotive', marketPrice:14000000, teamCost:7192000 },
  { id:'demo-3', name:'Predictive Maintenance Platform', customer:'Western Foundry Group', rep:'Rohan Iyer', stage:'Technical sizing', value:9200000, close:'2027-01-20', margin:31, tag:'Industrial', marketPrice:10300000, teamCost:6348000 },
  { id:'demo-4', name:'Warehouse Robotics Phase 1', customer:'Meridian Engineering', rep:'Aarav Mehta', stage:'Internal rationalization', value:7600000, close:'2026-12-30', margin:46, tag:'Logistics', marketPrice:8300000, teamCost:4104000 },
  { id:'demo-5', name:'Quality Vision Inspection', customer:'Suryatech Motors', rep:'Priya Sharma', stage:'Closed won', value:6800000, close:'2026-10-02', margin:44, tag:'Automotive', marketPrice:7400000, teamCost:3808000 },
];
const demoHistory: HistoryRecord[] = [
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
  const deals = () => demoRead<Deal[]>(DEMO_KEYS.deals, demoDeals);
  const history = () => demoRead<HistoryRecord[]>(DEMO_KEYS.history, demoHistory);
  let result: unknown = { ok: true };
  if (path === '/api/deals') {
    if (method === 'GET') result = deals();
    else { const row = { ...body, id: `demo-${Date.now()}` }; demoWrite(DEMO_KEYS.deals, [row, ...deals()]); result = row; }
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
    if (typeof window === 'undefined') throw new ApiError('Demo data is available in the browser.', 0);
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
