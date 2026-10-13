const API_BASE = process.env.NEXT_PUBLIC_API_URL?.replace(/\/$/, '') || '';
const TOKEN_KEY = 'forge-workspace-session';

export class ApiError extends Error {
  constructor(message: string, public status = 0) { super(message); }
}

export function apiConfigured() { return Boolean(API_BASE); }
export function getSessionToken() { return typeof window === 'undefined' ? null : localStorage.getItem(TOKEN_KEY); }
export function setSessionToken(token: string | null) {
  if (typeof window === 'undefined') return;
  if (token) localStorage.setItem(TOKEN_KEY, token);
  else localStorage.removeItem(TOKEN_KEY);
}

export async function apiFetch<T>(path: string, init: RequestInit = {}): Promise<T> {
  if (!API_BASE) throw new ApiError('The API URL is not configured. Add NEXT_PUBLIC_API_URL in Vercel settings.', 0);
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

export type Deal = { id:string; name:string; customer:string; rep:string; stage:string; value:number; close:string; margin:number; tag:string };
export type HistoryRecord = { id:string; customerType:string; sector:string; quote:number; firstCounter:number; closedAt:number; outcome:'Won'|'Lost'|'Open'; objection:string; response:string };
