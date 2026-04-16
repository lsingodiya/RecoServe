import { useEffect, useState } from 'react';
import KPICard from '../components/KPICard';
import CategoryBar from '../charts/CategoryBar';
import CategoryPie from '../charts/CategoryPie';
import QualityMixPie from '../charts/QualityMixPie';
import DistributionHistogram from '../charts/DistributionHistogram';
import Spinner from '../components/Spinner';
import { fetchStats, type StatsResponse } from '../api/client';

function fmt(n: number, dec = 1): string {
  if (n >= 1_000_000) return (n / 1_000_000).toFixed(1) + 'M';
  if (n >= 1_000) return (n / 1_000).toFixed(dec) + 'K';
  return n.toFixed(dec);
}

function fmtDate(iso: string | null): string {
  if (!iso) return '—';
  const utcIso = iso.includes('Z') || iso.includes('+') ? iso : `${iso}Z`;
  return new Date(utcIso).toLocaleString();
}

export default function Dashboard() {
  const [stats, setStats] = useState<StatsResponse | null>(null);
  const [loading, setLoading] = useState(true);
  // initialError: shown as full-page block when the very first load fails
  const [initialError, setInitialError] = useState('');
  // refreshError: shown as a slim banner when a background 30s refresh fails
  // so charts from the previous successful load remain visible.
  const [refreshError, setRefreshError] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('All');

  const load = async (isInitial = false) => {
    try {
      setRefreshError('');
      if (isInitial) setInitialError('');
      const data = await fetchStats();
      setStats(data);
    } catch (err: any) {
      const msg = (err as any).response?.data?.detail || 'Failed to load stats. Is the backend running?';
      if (isInitial) setInitialError(msg);
      else setRefreshError(msg);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load(true);
    const id = setInterval(() => load(false), 30_000);
    return () => clearInterval(id);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (loading) return (
    <div className="dashboard-loader">
      <Spinner size={28} /><span className="dashboard-loader-text">Loading analytics…</span>
    </div>
  );

  // Full-page error only on initial load failure
  if (initialError) return <div className="error-msg">{initialError}</div>;
  if (!stats) return null;

  // Filter by l2 category — stats.categories contains the same names as top_products[].category.
  const filteredTopProducts = selectedCategory === 'All'
    ? (stats.top_products ?? [])
    : (stats.top_products ?? []).filter(p => p.category === selectedCategory);

  // Max score in the visible set — used to make the score bar relative,
  // so bars show actual differences rather than bunching at 50–99%.
  const maxScore = filteredTopProducts.reduce((m, p) => Math.max(m, p.avg_score), 0) || 1;

  return (
    <div>
      {/* Background refresh failure — shows as a slim banner without hiding charts */}
      {refreshError && (
        <div style={{
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          padding: '8px 16px', marginBottom: 12, borderRadius: 8,
          background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.2)',
          fontSize: 13, color: '#dc2626',
        }}>
          <span>⚠️ Auto-refresh failed: {refreshError}</span>
          <button
            onClick={() => setRefreshError('')}
            style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#dc2626', fontSize: 16, lineHeight: 1 }}
          >×</button>
        </div>
      )}

      <div className="page-header dashboard-header">
        <div>
          <h1 className="page-title">Dashboard</h1>
          <p className="page-subtitle">Real-time recommendation analytics — auto-refreshes every 30s</p>
        </div>
        <div className="dashboard-segment-ctrl">
          <span className="dashboard-segment-label">Category:</span>
          <select
            value={selectedCategory}
            onChange={(e) => setSelectedCategory(e.target.value)}
            className="dashboard-segment-select"
          >
            <option value="All">All Categories</option>
            {/* stats.categories are flat l2 names that match top_products[].category */}
            {(stats.categories ?? []).map(c => <option key={c} value={c}>{c}</option>)}
          </select>
        </div>
      </div>

      {/* KPI Row */}
      <div className="kpi-grid">
        <KPICard label="Customers Covered"     value={fmt(stats.customers_covered, 0)}             icon="👥" color="indigo" />
        <KPICard label="Avg Recs / Customer"   value={stats.avg_recommendations_per_customer?.toFixed(1) ?? '0.0'} icon="🎯" color="cyan" />
        <KPICard label="Avg Lift"              value={`×${stats.avg_lift?.toFixed(2) ?? '0.00'}`}              icon="📈" color="violet" />
        <KPICard label="Last Refresh"          value={fmtDate(stats.last_refresh_time)}             icon="🕒" color="emerald" />
      </div>

       {/* Row 1: Diversity & Quality Mix */}
       <div className="charts-grid charts-grid-spacing">
         <div className="glass-card" style={{ animationDelay: '100ms' }}>
           <div className="card-header">
             <div>
               <div className="card-title">Recommendation Diversity</div>
               <div className="card-subtitle">Product concentration & coverage</div>
             </div>
             <div className="model-health-badge">
               Score: {stats.diversity?.score ?? 'N/A'}
             </div>
           </div>
           {/* Lorenz Curve — wider viewBox gives room for the rotated Y-axis label */}
           <div style={{ height: 280, position: 'relative', padding: '20px' }}>
             <svg viewBox="-20 -10 130 130" style={{ width: '100%', height: '100%', overflow: 'visible' }}>
               {/* Axes */}
               <line x1="0" y1="0" x2="0" y2="100" stroke="rgba(0,0,0,0.08)" strokeWidth="0.5" />
               <line x1="0" y1="100" x2="100" y2="100" stroke="rgba(0,0,0,0.08)" strokeWidth="0.5" />

               {/* Equality line (perfect diversity diagonal) */}
               <line x1="0" y1="100" x2="100" y2="0" stroke="#cbd5e1" strokeWidth="1" strokeDasharray="4" />

               {/* Lorenz Curve */}
               {stats.diversity?.lorenz_curve && stats.diversity.lorenz_curve.length > 0 && (
                 <polyline
                   points={stats.diversity.lorenz_curve.map(p => `${p.x * 100},${100 - p.y * 100}`).join(' ')}
                   fill="none"
                   stroke="#a78bfa"
                   strokeWidth="3"
                   strokeLinejoin="round"
                   strokeLinecap="round"
                 />
               )}

               {/* Axis labels — positioned within the wider viewBox */}
               <text x="50" y="115" textAnchor="middle" fontSize="7" fill="#64748b">Cumulative % of Products</text>
               <text
                 x="0" y="50"
                 textAnchor="middle"
                 fontSize="7"
                 fill="#64748b"
                 transform="rotate(-90, -12, 50)"
               >Cumulative % of Recs</text>
             </svg>
           </div>
         </div>
 
         <div className="glass-card" style={{ animationDelay: '150ms' }}>
           <div className="card-header">
             <div>
               <div className="card-title">Quality Mix</div>
               <div className="card-subtitle">Association vs Fallback ratio</div>
             </div>
           </div>
           <QualityMixPie data={stats.quality_mix ?? { association: 0, fallback: 0 }} />
         </div>
       </div>


      {/* Row 2: Category Analysis */}
      <div className="charts-grid charts-grid-spacing">
        <div className="glass-card" style={{ animationDelay: '200ms' }}>
          <div className="card-header">
            <div>
              <div className="card-title">Category Performance</div>
              <div className="card-subtitle">Avg score & lift by L2 category</div>
            </div>
          </div>
          <CategoryBar data={stats.category_stats ?? []} />
        </div>
        <div className="glass-card" style={{ animationDelay: '250ms' }}>
          <div className="card-header">
            <div>
              <div className="card-title">Category Distribution</div>
              <div className="card-subtitle">Share of recommendations per category</div>
            </div>
          </div>
          <CategoryPie data={stats.category_stats ?? []} />
        </div>
      </div>

      {/* Row 3: Distributions */}
      <div className="charts-grid charts-grid-spacing">
        <div className="glass-card" style={{ animationDelay: '300ms' }}>
          <div className="card-header">
            <div>
              <div className="card-title">Lift Distribution</div>
              <div className="card-subtitle">Number of recs by lift bucket</div>
            </div>
          </div>
          <DistributionHistogram data={stats.lift_distribution ?? []} color="#a78bfa" label="Count" />
        </div>

        <div className="glass-card" style={{ animationDelay: '350ms' }}>
          <div className="card-header">
            <div>
              <div className="card-title">Score Distribution</div>
              <div className="card-subtitle">Number of recs by score bucket</div>
            </div>
          </div>
          <DistributionHistogram data={stats.score_distribution ?? []} color="#22d3ee" label="Count" />
        </div>
      </div>

      {/* Row 4: Feedback Analysis */}
      <div className="glass-card charts-grid-spacing" style={{ animationDelay: '400ms' }}>
        <div className="card-header">
          <div>
            <div className="card-title">Feedback Analysis</div>
            <div className="card-subtitle">Actual sales team acceptance rates</div>
          </div>
        </div>
        <div className="feedback-stats-grid">
          <div className="feedback-stat-card">
            <div className="feedback-stat-label">Overall Acceptance</div>
            <div className="feedback-stat-value feedback-stat-value-primary">
              {stats.feedback?.overall?.acceptance_rate ? `${(stats.feedback.overall.acceptance_rate * 100).toFixed(1)}%` : 'N/A'}
            </div>
          </div>
          <div className="feedback-stat-card">
            <div className="feedback-stat-label">High Signal Rate</div>
            <div className="feedback-stat-value feedback-stat-value-success">
              {stats.feedback?.overall?.high_rate ? `${(stats.feedback.overall.high_rate * 100).toFixed(1)}%` : 'N/A'}
            </div>
          </div>
          <div className="feedback-stat-card">
            <div className="feedback-stat-label">Low Signal Rate</div>
            <div className="feedback-stat-value feedback-stat-value-error">
              {stats.feedback?.overall?.low_rate ? `${(stats.feedback.overall.low_rate * 100).toFixed(1)}%` : 'N/A'}
            </div>
          </div>
          <div className="feedback-stat-card">
            <div className="feedback-stat-label">Feedback Recency</div>
            <div className="feedback-stat-value feedback-stat-value-main">
              {stats.feedback?.generated_at ? new Date(stats.feedback.generated_at).toLocaleDateString() : 'N/A'}
            </div>
          </div>
        </div>
      </div>

      {/* Top Products Table */}
      <div className="glass-card" style={{ animationDelay: '450ms' }}>
        <div className="card-header">
          <div>
            <div className="card-title">🏆 Top Recommended Products</div>
            <div className="card-subtitle">Top 20 products by recommendation count</div>
          </div>
        </div>
        <div className="table-scroll-container">
          <table className="data-table">
            <thead>
              <tr>
                <th>#</th>
                <th>Product ID</th>
                <th>Category</th>
                <th>Rec Count</th>
                <th>Avg Score</th>
                <th>Avg Lift</th>
                <th>Confidence</th>
              </tr>
            </thead>
            <tbody>
              {filteredTopProducts.map((p, i) => (
                <tr key={p.product_id}>
                  <td className="table-muted-text">{i + 1}</td>
                  <td className="highlight">{p.product_id}</td>
                  <td>
                    <span className="table-category-tag">
                      {p.category}
                    </span>
                  </td>
                  <td>{p.count.toLocaleString()}</td>
                  <td>
                    <div className="table-score-container">
                      <div className="table-score-bar-bg">
                        <div style={{
                          // Width is relative to the max score in the visible set
                          // so differences between products are actually visible.
                          width: `${(p.avg_score / maxScore) * 100}%`,
                          height: '100%', background: 'var(--primary-light)', borderRadius: 3
                        }} />
                      </div>
                      <span className="table-score-pill">
                        {p.avg_score.toFixed(4)}
                      </span>
                    </div>
                  </td>
                  <td>
                    <span className="table-lift-value">
                      {p.avg_lift?.toFixed(3) ?? '0.000'}
                    </span>
                  </td>
                  <td>
                    <span className="table-conf-value">
                      {(p.avg_conf * 100).toFixed(1)}%
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
