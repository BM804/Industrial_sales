import http from 'node:http';
import crypto from 'node:crypto';
import { Pool } from 'pg';

const port = Number(process.env.PORT || 10000);
const databaseUrl = process.env.DATABASE_URL;
const loginPassword = process.env.APP_LOGIN_PASSWORD;
const sessionSecret = process.env.APP_SESSION_SECRET;
const allowedOrigins = (process.env.WEB_ORIGINS || '').split(',').map((s) => s.trim()).filter(Boolean);

if (!databaseUrl || !loginPassword || !sessionSecret) {
  throw new Error('Set DATABASE_URL, APP_LOGIN_PASSWORD, and APP_SESSION_SECRET before starting the API.');
}
if (loginPassword.length < 12) throw new Error('APP_LOGIN_PASSWORD must be at least 12 characters long.');

const pool = new Pool({ connectionString: databaseUrl, ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : undefined, max: 5 });
const loginAttempts = new Map();
const schema = `
CREATE TABLE IF NOT EXISTS deals (
  id TEXT PRIMARY KEY, name TEXT NOT NULL, customer TEXT NOT NULL, rep TEXT NOT NULL,
  stage TEXT NOT NULL, value NUMERIC NOT NULL CHECK (value >= 0), close_date TEXT NOT NULL DEFAULT '',
  margin NUMERIC NOT NULL DEFAULT 0 CHECK (margin >= 0 AND margin <= 100), tag TEXT NOT NULL DEFAULT 'Other',
  team_cost NUMERIC CHECK (team_cost >= 0), market_price NUMERIC CHECK (market_price >= 0),
  duration_months NUMERIC NOT NULL DEFAULT 6 CHECK (duration_months > 0), project_start_date TEXT NOT NULL DEFAULT '', feedback TEXT NOT NULL DEFAULT '',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(), updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
ALTER TABLE deals ADD COLUMN IF NOT EXISTS team_cost NUMERIC CHECK (team_cost >= 0);
ALTER TABLE deals ADD COLUMN IF NOT EXISTS market_price NUMERIC CHECK (market_price >= 0);
ALTER TABLE deals ADD COLUMN IF NOT EXISTS duration_months NUMERIC NOT NULL DEFAULT 6 CHECK (duration_months > 0);
ALTER TABLE deals ADD COLUMN IF NOT EXISTS project_start_date TEXT NOT NULL DEFAULT '';
ALTER TABLE deals ADD COLUMN IF NOT EXISTS feedback TEXT NOT NULL DEFAULT '';
CREATE TABLE IF NOT EXISTS app_settings (key TEXT PRIMARY KEY, value JSONB NOT NULL, updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW());
CREATE TABLE IF NOT EXISTS negotiation_records (
  id UUID PRIMARY KEY, customer_type TEXT NOT NULL, sector TEXT NOT NULL, quote NUMERIC NOT NULL CHECK (quote > 0),
  first_counter NUMERIC NOT NULL CHECK (first_counter > 0), closed_at NUMERIC NOT NULL DEFAULT 0 CHECK (closed_at >= 0),
  outcome TEXT NOT NULL CHECK (outcome IN ('Won','Lost','Open')), objection TEXT NOT NULL, response TEXT NOT NULL,
  deal_id TEXT REFERENCES deals(id) ON DELETE SET NULL, project_name TEXT NOT NULL DEFAULT '',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
ALTER TABLE negotiation_records ADD COLUMN IF NOT EXISTS deal_id TEXT REFERENCES deals(id) ON DELETE SET NULL;
ALTER TABLE negotiation_records ADD COLUMN IF NOT EXISTS project_name TEXT NOT NULL DEFAULT '';
`;

