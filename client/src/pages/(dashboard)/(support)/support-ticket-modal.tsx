import { useState, useEffect } from 'react';
import type { SupportTicket, SupportTicketInput } from '../../../types/support-ticket';
import { TICKET_STATUSES, TICKET_STATUS_LABELS } from '../../../types/common';
import {
  TICKET_PRIORITIES,
  TICKET_CATEGORIES,
  TICKET_CATEGORY_LABELS,
} from '../../../types/support-ticket';

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

const empty_form = {
  customer_id: '',
  assigned_agent: '',
  issue_summary: '',
  status: 'Open',
  internal_notes: '',
  priority: 'Medium',
  category: 'Other',
};

const SupportTicketModal = ({
  ticket,
  customers,
  users,
  on_save,
  on_close,
}: SupportTicketModalProps) => {
  const [form_data, set_form_data] = useState(empty_form);

  useEffect(() => {
    if (!ticket) {
      set_form_data(empty_form);
      return;
    }
    set_form_data({
      customer_id: ticket.customer?.id || ticket.customer_id || '',
      assigned_agent: ticket.assigned_agent?.id || '',
      issue_summary: ticket.issue_summary,
      status: ticket.status,
      internal_notes: ticket.internal_notes || '',
      priority: ticket.priority,
      category: ticket.category,
    });
  }, [ticket]);

  const handle_change = (
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>
  ) => {
    const { name, value } = e.target;
    set_form_data((prev) => ({ ...prev, [name]: value }));
  };

  const handle_submit = (e: React.FormEvent) => {
    e.preventDefault();
    on_save({
      customer_id: form_data.customer_id,
      assigned_agent: form_data.assigned_agent || null,
      issue_summary: form_data.issue_summary,
      status: form_data.status as SupportTicket['status'],
      internal_notes: form_data.internal_notes || undefined,
      priority: form_data.priority as SupportTicket['priority'],
      category: form_data.category as SupportTicket['category'],
    });
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
            <textarea
              name="issue_summary"
              value={form_data.issue_summary}
              onChange={handle_change}
              rows={3}
              required
            />
          </div>

          <div className="form-group">
            <label>Assigned Agent *</label>
            <select
              name="assigned_agent"
              value={form_data.assigned_agent}
              onChange={handle_change}
              required
            >
              <option value="">Select an agent</option>
              {users.map((user) => (
                <option key={user.id} value={user.id}>
                  {user.name}
                </option>
              ))}
            </select>
          </div>

          <div className="form-group">
            <label>Priority</label>
            <select name="priority" value={form_data.priority} onChange={handle_change}>
              {TICKET_PRIORITIES.map((priority) => (
                <option key={priority} value={priority}>
                  {priority}
                </option>
              ))}
            </select>
            {!ticket && (
              <small className="form-hint">
                Sets the response deadline: Urgent 1h, High 4h, Medium 24h, Low 72h.
              </small>
            )}
          </div>

          <div className="form-group">
            <label>Category</label>
            <select name="category" value={form_data.category} onChange={handle_change}>
              {TICKET_CATEGORIES.map((category) => (
                <option key={category} value={category}>
                  {TICKET_CATEGORY_LABELS[category]}
                </option>
              ))}
            </select>
          </div>

          <div className="form-group">
            <label>Status</label>
            <select name="status" value={form_data.status} onChange={handle_change}>
              {TICKET_STATUSES.map((status) => (
                <option key={status} value={status}>
                  {TICKET_STATUS_LABELS[status]}
                </option>
              ))}
            </select>
          </div>

          <div className="form-group">
            <label>Internal Notes</label>
            <textarea
              name="internal_notes"
              value={form_data.internal_notes}
              onChange={handle_change}
              rows={3}
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
