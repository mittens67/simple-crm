import { useQuery } from '@apollo/client';
import { DASHBOARD_QUERY } from '../../../lib/graphql-queries';
import LoadingSpinner from '../../../components/ui/loading-spinner';
import './home.scss';

/**
 * Every figure here comes from a server-side aggregation.
 *
 * This page used to fetch four full lists and reduce them in the render body,
 * so each number described whatever page happened to load — "Total Leads" was
 * capped at the page size — and it downloaded every record to compute eight
 * integers.
 */

interface DashboardSummary {
  total_leads: number;
  total_customers: number;
  open_deals: number;
  open_deal_value: number;
  weighted_pipeline_value: number;
  won_value_this_month: number;
  open_tickets: number;
  overdue_tasks: number;
}

interface FunnelEntry {
  stage_id: string;
  stage_name: string;
  deal_count: number;
  total_value: number;
  weighted_value: number;
  avg_days_in_stage: number;
  probability: number;
}

interface RevenuePoint {
  period: string;
  count: number;
  value: number;
}

interface LeadFunnelEntry {
  status: string;
  count: number;
}

interface RepRow {
  user_id: string;
  name: string;
  open_deals: number;
  won_deals: number;
  lost_deals: number;
  won_value: number;
  win_rate: number | null;
}

interface SlaSummary {
  total: number;
  breached: number;
  compliance_rate: number;
  avg_first_response_hours: number | null;
}

const money = (value: number) =>
  value >= 1000 ? `$${Math.round(value / 1000).toLocaleString()}k` : `$${Math.round(value)}`;

const month_label = (period: string) =>
  new Date(period).toLocaleDateString(undefined, { month: 'short', year: '2-digit' });

