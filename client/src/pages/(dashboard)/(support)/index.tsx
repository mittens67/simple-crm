import { useAuth } from '../../../auth/auth-context';
import { useSupportTickets, useCustomers, useUsers } from '../../../hooks';
import { useResourcePage } from '../../../hooks/use-resource-page';
import type { SupportTicket, SupportTicketInput } from '../../../types/support-ticket';
import { TICKET_STATUS_LABELS } from '../../../types/common';
import LoadingSpinner from '../../../components/ui/loading-spinner';
import Pagination from '../../../components/ui/pagination';
import SupportTicketModal from './support-ticket-modal';
import '../(sales)/(leads)/leads.scss';

const Support = () => {
  const { can } = useAuth();
  const tickets = useSupportTickets();
  const { items: customers } = useCustomers();
  const { items: users } = useUsers();

  const page = useResourcePage<SupportTicket, SupportTicketInput>({
    crud: tickets,
    noun: 'ticket',
  });

  if (tickets.loading && tickets.items.length === 0) return <LoadingSpinner />;

  return (
    <div className="leads">
      <div className="leads-header">
        <h1>Support Tickets</h1>
        {can('support_tickets.create') && (
          <button className="btn-primary" onClick={page.open_create}>
            + New Ticket
          </button>
        )}
      </div>

      <div className="leads-search">
        <input
          type="text"
          placeholder="Search tickets by issue..."
          value={page.search_input}
          onChange={(e) => page.set_search_input(e.target.value)}
        />
      </div>

      <table className="leads-table">
        <thead>
          <tr>
            <th>Issue</th>
            <th>Customer</th>
            <th>Assigned Agent</th>
            <th>Status</th>
            <th>Actions</th>
          </tr>
        </thead>
        <tbody>
          {tickets.items.length === 0 && (
            <tr>
              <td colSpan={5} className="table-empty">
                {page.search_input ? 'No tickets match that search.' : 'No tickets yet.'}
              </td>
            </tr>
          )}
          {tickets.items.map((ticket) => (
            <tr key={ticket.id}>
              <td>{ticket.issue_summary}</td>
              <td>{ticket.customer?.name || '-'}</td>
              <td>{ticket.assigned_agent?.name || 'Unassigned'}</td>
              <td>
                <span className={`status status-${ticket.status.toLowerCase()}`}>
                  {TICKET_STATUS_LABELS[ticket.status]}
                </span>
              </td>
              <td className="actions">
                {can('support_tickets.update') && (
                  <button className="btn-small" onClick={() => page.open_edit(ticket)}>
                    Edit
                  </button>
                )}
                {can('support_tickets.delete') && (
                  <button className="btn-small btn-danger" onClick={() => page.remove(ticket.id)}>
                    Delete
                  </button>
                )}
              </td>
            </tr>
          ))}
        </tbody>
      </table>

      <Pagination
        offset={tickets.offset}
        limit={tickets.limit}
        total={tickets.total}
        on_previous={tickets.previous_page}
        on_next={tickets.next_page}
      />

      {page.modal_open && (
        <SupportTicketModal
          ticket={page.editing}
          customers={customers}
          users={users}
          on_save={page.submit}
          on_close={page.close_modal}
        />
      )}
    </div>
  );
};

export default Support;
