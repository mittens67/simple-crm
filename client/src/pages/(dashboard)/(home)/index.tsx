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

const Home = () => {
  const { data: leads_data } = useQuery(LEADS_QUERY);
  const { data: customers_data } = useQuery(CUSTOMERS_QUERY);
  const { data: deals_data } = useQuery(DEALS_QUERY);
  const { data: tickets_data } = useQuery(SUPPORT_TICKETS_QUERY);

  const leads = leads_data?.leads?.data || [];
  const customers = customers_data?.customers || [];
  const deals = deals_data?.deals || [];
  const tickets = tickets_data?.supportTickets || [];

  const total_deal_value = deals.reduce((sum: number, deal: any) => sum + deal.value, 0);
  const open_tickets = tickets.filter((t: any) => t.status === 'Open').length;
  const won_deals = deals.filter((d: any) => d.status === 'Won').length;
  const qualified_leads = leads.filter((l: any) => l.status === 'Qualified').length;

  const stats: Card[] = [
    {
      label: 'Total Leads',
      value: leads.length,
      icon: '👥',
      color: '#3b82f6',
    },
    {
      label: 'Customers',
      value: customers.length,
      icon: '🏢',
      color: '#2563eb',
    },
    {
      label: 'Deal Value',
      value: Math.round(total_deal_value / 1000),
      icon: '💰',
      color: '#1d4ed8',
      subtitle: 'K',
    },
    {
      label: 'Open Tickets',
      value: open_tickets,
      icon: '🎫',
      color: '#60a5fa',
    },
  ];

  const recent_items: RecentItem[] = [
    ...leads.slice(0, 2).map((lead: any) => ({
      id: lead.id,
      title: lead.name,
      subtitle: lead.email,
      type: 'lead',
      timestamp: lead.created_at,
    })),
    ...customers.slice(0, 2).map((customer: any) => ({
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
              <span className="stat-label">Qualified Leads</span>
              <span className="stat-number">{qualified_leads}</span>
            </div>
            <div className="stat-item">
              <span className="stat-label">Won Deals</span>
              <span className="stat-number">{won_deals}</span>
            </div>
            <div className="stat-item">
              <span className="stat-label">Active Customers</span>
              <span className="stat-number">{customers.length}</span>
            </div>
            <div className="stat-item">
              <span className="stat-label">Pending Support</span>
              <span className="stat-number">{open_tickets}</span>
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
