import { useMemo } from 'react';
import { useQuery } from '@apollo/client';
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import {
  AlarmClock,
  Building2,
  Scale,
  Ticket,
  Trophy,
  TrendingUp,
  UserRound,
} from 'lucide-react';
import { DASHBOARD_QUERY } from '../../../lib/graphql-queries';
import { useVizColors } from '../../../hooks/use-viz-colors';
import { Card, CardHeader, EmptyState, PageHeader, StatTile } from '../../../components/ui';
import LoadingSpinner from '../../../components/ui/loading-spinner';
import './home.scss';

/**
 * Every figure comes from a server-side aggregation.
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
  new Date(period).toLocaleDateString(undefined, { month: 'short' });

/**
 * One tooltip for every chart. Recharts' default is a bare white box that
 * ignores the theme, so it is replaced rather than restyled.
 */
const ChartTooltip = ({
  active,
  payload,
  label,
  format,
}: {
  active?: boolean;
  payload?: Array<{ value: number; payload: Record<string, unknown> }>;
  label?: string;
  format: (value: number, row: Record<string, unknown>) => string;
}) => {
  if (!active || !payload?.length) return null;
  return (
    <div className="viz-tooltip">
      <p className="viz-tooltip-label">{label}</p>
      <p className="viz-tooltip-value">{format(payload[0].value, payload[0].payload)}</p>
    </div>
  );
};

