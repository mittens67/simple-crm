import { useState } from 'react';
import { useAuth } from '../../../auth/auth-context';
import { useSupportTickets, useCustomers, useUsers } from '../../../hooks';
import LoadingSpinner from '../../../components/ui/loading-spinner';
import SupportTicketModal from './support-ticket-modal';
import '../(sales)/(leads)/leads.scss';

const Support = () => {
  const { can } = useAuth();
  const { tickets, loading, create, update, delete: deleteTicket, setError: setTickets_error } = useSupportTickets();
  const { customers } = useCustomers();
  const { users } = useUsers();
  const [modal_open, set_modal_open] = useState(false);
  const [editing, set_editing] = useState<any>(null);
  const [search_input, set_search_input] = useState('');

  const filtered_tickets = tickets.filter((ticket: any) =>
    ticket.issue_summary.toLowerCase().includes(search_input.toLowerCase()) ||
    ticket.customer.name.toLowerCase().includes(search_input.toLowerCase())
  );

  const handle_create = async (input: any) => {
    try {
      await create(input as any);
      set_modal_open(false);
    } catch (err) {
      const error_msg = err instanceof Error ? err.message : 'Failed to create ticket';
      setTickets_error(error_msg);
      alert(`Error creating ticket: ${error_msg}`);
    }
  };

  const handle_update = async (input: any) => {
    if (!editing) return;
    try {
      await update(editing.id, input as any);
      set_modal_open(false);
      set_editing(null);
    } catch (err) {
      const error_msg = err instanceof Error ? err.message : 'Failed to update ticket';
      setTickets_error(error_msg);
      alert(`Error updating ticket: ${error_msg}`);
    }
  };

  const handle_delete = async (id: string) => {
    if (window.confirm('Are you sure?')) {
      try {
        await deleteTicket(id);
      } catch (err) {
        const error_msg = err instanceof Error ? err.message : 'Failed to delete ticket';
        setTickets_error(error_msg);
        alert(`Error deleting ticket: ${error_msg}`);
      }
    }
  };

  const handle_open_create = () => {
    set_editing(null);
    set_modal_open(true);
  };

  const handle_open_edit = (ticket: any) => {
    set_editing(ticket);
    set_modal_open(true);
  };

  const handle_close_modal = () => {
    set_modal_open(false);
    set_editing(null);
  };

  if (loading) return <LoadingSpinner />;

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
          value={search_input}
          onChange={(e) => set_search_input(e.target.value)}
          disabled={loading}
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
          {filtered_tickets.map((ticket: any) => (
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