const Home = () => {
  const { data, loading, error } = useQuery(DASHBOARD_QUERY, { variables: { months: 12 } });

  if (loading && !data) return <LoadingSpinner />;
  if (error) {
    return (
      <div className="home">
        <div className="home-header">
          <h1>Dashboard</h1>
          <p className="home-subtitle">Could not load reporting data: {error.message}</p>
        </div>
      </div>
    );
  }

  const summary = (data?.dashboardSummary ?? {}) as DashboardSummary;
  const funnel = (data?.pipelineFunnel ?? []) as FunnelEntry[];
  const revenue = (data?.revenueOverTime ?? []) as RevenuePoint[];
  const lead_funnel = (data?.leadFunnel ?? []) as LeadFunnelEntry[];
  const reps = (data?.repPerformance ?? []) as RepRow[];
  const sla = (data?.slaSummary ?? {}) as SlaSummary;

  const stats = [
    { label: 'Open Pipeline', value: money(summary.open_deal_value ?? 0), icon: '📈', hint: `${summary.open_deals ?? 0} open deals` },
    { label: 'Weighted Pipeline', value: money(summary.weighted_pipeline_value ?? 0), icon: '⚖️', hint: 'Scaled by stage probability' },
    { label: 'Won This Month', value: money(summary.won_value_this_month ?? 0), icon: '🏆', hint: 'Closed-won value' },
    { label: 'Total Leads', value: String(summary.total_leads ?? 0), icon: '👥', hint: 'Excluding archived' },
    { label: 'Customers', value: String(summary.total_customers ?? 0), icon: '🏢', hint: 'Active accounts' },
    { label: 'Open Tickets', value: String(summary.open_tickets ?? 0), icon: '🎫', hint: 'Open or in progress' },
    { label: 'Overdue Tasks', value: String(summary.overdue_tasks ?? 0), icon: '⏰', hint: 'Assigned to you' },
    {
      label: 'SLA Compliance',
      value: `${Math.round(sla.compliance_rate ?? 100)}%`,
      icon: '⏱️',
      hint: sla.avg_first_response_hours
        ? `Avg first response ${sla.avg_first_response_hours.toFixed(1)}h`
        : 'No responses yet',
    },
  ];

  const max_revenue = Math.max(1, ...revenue.map((p) => p.value));
  const max_funnel = Math.max(1, ...funnel.map((f) => f.deal_count));
  const max_lead = Math.max(1, ...lead_funnel.map((f) => f.count));

  return (
    <div className="home">
      <div className="home-header">
        <h1>Dashboard</h1>
        <p className="home-subtitle">
          Figures cover everything you can see — a rep's own records, a manager's whole team.
        </p>
      </div>

      <div className="home-stats">
        {stats.map((stat) => (
          <div key={stat.label} className="stat-card">
            <div className="stat-icon">{stat.icon}</div>
            <div className="stat-content">
              <p className="stat-label">{stat.label}</p>
              <p className="stat-value">{stat.value}</p>
              <p className="stat-hint">{stat.hint}</p>
            </div>
          </div>
        ))}
      </div>

      <div className="home-content">
        <section className="home-section">
          <h2>Pipeline by stage</h2>
          {funnel.length === 0 ? (
            <p className="empty-note">No pipeline configured yet.</p>
          ) : (
            <div className="funnel">
              {funnel.map((entry) => (
                <div key={entry.stage_id} className="funnel-row">
                  <span className="funnel-label">
                    {entry.stage_name}
                    <small>{entry.probability}%</small>
                  </span>
                  <div className="funnel-bar-track">
                    <div
                      className="funnel-bar"
                      style={{ width: `${(entry.deal_count / max_funnel) * 100}%` }}
                    />
                  </div>
                  <span className="funnel-value">
                    {entry.deal_count} · {money(entry.total_value)}
                    {entry.avg_days_in_stage > 0 && (
                      <small> · {Math.round(entry.avg_days_in_stage)}d avg</small>
                    )}
                  </span>
                </div>
              ))}
            </div>
          )}
        </section>

        <section className="home-section">
          <h2>Revenue (last 12 months)</h2>
          {revenue.length === 0 ? (
            <p className="empty-note">No closed-won deals in this period.</p>
          ) : (
            <div className="spark">
              {revenue.map((point) => (
                <div key={point.period} className="spark-col" title={`${money(point.value)} from ${point.count} deals`}>
                  <div
                    className="spark-bar"
                    style={{ height: `${Math.max(4, (point.value / max_revenue) * 100)}%` }}
                  />
                  <span className="spark-label">{month_label(point.period)}</span>
                </div>
              ))}
            </div>
          )}
        </section>

        <section className="home-section">
          <h2>Leads by status</h2>
          <div className="funnel">
            {lead_funnel.map((entry) => (
              <div key={entry.status} className="funnel-row">
                <span className="funnel-label">{entry.status}</span>
                <div className="funnel-bar-track">
                  <div
                    className="funnel-bar funnel-bar-alt"
                    style={{ width: `${(entry.count / max_lead) * 100}%` }}
                  />
                </div>
                <span className="funnel-value">{entry.count}</span>
              </div>
            ))}
          </div>
        </section>

        <section className="home-section">
          <h2>Rep performance</h2>
          {reps.length === 0 ? (
            <p className="empty-note">No deals yet.</p>
          ) : (
            <table className="mini-table">
              <thead>
                <tr>
                  <th>Rep</th>
                  <th>Open</th>
                  <th>Won</th>
                  <th>Lost</th>
                  <th>Won value</th>
                  <th>Win rate</th>
                </tr>
              </thead>
              <tbody>
                {reps.map((rep) => (
                  <tr key={rep.user_id}>
                    <td>{rep.name}</td>
                    <td>{rep.open_deals}</td>
                    <td>{rep.won_deals}</td>
                    <td>{rep.lost_deals}</td>
                    <td>{money(rep.won_value)}</td>
                    {/* Null, not 0%: a rep with nothing closed has no win rate. */}
                    <td>{rep.win_rate === null ? '—' : `${Math.round(rep.win_rate)}%`}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </section>
      </div>
    </div>
  );
};

export default Home;
