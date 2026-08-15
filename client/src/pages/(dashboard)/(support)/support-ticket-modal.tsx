import { useState, useEffect } from 'react';
import type { SupportTicket, SupportTicketInput } from '../../../types/support-ticket';

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
    assigned_rep_id: '',
    title: '',
    description: '',
    status: 'Open',
    priority: 'Medium',
    resolution: '',
  });

  useEffect(() => {
    if (ticket) {
      set_form_data({
        customer_id: ticket.customer_id || '',
        assigned_rep_id: ticket.assigned_rep_id || '',
        title: ticket.title,
        description: ticket.description,
        status: ticket.status,
        priority: ticket.priority,
        resolution: ticket.resolution || '',
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
      if (form_data.title) partial_input.title = form_data.title;
      if (form_data.description) partial_input.description = form_data.description;
      if (form_data.status) partial_input.status = form_data.status as SupportTicket['status'];
      if (form_data.priority) partial_input.priority = form_data.priority as SupportTicket['priority'];
      if (form_data.resolution !== undefined) partial_input.resolution = form_data.resolution;
      if (form_data.assigned_rep_id !== undefined) partial_input.assigned_rep_id = form_data.assigned_rep_id || null;
      on_save(partial_input as SupportTicketInput);
    } else {
      on_save({
        customer_id: form_data.customer_id,
        assigned_rep_id: form_data.assigned_rep_id || undefined,
        title: form_data.title,
        description: form_data.description,
        status: form_data.status as SupportTicket['status'],
        priority: form_data.priority as SupportTicket['priority'],
        resolution: form_data.resolution || undefined,
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
                <label>Title *</label>
                <input
                  type="text"
                  name="title"
                  value={form_data.title}
                  onChange={handle_change}
                  required
                />
              </div>
            </>
          )}

          <div className="form-group">
            <label>Description</label>
            <textarea
              name="description"
              value={form_data.description}
              onChange={handle_change}
              rows={3}
            />
          </div>

          <div className="form-group">
            <label>Priority</label>
            <select name="priority" value={form_data.priority} onChange={handle_change}>
              <option value="Low">Low</option>
              <option value="Medium">Medium</option>
              <option value="High">High</option>
              <option value="Urgent">Urgent</option>
            </select>
          </div>

          <div className="form-group">
            <label>Assigned Rep</label>
            <select
              name="assigned_rep_id"
              value={form_data.assigned_rep_id}
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
              <option value="Open">Open</option>
              <option value="In Progress">In Progress</option>
              <option value="On Hold">On Hold</option>
              <option value="Closed">Closed</option>
            </select>
          </div>

          <div className="form-group">
            <label>Resolution</label>
            <textarea
              name="resolution"
              value={form_data.resolution}
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
