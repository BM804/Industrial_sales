'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { useParams } from 'next/navigation';
import { ArrowLeft, Building2, BriefcaseBusiness, CircleDollarSign, ExternalLink, LoaderCircle, TrendingUp } from 'lucide-react';
import { apiFetch, normalizeDealStage, type Deal } from '../../../lib/api';
import { formatINR } from '../../../lib/pricing-rules';

const dateLabel = (value?: string) => value ? new Date(`${value}T00:00:00`).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }) : 'Not set';

export default function ProjectPage() {
  return <ProjectAccountView />;
}

function ProjectAccountView() {
  const { id } = useParams<{ id: string }>();
  const [deals, setDeals] = useState<Deal[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const load = useCallback(async () => {
    try {
      setError('');
      const storedDeals = await apiFetch<Deal[]>('/api/deals');
      setDeals(storedDeals.map(deal => ({ ...deal, stage: normalizeDealStage(deal.stage) })));
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : 'Could not load project details.');
    } finally {
      setLoading(false);
    }
  }, []);
  useEffect(() => { void load(); }, [load]);

  const project = deals.find(deal => deal.id === decodeURIComponent(id));
  const accountProjects = useMemo(() => project ? deals.filter(deal => deal.customer === project.customer).sort((a, b) => (b.close || '').localeCompare(a.close || '')) : [], [deals, project]);
  const won = accountProjects.filter(deal => deal.stage === 'Closed won');
  const lost = accountProjects.filter(deal => deal.stage === 'Closed lost');
  const active = accountProjects.filter(deal => deal.stage !== 'Closed won' && deal.stage !== 'Closed lost');
  const totalValue = accountProjects.reduce((sum, deal) => sum + deal.value, 0);
  const completedRevenue = won.reduce((sum, deal) => sum + deal.value, 0);
  const pipeline = active.reduce((sum, deal) => sum + deal.value, 0);
  const weightedMargin = totalValue ? accountProjects.reduce((sum, deal) => sum + deal.value * deal.margin, 0) / totalValue : 0;

  const openProject = (deal: Deal) => window.open(`/project/${encodeURIComponent(deal.id)}`, '_blank', 'noopener,noreferrer');

  return <main className="project-account-shell">
    <header className="project-account-topbar"><a href="/" className="project-back"><ArrowLeft size={16}/> Back to workspace</a><span>Forge · Project & account</span></header>
    <div className="project-account-content">
      {loading ? <div className="loading-workspace"><LoaderCircle className="spin" size={18}/> Loading company history…</div> : error ? <div className="app-message" role="alert">{error}</div> : !project ? <section className="panel project-not-found"><h1>Project not found</h1><p>This project may have been removed or the link may be out of date.</p><a className="btn btn-primary" href="/">Return to workspace</a></section> : <>
        <div className="project-account-heading"><div><div className="eyebrow"><Building2 size={13}/> COMPANY ACCOUNT</div><h1>{project.customer}</h1><p>{project.tag} · {new Set(accountProjects.map(deal => deal.rep)).size} account representative{new Set(accountProjects.map(deal => deal.rep)).size === 1 ? '' : 's'} · {accountProjects.length} total projects</p></div><span className="history-badge"><ExternalLink size={13}/> PROJECT DETAIL TAB</span></div>
        <section className="panel selected-project-card"><div className="panel-head"><div><span className="auth-eyebrow">SELECTED PROJECT</span><h2>{project.name}</h2><p>{project.id} · {project.stage} · Project lead: {project.rep}</p></div><a className="btn btn-light" href="/">Workspace</a></div><div className="project-detail-grid"><div><small>Project value</small><b>{formatINR(project.value)}</b></div><div><small>Gross margin</small><b>{project.margin}%</b></div><div><small>Estimated delivery cost</small><b>{formatINR(project.teamCost ?? project.value * (1 - project.margin / 100))}</b></div><div><small>Market reference</small><b>{project.marketPrice ? formatINR(project.marketPrice) : 'Not entered'}</b></div><div><small>Project duration</small><b>{project.durationMonths || 6} months</b></div><div><small>Timeline</small><b>{dateLabel(project.startDate)} → {dateLabel(project.close)}</b></div><div className="project-feedback"><small>Customer feedback / handover note</small><b>{project.feedback || 'No review recorded for this project.'}</b></div></div></section>
        <div className="project-account-metrics"><div className="metric-card"><span className="metric-label">Total account value</span><strong className="metric-value">{formatINR(totalValue)}</strong><span className="metric-note">All recorded projects</span></div><div className="metric-card"><span className="metric-label">Completed revenue</span><strong className="metric-value">{formatINR(completedRevenue)}</strong><span className="metric-note">{won.length} completed projects</span></div><div className="metric-card"><span className="metric-label">Current pipeline</span><strong className="metric-value">{formatINR(pipeline)}</strong><span className="metric-note">{active.length} active projects</span></div><div className="metric-card"><span className="metric-label">Portfolio gross margin</span><strong className="metric-value">{weightedMargin.toFixed(1)}%</strong><span className="metric-note">Value-weighted · {lost.length} closed lost</span></div></div>
        <section className="panel account-history-panel"><div className="panel-head"><div><h2>All projects with {project.customer}</h2><p>Open any row in its own tab to review that project's full account context.</p></div><span className="history-badge">{accountProjects.length} PROJECTS</span></div><div className="table-scroll"><table className="account-project-table"><thead><tr><th>PROJECT</th><th>STAGE</th><th>PROJECT VALUE</th><th>MARGIN</th><th>DURATION</th><th>TIMELINE</th><th>PROJECT LEAD</th></tr></thead><tbody>{accountProjects.map(deal=><tr key={deal.id}><td><button className="deal-open" onClick={()=>openProject(deal)}>{deal.name}</button><small>{deal.id}</small></td><td>{deal.stage}</td><td>{formatINR(deal.value)}</td><td>{deal.margin}%</td><td>{deal.durationMonths || 6} months</td><td>{dateLabel(deal.startDate)} → {dateLabel(deal.close)}</td><td>{deal.rep}</td></tr>)}</tbody></table></div><div className="account-history-footer"><span><BriefcaseBusiness size={15}/> {won.length} won · {active.length} active · {lost.length} lost</span><span><CircleDollarSign size={15}/> {formatINR(completedRevenue)} completed revenue</span><span><TrendingUp size={15}/> {formatINR(pipeline)} open pipeline</span></div></section>
      </>}
    </div>
  </main>;
}