function send(res, status, data) {
  res.writeHead(status, { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store' });
  res.end(JSON.stringify(data));
}
function cors(req, res) {
  const origin = req.headers.origin;
  const allowed = !origin || allowedOrigins.includes('*') || allowedOrigins.includes(origin) || (!allowedOrigins.length && (/^https?:\/\/localhost(:\d+)?$/.test(origin) || /^https:\/\/[a-z0-9-]+\.vercel\.app$/.test(origin)));
  if (origin && allowed) res.setHeader('Access-Control-Allow-Origin', origin);
  res.setHeader('Vary', 'Origin');
  res.setHeader('Access-Control-Allow-Headers', 'Authorization, Content-Type');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, PATCH, DELETE, OPTIONS');
  return allowed;
}
function sign(payload) {
  const body = Buffer.from(JSON.stringify(payload)).toString('base64url');
  const signature = crypto.createHmac('sha256', sessionSecret).update(body).digest('base64url');
  return `${body}.${signature}`;
}
function authenticated(req) {
  try {
    const token = req.headers.authorization?.replace(/^Bearer\s+/i, '');
    if (!token) return false;
    const [body, signature] = token.split('.');
    const expected = crypto.createHmac('sha256', sessionSecret).update(body).digest();
    const actual = Buffer.from(signature, 'base64url');
    if (actual.length !== expected.length || !crypto.timingSafeEqual(actual, expected)) return false;
    return JSON.parse(Buffer.from(body, 'base64url').toString()).exp > Date.now();
  } catch { return false; }
}
async function body(req) {
  let raw = '';
  for await (const chunk of req) {
    raw += chunk;
    if (raw.length > 1_000_000) throw Object.assign(new Error('Request is too large.'), { status: 413 });
  }
  try { return raw ? JSON.parse(raw) : {}; }
  catch { throw Object.assign(new Error('Request body must be valid JSON.'), { status: 400 }); }
}
function dealInput(data) {
  const values = { name: data.name, customer: data.customer, rep: data.rep, stage: data.stage, value: Number(data.value), close: data.close || '', margin: Number(data.margin ?? 0), tag: data.tag || 'Other', teamCost: data.teamCost == null ? null : Number(data.teamCost), marketPrice: data.marketPrice == null ? null : Number(data.marketPrice), durationMonths: Number(data.durationMonths ?? 6), startDate: data.startDate || '', feedback: typeof data.feedback === 'string' ? data.feedback : '' };
  if (![values.name, values.customer, values.rep, values.stage].every((x) => typeof x === 'string' && x.trim()) || !Number.isFinite(values.value) || values.value < 0 || !Number.isFinite(values.margin) || values.margin < 0 || values.margin > 100 || !Number.isFinite(values.durationMonths) || values.durationMonths <= 0 || values.durationMonths > 120 || (values.startDate && !/^\d{4}-\d{2}-\d{2}$/.test(values.startDate)) || values.feedback.length > 2000 || [values.teamCost, values.marketPrice].some((x) => x !== null && (!Number.isFinite(x) || x < 0))) {
    throw Object.assign(new Error('Enter a name, customer, owner, stage, valid amount, and margin from 0 to 100.'), { status: 400 });
  }
  return values;
}
function dealRow(row) {
  return { id: row.id, name: row.name, customer: row.customer, rep: row.rep, stage: row.stage, value: Number(row.value), close: row.close_date, startDate: row.project_start_date || '', margin: Number(row.margin), tag: row.tag, ...(row.team_cost == null ? {} : { teamCost: Number(row.team_cost) }), ...(row.market_price == null ? {} : { marketPrice: Number(row.market_price) }), durationMonths: Number(row.duration_months ?? 6), feedback: row.feedback || '' };
}

await pool.query(schema);
const timelineMigration = await pool.query("SELECT value FROM app_settings WHERE key='project-timeline-v2'");
if (!timelineMigration.rowCount) {
  const oldTimelines = await pool.query('SELECT id, name, close_date FROM deals WHERE duration_months <= 1');
  for (const deal of oldTimelines.rows) {
    const text = String(deal.name).toLowerCase();
    const durationMonths = /factory|automation|robotics|digital twin|modernization/.test(text) ? 10 : /platform|analytics|predictive|vision|traceability/.test(text) ? 7 : 4 + (Array.from(String(deal.id)).reduce((sum, char) => sum + char.charCodeAt(0), 0) % 5);
    const parsedEnd = /^\d{4}-\d{2}-\d{2}$/.test(deal.close_date || '') ? new Date(`${deal.close_date}T00:00:00Z`) : new Date();
    const end = Number.isNaN(parsedEnd.valueOf()) ? new Date() : parsedEnd;
    const start = new Date(end);
    start.setUTCMonth(start.getUTCMonth() - durationMonths);
    await pool.query('UPDATE deals SET duration_months=$2,project_start_date=$3 WHERE id=$1', [deal.id, durationMonths, start.toISOString().slice(0, 10)]);
  }
  await pool.query("INSERT INTO app_settings(key,value,updated_at) VALUES('project-timeline-v2','true'::jsonb,NOW()) ON CONFLICT(key) DO NOTHING");
}
const server = http.createServer(async (req, res) => {
  if (!cors(req, res)) return send(res, 403, { error: 'This website is not allowed to access the API.' });
  if (req.method === 'OPTIONS') { res.writeHead(204); return res.end(); }
  const url = new URL(req.url || '/', `http://${req.headers.host || 'localhost'}`);
  const path = url.pathname.replace(/\/$/, '') || '/';
  try {
    if (path === '/health' && req.method === 'GET') return send(res, 200, { ok: true });
    if (path === '/api/auth/login' && req.method === 'POST') {
      const forwarded = String(req.headers['x-forwarded-for'] || '').split(',').map((value) => value.trim()).filter(Boolean);
      const address = forwarded.at(-1) || req.socket.remoteAddress || 'unknown';
      const now = Date.now();
      const attempt = loginAttempts.get(address);
      if (attempt && now - attempt.started < 15 * 60 * 1000 && attempt.count >= 10) return send(res, 429, { error: 'Too many sign-in attempts. Wait 15 minutes and try again.' });
      const input = await body(req);
      const provided = Buffer.from(String(input.password || ''));
      const expected = Buffer.from(loginPassword);
      if (provided.length !== expected.length || !crypto.timingSafeEqual(provided, expected)) {
        if (!attempt || now - attempt.started >= 15 * 60 * 1000) loginAttempts.set(address,{started:now,count:1});
        else loginAttempts.set(address,{...attempt,count:attempt.count+1});
        return send(res, 401, { error: 'That workspace password is not correct.' });
      }
      loginAttempts.delete(address);
      return send(res, 200, { token: sign({ sub: 'workspace-member', exp: Date.now() + 7 * 24 * 60 * 60 * 1000 }) });
    }
    if (!authenticated(req)) return send(res, 401, { error: 'Please sign in to your workspace again.' });
    if (path === '/api/auth/me' && req.method === 'GET') return send(res, 200, { ok: true });

    if (path === '/api/deals' && req.method === 'GET') {
      const result = await pool.query('SELECT * FROM deals ORDER BY created_at DESC');
      return send(res, 200, result.rows.map(dealRow));
    }
    if (path === '/api/deals' && req.method === 'POST') {
      const data = dealInput(await body(req));
      const id = `FD-${crypto.randomUUID().slice(0, 8).toUpperCase()}`;
      const result = await pool.query('INSERT INTO deals(id,name,customer,rep,stage,value,close_date,margin,tag,team_cost,market_price,duration_months,feedback,project_start_date) VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14) RETURNING *', [id, data.name.trim(), data.customer.trim(), data.rep.trim(), data.stage, data.value, data.close, data.margin, data.tag, data.teamCost, data.marketPrice,data.durationMonths,data.feedback,data.startDate]);
      return send(res, 201, dealRow(result.rows[0]));
    }
    const dealMatch = path.match(/^\/api\/deals\/([^/]+)$/);
    if (dealMatch && req.method === 'PATCH') {
      const old = await pool.query('SELECT * FROM deals WHERE id=$1', [dealMatch[1]]);
      if (!old.rowCount) return send(res, 404, { error: 'Opportunity not found.' });
      const existing = dealRow(old.rows[0]);
      const data = dealInput({ ...existing, ...await body(req) });
      const result = await pool.query('UPDATE deals SET name=$2,customer=$3,rep=$4,stage=$5,value=$6,close_date=$7,margin=$8,tag=$9,team_cost=$10,market_price=$11,duration_months=$12,feedback=$13,project_start_date=$14,updated_at=NOW() WHERE id=$1 RETURNING *', [dealMatch[1], data.name.trim(), data.customer.trim(), data.rep.trim(), data.stage, data.value, data.close, data.margin, data.tag, data.teamCost, data.marketPrice,data.durationMonths,data.feedback,data.startDate]);
      return send(res, 200, dealRow(result.rows[0]));
    }
    if (dealMatch && req.method === 'DELETE') {
      const result = await pool.query('DELETE FROM deals WHERE id=$1', [dealMatch[1]]);
      return send(res, result.rowCount ? 200 : 404, { deleted: Boolean(result.rowCount) });
    }
    if (path === '/api/planner' && req.method === 'GET') {
      const result = await pool.query("SELECT value FROM app_settings WHERE key='resource-plan'");
      const saved = result.rows[0]?.value ?? null;
      return send(res, 200, Array.isArray(saved) ? { roles:saved, milestones:null } : (saved ?? {roles:null,milestones:null}));
    }
    if (path === '/api/planner' && req.method === 'PUT') {
      const input = await body(req);
      if (!Array.isArray(input.roles) || input.roles.length > 50 || !Array.isArray(input.milestones) || input.milestones.length > 50) return send(res, 400, { error: 'Resource plan is invalid.' });
      await pool.query("INSERT INTO app_settings(key,value,updated_at) VALUES('resource-plan',$1,NOW()) ON CONFLICT(key) DO UPDATE SET value=$1,updated_at=NOW()", [JSON.stringify({roles:input.roles,milestones:input.milestones})]);
      return send(res, 200, { saved: true });
    }
    if (path === '/api/goal' && req.method === 'GET') {
      const result = await pool.query("SELECT value FROM app_settings WHERE key='quarterly-target'");
      return send(res, 200, { target: result.rows[0]?.value ?? 30000000 });
    }
    if (path === '/api/goal' && req.method === 'PUT') {
      const input = await body(req);
      const target = Number(input.target);
      if (!Number.isFinite(target) || target <= 0 || target > 1_000_000_000_000) return send(res, 400, { error: 'Enter a quarterly target greater than zero.' });
      await pool.query("INSERT INTO app_settings(key,value,updated_at) VALUES('quarterly-target',$1,NOW()) ON CONFLICT(key) DO UPDATE SET value=$1,updated_at=NOW()", [JSON.stringify(target)]);
      return send(res, 200, { target });
    }
    if (path === '/api/negotiations' && req.method === 'GET') {
      const result = await pool.query('SELECT * FROM negotiation_records ORDER BY created_at DESC');
      return send(res, 200, result.rows.map((r) => ({ id:r.id, customerType:r.customer_type, sector:r.sector, quote:Number(r.quote), firstCounter:Number(r.first_counter), closedAt:Number(r.closed_at), outcome:r.outcome, objection:r.objection, response:r.response, dealId:r.deal_id, projectName:r.project_name, createdAt:r.created_at })));
    }
    if (path === '/api/negotiations' && req.method === 'POST') {
      const r = await body(req);
      if (!r.customerType?.trim() || !r.sector?.trim() || !r.objection?.trim() || !r.response?.trim() || !['Won','Lost','Open'].includes(r.outcome) || ![r.quote,r.firstCounter].every((x) => Number.isFinite(Number(x)) && Number(x) > 0) || !Number.isFinite(Number(r.closedAt || 0)) || Number(r.closedAt || 0) < 0 || (r.outcome === 'Won' && Number(r.closedAt) <= 0)) return send(res, 400, { error: 'Complete all negotiation fields with valid amounts. A final price is required for a won deal.' });
      const id = crypto.randomUUID();
      const dealId=r.dealId?String(r.dealId):null;
      const projectName=String(r.projectName||'').trim();
      if(dealId){const linked=await pool.query('SELECT id FROM deals WHERE id=$1',[dealId]);if(!linked.rowCount)return send(res,400,{error:'Choose an existing project for this negotiation record.'});}
      await pool.query('INSERT INTO negotiation_records(id,customer_type,sector,quote,first_counter,closed_at,outcome,objection,response,deal_id,project_name) VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11)', [id,r.customerType.trim(),r.sector.trim(),Number(r.quote),Number(r.firstCounter),Number(r.closedAt),r.outcome,r.objection.trim(),r.response.trim(),dealId,projectName]);
      return send(res, 201, { ...r, id, dealId, projectName, createdAt:new Date().toISOString() });
    }
    const historyMatch = path.match(/^\/api\/negotiations\/([0-9a-f-]+)$/i);
    if (historyMatch && req.method === 'DELETE') {
      const result = await pool.query('DELETE FROM negotiation_records WHERE id=$1', [historyMatch[1]]);
      return send(res, result.rowCount ? 200 : 404, { deleted: Boolean(result.rowCount) });
    }
    return send(res, 404, { error: 'Route not found.' });
  } catch (error) {
    console.error(error);
    return send(res, error.status || 500, { error: error.status ? error.message : 'The server could not complete that request.' });
  }
});
server.listen(port, '0.0.0.0', () => console.log(`Forge Sales API listening on ${port}`));
process.on('SIGTERM', async () => { server.close(); await pool.end(); });
