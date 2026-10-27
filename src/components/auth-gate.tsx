'use client';
import { FormEvent, useEffect, useState } from 'react';
import { LockKeyhole, LoaderCircle } from 'lucide-react';
import { apiConfigured, apiFetch, getSessionToken, setSessionToken } from '../lib/api';

export function AuthGate({ children }: { children: React.ReactNode }) {
  const [ready, setReady] = useState(false);
  const [signedIn, setSignedIn] = useState(false);
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  useEffect(() => {
    if (!apiConfigured()) {
      setSignedIn(getSessionToken() === 'forge-demo-admin');
      setReady(true);
      return;
    }
    const expired=()=>setSignedIn(false);
    window.addEventListener('forge-session-expired',expired);
    const token = getSessionToken();
    if (!token) { setReady(true); return ()=>window.removeEventListener('forge-session-expired',expired); }
    apiFetch<{ ok:boolean }>('/api/auth/me').then(() => setSignedIn(true)).catch(() => setSessionToken(null)).finally(() => setReady(true));
    return ()=>window.removeEventListener('forge-session-expired',expired);
  }, []);
  async function submit(event: FormEvent) {
    event.preventDefault(); setBusy(true); setError('');
    if (!apiConfigured()) {
      if (username.trim().toLowerCase() === 'admin' && password === 'admin') {
        setSessionToken('forge-demo-admin');
        setSignedIn(true);
        setUsername('');
        setPassword('');
      } else {
        setError('Incorrect demo username or password.');
      }
      setBusy(false);
      return;
    }
    try {
      const result = await apiFetch<{token:string}>('/api/auth/login', { method:'POST', body:JSON.stringify({ password }) });
      setSessionToken(result.token); setSignedIn(true); setPassword('');
    } catch (e) { setError(e instanceof Error ? e.message : 'Could not sign in.'); }
    finally { setBusy(false); }
  }
  if (!ready) return <div className="auth-loading"><LoaderCircle className="spin" size={24}/><span>Connecting to your workspace…</span></div>;
  if (signedIn) return <>{children}</>;
  return <main className="auth-screen"><form className="auth-card" onSubmit={submit}><div className="brand-mark auth-mark"><LockKeyhole size={20}/></div><span className="auth-eyebrow">FORGE SALES DESK</span><h1>Sign in to your workspace</h1><p>Your opportunities, resource plan, and negotiation history are shared with your team.</p>{apiConfigured()?<label>Workspace password<input type="password" autoComplete="current-password" required value={password} onChange={e=>setPassword(e.target.value)} placeholder="Enter your workspace password"/></label>:<><label>Demo username<input type="text" autoComplete="username" required value={username} onChange={e=>setUsername(e.target.value)} placeholder="admin"/></label><label>Demo password<input type="password" autoComplete="current-password" required value={password} onChange={e=>setPassword(e.target.value)} placeholder="admin"/></label><div className="auth-demo-note"><b>Demo login:</b> username <code>admin</code>, password <code>admin</code>. This browser-only sign-in is for illustrative data and does not secure real customer information.</div></>}{error&&<div className="auth-error" role="alert">{error}</div>}<button className="btn btn-primary auth-submit" disabled={busy}>{busy?<><LoaderCircle className="spin" size={15}/> Signing in…</>:<>Continue</>}</button>{apiConfigured()&&<small>Ask your workspace administrator for the password.</small>}</form></main>;
}
