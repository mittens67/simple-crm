import { useState } from 'react';
import { useQuery, useMutation } from '@apollo/client';
import { useAuth } from '../../../auth/auth-context';
import LoadingSpinner from '../../../components/ui/loading-spinner';
import {
  SUPPORT_TICKETS_QUERY,
  CREATE_SUPPORT_TICKET_MUTATION,
  UPDATE_SUPPORT_TICKET_MUTATION,
  DELETE_SUPPORT_TICKET_MUTATION,
  CUSTOMERS_QUERY,
  USERS_QUERY,
} from '../../../lib/graphql-queries';
import SupportTicketModal from './support-ticket-modal';
import '../(sales)/(leads)/leads.scss';

interface SupportTicket {
  id: string;
  customer: {
    id: string;
    name: string;
  };
  assigned_agent?: {
    id: string;
    name: string;
  };
  status: string;
  issue_summary: string;
  internal_notes: string;
  created_at: string;
  updated_at: string;
}

interface Customer {
  id: string;
  name: string;
}

interface User {
  id: string;
  name: string;
}

const Support = () => {
  const { can } = useAuth();
  const [modal_open, set_modal_open] = useState(false);
  const [editing, set_editing] = useState<SupportTicket | null>(null);
  const [search, set_search] = useState('');

  const { data: tickets_data, loading: tickets_loading, refetch: refetch_tickets } = useQuery(SUPPORT_TICKETS_QUERY);
  const { data: customers_data } = useQuery(CUSTOMERS_QUERY);
  const { data: users_data } = useQuery(USERS_QUERY);

  const [create_ticket] = useMutation(CREATE_SUPPORT_TICKET_MUTATION, {
    onCompleted: () => {
      refetch_tickets();
      set_modal_open(false);
    },
    onError: (error) => {
      console.error('Create ticket error:', error.message);
      alert(`Error creating ticket: ${error.message}`);
    },
  });

  const [update_ticket] = useMutation(UPDATE_SUPPORT_TICKET_MUTATION, {
    onCompleted: () => {
      refetch_tickets();
      set_modal_open(false);
      set_editing(null);
    },
  });

  const [delete_ticket] = useMutation(DELETE_SUPPORT_TICKET_MUTATION, {
    onCompleted: () => {
      refetch_tickets();
    },
  });

  const handle_create = async (input: any) => {
    await create_ticket({ variables: { input } });
  };

  const handle_update = async (input: any) => {
    if (!editing) return;
    await update_ticket({ variables: { id: editing.id, input } });
  };

  const handle_delete = async (id: string) => {
    if (window.confirm('Are you sure?')) {
      await delete_ticket({ variables: { id } });
    }
  };

  const handle_open_create = () => {
    set_editing(null);
    set_modal_open(true);
  };

  const handle_open_edit = (ticket: SupportTicket) => {
    set_editing(ticket);
    set_modal_open(true);
  };

  const handle_close_modal = () => {
    set_modal_open(false);
    set_editing(null);
  };

  const tickets = tickets_data?.supportTickets || [];
  const filtered_tickets = tickets.filter((ticket: SupportTicket) =>
    ticket.issue_summary.toLowerCase().includes(search.toLowerCase()) ||
    ticket.customer.name.toLowerCase().includes(search.toLowerCase())
  );

  const customers: Customer[] = customers_data?.customers || [];
  const users: User[] = users_data?.users || [];

  if (tickets_loading) return <LoadingSpinner />;

  return (
    <div className="leads">
      <div className="leads-header">
        <h1>Support Tickets</h1>
        {can('support_tickets.create') && (
          <button className="btn-primary" onClick={handle_open_create}>
            + New Ticket
          </button>
        )}
      </div>

      <div className="leads-search">
        <input
          type="text"
          placeholder="Search tickets..."
          value={search}
          onChange={(e) => set_search(e.target.value)}
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
          {filtered_tickets.map((ticket: SupportTicket) => (
            <tr key={ticket.id}>
              <td>{ticket.issue_summary}</td>
              <td>{ticket.customer.name}</td>
              <td>{ticket.assigned_agent?.name || 'Unassigned'}</td>
              <td>
                <span className={`status status-${ticket.status.toLowerCase()}`}>
                  {ticket.status}
                </span>
              </td>
              <td className="actions">
                {can('support_tickets.update') && (
                  <button className="btn-small" onClick={() => handle_open_edit(ticket)}>
                    Edit
                  </button>
                )}
                {can('support_tickets.delete') && (
                  <button className="btn-small btn-danger" onClick={() => handle_delete(ticket.id)}>
                    Delete
                  </button>
                )}
              </td>
            </tr>
          ))}
        </tbody>
      </table>

      {modal_open && (
        <SupportTicketModal
          ticket={editing}
          customers={customers}
          users={users}
          on_save={editing ? handle_update : handle_create}
          on_close={handle_close_modal}
        />
      )}
    </div>
  );
};

export default Support;
