import { useState, useEffect } from 'react';
import type { Deal, DealInput } from '../../../../types/deal';

interface Customer {
  id: string;
  name: string;
}

interface User {
  id: string;
  name: string;
}

interface DealModalProps {
  deal: Deal | null;
  customers: Customer[];
  users: User[];
  on_save: (input: DealInput) => void;
  on_close: () => void;
}

const DealModal = ({ deal, customers, users, on_save, on_close }: DealModalProps) => {
  const [form_data, set_form_data] = useState({
    title: '',
    description: '',
    customer_id: '',
    assigned_rep_id: '',
    amount: '',
    status: 'Open',
    expected_close_date: '',
    notes: '',
  });

  useEffect(() => {
    if (deal) {
      set_form_data({
        title: deal.title,
        description: deal.description || '',
        customer_id: deal.customer_id,
        assigned_rep_id: deal.assigned_rep_id || '',
        amount: String(deal.amount),
        status: deal.status || 'Open',
        expected_close_date: deal.expected_close_date || '',
        notes: deal.notes || '',
      });
    }
  }, [deal]);

  const handle_change = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    set_form_data((prev) => ({ ...prev, [name]: value }));
  };

  const handle_submit = (e: React.FormEvent) => {
    e.preventDefault();

    if (deal) {
      const partial_input: Partial<DealInput> = {};
      if (form_data.title) partial_input.title = form_data.title;
      if (form_data.description) partial_input.description = form_data.description;
      if (form_data.customer_id) partial_input.customer_id = form_data.customer_id;
      if (form_data.assigned_rep_id) partial_input.assigned_rep_id = form_data.assigned_rep_id;
      if (form_data.amount) partial_input.amount = parseFloat(form_data.amount);
      if (form_data.status) partial_input.status = form_data.status as Deal['status'];
      if (form_data.expected_close_date) partial_input.expected_close_date = form_data.expected_close_date;
      if (form_data.notes) partial_input.notes = form_data.notes;
      on_save(partial_input as DealInput);
    } else {
      on_save({
        title: form_data.title,
        description: form_data.description || undefined,
        customer_id: form_data.customer_id,
        assigned_rep_id: form_data.assigned_rep_id || undefined,
        amount: parseFloat(form_data.amount),
        status: form_data.status as Deal['status'],
        expected_close_date: form_data.expected_close_date || undefined,
        notes: form_data.notes || undefined,
      });
    }
  };

  return (
    <div className="modal-overlay" onClick={on_close}>
      <div className="modal-content" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h2>{deal ? 'Edit Deal' : 'New Deal'}</h2>
          <button className="modal-close" onClick={on_close}>
            ✕
          </button>
        </div>

        <form onSubmit={handle_submit} className="modal-form">
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
            <label>Amount *</label>
            <input
              type="number"
              name="amount"
              value={form_data.amount}
              onChange={handle_change}
              step="0.01"
              required
            />
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
            <label>Expected Close Date</label>
            <input
              type="date"
              name="expected_close_date"
              value={form_data.expected_close_date}
              onChange={handle_change}
            />
          </div>

          <div className="form-group">
            <label>Status</label>
            <select name="status" value={form_data.status} onChange={handle_change}>
              <option value="Open">Open</option>
              <option value="Won">Won</option>
              <option value="Lost">Lost</option>
              <option value="Pending">Pending</option>
            </select>
          </div>

          <div className="form-group">
            <label>Notes</label>
            <textarea
              name="notes"
              value={form_data.notes}
              onChange={handle_change}
              rows={3}
            />
          </div>

          <div className="modal-actions">
            <button type="button" className="btn-secondary" onClick={on_close}>
              Cancel
            </button>
            <button type="submit" className="btn-primary">
              {deal ? 'Update' : 'Create'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default DealModal;
