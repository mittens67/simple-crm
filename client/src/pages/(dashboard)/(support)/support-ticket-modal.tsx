import { useState, useEffect } from 'react';
import type { SupportTicketInput } from '../../../../types/support-ticket';

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
}

interface Customer {
  id: string;
  name: string;
}

interface User {
  id: string;
  name: string;
}

interface SupportTicketModalProps {
  ticket: SupportTicket | null;
  customers: Customer[];
  users: User[];
  on_save: (input: SupportTicketInput) => void;
  on_close: () => void;
}

const SupportTicketModal = ({
  ticket,
  customers,
  users,
  on_save,
  on_close,
}: SupportTicketModalProps) => {
  const [form_data, set_form_data] = useState({
    customer_id: '',
    assigned_agent: '',
    issue_summary: '',
    status: 'Open',
    internal_notes: '',
  });

  useEffect(() => {
    if (ticket) {
      set_form_data({
        customer_id: ticket.customer.id,
        assigned_agent: ticket.assigned_agent?.id || '',
        issue_summary: ticket.issue_summary,
        status: ticket.status,
        internal_notes: ticket.internal_notes || '',
      });
    }
  }, [ticket]);

  const handle_change = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    set_form_data((prev) => ({ ...prev, [name]: value }));
  };

  const handle_submit = (e: React.FormEvent) => {
    e.preventDefault();

    if (ticket) {
      const partial_input: Partial<SupportTicketInput> = {};
      if (form_data.status) partial_input.status = form_data.status;
      if (form_data.internal_notes !== undefined) partial_input.internal_notes = form_data.internal_notes;
      if (form_data.assigned_agent !== undefined) partial_input.assigned_agent_id = form_data.assigned_agent || null;
      on_save(partial_input as SupportTicketInput);
    } else {
      on_save({
        customer_id: form_data.customer_id,
        assigned_agent_id: form_data.assigned_agent || undefined,
        issue_summary: form_data.issue_summary,
        status: form_data.status,
        internal_notes: form_data.internal_notes,
      });
    }
  };

  return (
    <div className="modal-overlay" onClick={on_close}>
      <div className="modal-content" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h2>{ticket ? 'Edit Ticket' : 'New Ticket'}</h2>
          <button className="modal-close" onClick={on_close}>
            ✕
          </button>
        </div>

        <form onSubmit={handle_submit} className="modal-form">
          {!ticket && (
            <>
              <div className="form-group">
                <label>Customer *</label>
                <select
                  name="customer_id"
                  value={form_data.customer_id}
                  onChange={handle_change}
                  required
                >
                  <option value="">Select a customer</option>
                  {customers.map((customer) => (
                    <option key={customer.id} value={customer.id}>
                      {customer.name}
                    </option>
                  ))}
                </select>
              </div>

              <div className="form-group">
                <label>Issue Summary *</label>
                <input
                  type="text"
                  name="issue_summary"
                  value={form_data.issue_summary}
                  onChange={handle_change}
                  required
                />
              </div>
            </>
          )}

          <div className="form-group">
            <label>Assigned Agent</label>
            <select
              name="assigned_agent"
              value={form_data.assigned_agent}
              onChange={handle_change}
            >
              <option value="">Unassigned</option>
              {users.map((user) => (
                <option key={user.id} value={user.id}>
                  {user.name}
                </option>
              ))}
            </select>
          </div>

          <div className="form-group">
            <label>Status</label>
            <select name="status" value={form_data.status} onChange={handle_change}>
              <option>Open</option>
              <option>InProgress</option>
              <option>Resolved</option>
              <option>Closed</option>
            </select>
          </div>

          <div className="form-group">
            <label>Internal Notes</label>
            <textarea
              name="internal_notes"
              value={form_data.internal_notes}
              onChange={handle_change}
              rows={4}
            />
          </div>

          <div className="modal-actions">
            <button type="button" className="btn-secondary" onClick={on_close}>
              Cancel
            </button>
            <button type="submit" className="btn-primary">
              {ticket ? 'Update' : 'Create'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default SupportTicketModal;
