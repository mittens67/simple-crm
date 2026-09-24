import { useState, useEffect } from 'react';
import type { Deal, DealInput } from '../../../../types/deal';
import { DEAL_STAGES, DEAL_STATUSES } from '../../../../types/common';

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

const empty_form = {
  title: '',
  customer_id: '',
  owner_id: '',
  value: '',
  status: 'Open',
  stage: DEAL_STAGES[0] as string,
};

const DealModal = ({ deal, customers, users, on_save, on_close }: DealModalProps) => {
  const [form_data, set_form_data] = useState(empty_form);

  useEffect(() => {
    if (!deal) {
      set_form_data(empty_form);
      return;
    }
    set_form_data({
      title: deal.title,
      customer_id: deal.customer?.id || deal.customer_id,
      owner_id: deal.owner?.id || deal.owner_id || '',
      value: String(deal.value),
      status: deal.status || 'Open',
      stage: deal.stage || DEAL_STAGES[0],
    });
  }, [deal]);

  const handle_change = (
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>
  ) => {
    const { name, value } = e.target;
    set_form_data((prev) => ({ ...prev, [name]: value }));
  };

  const handle_submit = (e: React.FormEvent) => {
    e.preventDefault();
    on_save({
      title: form_data.title,
      customer_id: form_data.customer_id,
      // The server requires an owner, so fall back to nothing only on edit,
      // where the existing owner is preserved.
      owner_id: form_data.owner_id || null,
      value: parseFloat(form_data.value),
      status: form_data.status as Deal['status'],
      stage: form_data.stage,
    });
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
            <label>Value *</label>
            <input
              type="number"
              name="value"
              value={form_data.value}
              onChange={handle_change}
              step="0.01"
              min="0"
              required
            />
          </div>

          <div className="form-group">
            <label>Owner *</label>
            <select name="owner_id" value={form_data.owner_id} onChange={handle_change} required>
              <option value="">Select an owner</option>
              {users.map((user) => (
                <option key={user.id} value={user.id}>
                  {user.name}
                </option>
              ))}
            </select>
          </div>

          <div className="form-group">
            <label>Stage *</label>
            <select name="stage" value={form_data.stage} onChange={handle_change} required>
              {DEAL_STAGES.map((stage) => (
                <option key={stage} value={stage}>
                  {stage}
                </option>
              ))}
            </select>
          </div>

          <div className="form-group">
            <label>Status</label>
            <select name="status" value={form_data.status} onChange={handle_change}>
              {DEAL_STATUSES.map((status) => (
                <option key={status} value={status}>
                  {status}
                </option>
              ))}
            </select>
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
