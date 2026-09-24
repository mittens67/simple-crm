import { useQuery } from '@apollo/client';
import {
  LEADS_QUERY,
  CUSTOMERS_QUERY,
  DEALS_QUERY,
  SUPPORT_TICKETS_QUERY,
} from '../../../lib/graphql-queries';
import './home.scss';

interface Card {
  label: string;
  value: number;
  icon: string;
  color: string;
  subtitle?: string;
}

interface RecentItem {
  id: string;
  title: string;
  subtitle: string;
  type: string;
  timestamp: string;
}

interface Deal {
  value: number;
  status: string;
}

interface Ticket {
  status: string;
}

interface Lead {
  id: string;
  name: string;
  email: string;
  created_at: string;
  status: string;
}

interface Customer {
  id: string;
  name: string;
  email: string;
  created_at: string;
}

const Home = () => {
  const { data: leads_data } = useQuery(LEADS_QUERY);
  const { data: customers_data } = useQuery(CUSTOMERS_QUERY);
  const { data: deals_data } = useQuery(DEALS_QUERY);
  const { data: tickets_data } = useQuery(SUPPORT_TICKETS_QUERY);

  // Every list is paginated now, so `items` is one page and `total` is the
  // real count. Counts must come from `total`; the old code called .length on
  // whatever page happened to load, which capped "Total Leads" at 20.
  const leads = (leads_data?.leads?.items || []) as Lead[];
  const customers = (customers_data?.customers?.items || []) as Customer[];
  const deals = (deals_data?.deals?.items || []) as Deal[];
  const tickets = (tickets_data?.supportTickets?.items || []) as Ticket[];

  const lead_total = leads_data?.leads?.total ?? 0;
  const customer_total = customers_data?.customers?.total ?? 0;
  const deal_total = deals_data?.deals?.total ?? 0;
  const ticket_total = tickets_data?.supportTickets?.total ?? 0;

  // These are still derived in the browser from the first page of each list,
  // so they describe recent records rather than the whole dataset. Phase 2
  // replaces them with server-side $group aggregations; until then the labels
  // below say "recent" rather than overstating what the number means.
  const total_deal_value = deals.reduce((sum: number, deal) => sum + (deal.value ?? 0), 0);
  const open_tickets = tickets.filter((t) => t.status === 'Open').length;
  const won_deals = deals.filter((d) => d.status === 'Won').length;
  // 'Pending' means a rep has been assigned and is working the lead.
  const pending_leads = leads.filter((l) => l.status === 'Pending').length;

  const stats: Card[] = [
    {
      label: 'Total Leads',
      value: lead_total,
      icon: '👥',
      color: '#3b82f6',
    },
    {
      label: 'Customers',
      value: customer_total,
      icon: '🏢',
      color: '#2563eb',
    },
    {
      label: 'Recent Deal Value',
      value: Math.round(total_deal_value / 1000),
      icon: '💰',
      color: '#1d4ed8',
      subtitle: 'K',
    },
    {
      label: 'Open Tickets (recent)',
      value: open_tickets,
      icon: '🎫',
      color: '#60a5fa',
    },
  ];

  const recent_items: RecentItem[] = [
    ...leads.slice(0, 2).map((lead) => ({
      id: lead.id,
      title: lead.name,
      subtitle: lead.email,
      type: 'lead',
      timestamp: lead.created_at,
    })),
    ...customers.slice(0, 2).map((customer) => ({
      id: customer.id,
      title: customer.name,
      subtitle: customer.email,
      type: 'customer',
      timestamp: customer.created_at,
    })),
  ];

  return (
    <div className="home">
      <div className="home-header">
        <h1>Dashboard</h1>
        <p className="home-subtitle">Welcome back! Here's what's happening with your CRM.</p>
      </div>

      <div className="home-stats">
        {stats.map((stat, idx) => (
          <div key={idx} className="stat-card" style={{ borderLeftColor: stat.color }}>
            <div className="stat-icon">{stat.icon}</div>
            <div className="stat-content">
              <p className="stat-label">{stat.label}</p>
              <p className="stat-value">
                {stat.value}
                {stat.subtitle && <span className="stat-subtitle">{stat.subtitle}</span>}
              </p>
            </div>
          </div>
        ))}
      </div>

      <div className="home-content">
        <div className="home-section">
          <h2>Quick Stats</h2>
          <div className="stats-grid">
            <div className="stat-item">
              <span className="stat-label">Leads In Progress (recent)</span>
              <span className="stat-number">{pending_leads}</span>
            </div>
            <div className="stat-item">
              <span className="stat-label">Won Deals (recent)</span>
              <span className="stat-number">{won_deals}</span>
            </div>
            <div className="stat-item">
              <span className="stat-label">Total Deals</span>
              <span className="stat-number">{deal_total}</span>
            </div>
            <div className="stat-item">
              <span className="stat-label">Total Tickets</span>
              <span className="stat-number">{ticket_total}</span>
            </div>
          </div>
        </div>

        {recent_items.length > 0 && (
          <div className="home-section">
            <h2>Recent Activity</h2>
            <div className="recent-list">
              {recent_items.map((item) => (
                <div key={item.id} className={`recent-item recent-${item.type}`}>
                  <div className="recent-badge">{item.type === 'lead' ? '📝' : '🏢'}</div>
                  <div className="recent-content">
                    <p className="recent-title">{item.title}</p>
                    <p className="recent-subtitle">{item.subtitle}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default Home;