const Home = () => {
  const { data, loading, error } = useQuery(DASHBOARD_QUERY, { variables: { months: 12 } });
  // Resolved rather than passed as var(): Recharts writes these as SVG
  // attributes, where var() is not reliably supported.
  const viz = useVizColors();

  const summary = (data?.dashboardSummary ?? {}) as DashboardSummary;
  const funnel = (data?.pipelineFunnel ?? []) as FunnelEntry[];
  const revenue = (data?.revenueOverTime ?? []) as RevenuePoint[];
  const lead_funnel = (data?.leadFunnel ?? []) as LeadFunnelEntry[];
  const reps = (data?.repPerformance ?? []) as RepRow[];
  const sla = (data?.slaSummary ?? {}) as SlaSummary;

  // Stages with no deals are kept: where deals are *not* arriving is the
  // interesting part of a funnel.
  const funnel_data = useMemo(
    () => funnel.map((entry) => ({ ...entry, name: entry.stage_name })),
    [funnel]
  );

  const revenue_data = useMemo(
    () => revenue.map((point) => ({ ...point, name: month_label(point.period) })),
    [revenue]
  );

  if (loading && !data) return <LoadingSpinner />;

  if (error) {
    return (
      <div className="home">
        <PageHeader title="Dashboard" />
        <EmptyState title="Could not load reporting data" description={error.message} />
      </div>
    );
  }

  const tiles = [
    {
      label: 'Open pipeline',
      value: money(summary.open_deal_value ?? 0),
      hint: `${summary.open_deals ?? 0} open deals`,
      icon: <TrendingUp />,
      tone: 'info' as const,
    },
    {
      label: 'Weighted pipeline',
      value: money(summary.weighted_pipeline_value ?? 0),
      hint: 'Scaled by stage probability',
      icon: <Scale />,
      tone: 'brand' as const,
    },
    {
      label: 'Won this month',
      value: money(summary.won_value_this_month ?? 0),
      hint: 'Closed-won value',
      icon: <Trophy />,
      tone: 'success' as const,
    },
    {
      label: 'Leads',
      value: summary.total_leads ?? 0,
      hint: 'Excluding archived',
      icon: <UserRound />,
      tone: 'neutral' as const,
    },
    {
      label: 'Customers',
      value: summary.total_customers ?? 0,
      hint: 'Active accounts',
      icon: <Building2 />,
      tone: 'neutral' as const,
    },
    {
      label: 'Open tickets',
      value: summary.open_tickets ?? 0,
      hint: `${Math.round(sla.compliance_rate ?? 100)}% within SLA`,
      icon: <Ticket />,
      tone: (sla.compliance_rate ?? 100) < 80 ? ('danger' as const) : ('neutral' as const),
    },
    {
      label: 'Overdue tasks',
      value: summary.overdue_tasks ?? 0,
      hint: 'Assigned to you',
      icon: <AlarmClock />,
      tone: (summary.overdue_tasks ?? 0) > 0 ? ('warning' as const) : ('neutral' as const),
    },
  ];

  return (
    <div className="home">
      <PageHeader
        title="Dashboard"
        description="Everything you can see — your own records as a rep, the whole team as a manager."
      />

      <div className="home-tiles">
        {tiles.map((tile) => (
          <StatTile key={tile.label} {...tile} />
        ))}
      </div>

      <div className="home-grid">
        <Card as="section" className="home-chart">
          <CardHeader title="Closed-won revenue" />
          {revenue_data.length === 0 ? (
            <EmptyState title="No closed-won deals yet" />
          ) : (
            <>
              <ResponsiveContainer width="100%" height={260}>
                <AreaChart data={revenue_data} margin={{ top: 8, right: 8, bottom: 0, left: 0 }}>
                  <defs>
                    <linearGradient id="revenue-fill" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor={viz["series-1"]} stopOpacity={0.28} />
                      <stop offset="100%" stopColor={viz["series-1"]} stopOpacity={0.02} />
                    </linearGradient>
                  </defs>
                  {/* Recessive grid: horizontal only, no vertical rules. */}
                  <CartesianGrid stroke={viz["viz-grid"]} vertical={false} />
                  <XAxis
                    dataKey="name"
                    stroke={viz["viz-axis"]}
                    tickLine={false}
                    axisLine={false}
                    fontSize={11}
                  />
                  <YAxis
                    stroke={viz["viz-axis"]}
                    tickLine={false}
                    axisLine={false}
                    fontSize={11}
                    tickFormatter={(value: number) => money(value)}
                    width={52}
                  />
                  <Tooltip
                    content={
                      <ChartTooltip
                        format={(value, row) =>
                          `${money(value)} from ${row.count} deal${row.count === 1 ? '' : 's'}`
                        }
                      />
                    }
                    cursor={{ stroke: viz['viz-axis'], strokeDasharray: '3 3' }}
                  />
                  {/* One series, so no legend — the card title names it. */}
                  <Area
                    type="monotone"
                    dataKey="value"
                    stroke={viz["series-1"]}
                    strokeWidth={2}
                    fill="url(#revenue-fill)"
                    dot={false}
                    activeDot={{ r: 4, strokeWidth: 2, stroke: viz['viz-surface'] }}
                  />
                </AreaChart>
              </ResponsiveContainer>
              <p className="home-chart-note">Last 12 months, by the month each deal closed.</p>
            </>
          )}
        </Card>

        <Card as="section" className="home-chart">
          <CardHeader title="Pipeline by stage" />
          {funnel_data.length === 0 ? (
            <EmptyState title="No pipeline configured" />
          ) : (
            <>
              <ResponsiveContainer width="100%" height={260}>
                <BarChart
                  data={funnel_data}
                  layout="vertical"
                  margin={{ top: 4, right: 40, bottom: 0, left: 0 }}
                >
                  <CartesianGrid stroke={viz["viz-grid"]} horizontal={false} />
                  <XAxis type="number" hide />
                  <YAxis
                    type="category"
                    dataKey="name"
                    stroke={viz["viz-axis"]}
                    tickLine={false}
                    axisLine={false}
                    fontSize={11}
                    width={96}
                  />
                  <Tooltip
                    content={
                      <ChartTooltip
                        format={(value, row) =>
                          `${value} deal${value === 1 ? '' : 's'} · ${money(
                            row.total_value as number
                          )} · ${Math.round(row.avg_days_in_stage as number)}d average`
                        }
                      />
                    }
                    cursor={{ fill: viz['viz-grid'] }}
                  />
                  <Bar dataKey="deal_count" radius={[0, 4, 4, 0]} barSize={18}>
                    {/* Terminal stages are tinted differently so "Closed lost"
                        does not read as pipeline. */}
                    {funnel_data.map((entry) => (
                      <Cell
                        key={entry.stage_id}
                        fill={entry.probability === 0 ? viz['viz-axis'] : viz['series-1']}
                      />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
              <p className="home-chart-note">Open deals only. Hover for value and time in stage.</p>
            </>
          )}
        </Card>

        <Card as="section" className="home-chart">
          <CardHeader title="Leads by status" />
          {lead_funnel.length === 0 ? (
            <EmptyState title="No leads yet" />
          ) : (
            <ResponsiveContainer width="100%" height={200}>
              <BarChart
                data={lead_funnel}
                layout="vertical"
                margin={{ top: 4, right: 40, bottom: 0, left: 0 }}
              >
                <CartesianGrid stroke={viz["viz-grid"]} horizontal={false} />
                <XAxis type="number" hide />
                <YAxis
                  type="category"
                  dataKey="status"
                  stroke={viz["viz-axis"]}
                  tickLine={false}
                  axisLine={false}
                  fontSize={11}
                  width={96}
                />
                <Tooltip
                  content={<ChartTooltip format={(value) => `${value} leads`} />}
                  cursor={{ fill: viz['viz-grid'] }}
                />
                <Bar dataKey="count" fill={viz["series-2"]} radius={[0, 4, 4, 0]} barSize={18} />
              </BarChart>
            </ResponsiveContainer>
          )}
        </Card>

        <Card as="section" className="home-chart">
          <CardHeader title="Rep performance" />
          {reps.length === 0 ? (
            <EmptyState title="No deals yet" />
          ) : (
            // A table rather than a chart: six measures per rep is a data grid,
            // not a plot, and the numbers are the point.
            <div className="home-table-wrap">
              <table className="home-table">
                <thead>
                  <tr>
                    <th scope="col">Rep</th>
                    <th scope="col">Open</th>
                    <th scope="col">Won</th>
                    <th scope="col">Lost</th>
                    <th scope="col">Won value</th>
                    <th scope="col">Win rate</th>
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
            </div>
          )}
        </Card>
      </div>
    </div>
  );
};

export default Home;
