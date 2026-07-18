import { useState, useEffect } from 'react';

interface Deal {
  id: string;
  title: string;
  customer: {
    id: string;
    name: string;
  };
  owner: {
    id: string;
    name: string;
  };
  value: number;
  status: string;
  stage: string;
}

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
  on_save: (input: any) => void;
  on_close: () => void;
}

const DealModal = ({ deal, customers, users, on_save, on_close }: DealModalProps) => {
  const [form_data, set_form_data] = useState({
    title: '',
    customer_id: '',
    owner_id: '',
    value: '',
    status: 'Open',
    stage: '',
  });

  useEffect(() => {
    if (deal) {
      set_form_data({
        title: deal.title,
        customer_id: deal.customer.id,
        owner_id: deal.owner.id,
        value: String(deal.value),
        status: deal.status,
        stage: deal.stage,
      });
    }
  }, [deal]);

  const handle_change = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    set_form_data((prev) => ({ ...prev, [name]: value }));
  };

  const handle_submit = (e: React.FormEvent) => {
    e.preventDefault();
    const input = {
      title: form_data.title,
      customer_id: form_data.customer_id,
      owner_id: form_data.owner_id,
      value: parseFloat(form_data.value),
      status: form_data.status,
      stage: form_data.stage,
    };

    if (deal) {
      const partial_input: any = {};
      if (form_data.title) partial_input.title = form_data.title;
      if (form_data.customer_id) partial_input.customer_id = form_data.customer_id;
      if (form_data.owner_id) partial_input.owner_id = form_data.owner_id;
      if (form_data.value) partial_input.value = parseFloat(form_data.value);
      if (form_data.status) partial_input.status = form_data.status;
      if (form_data.stage) partial_input.stage = form_data.stage;
      on_save(partial_input);
    } else {
      on_save(input);
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
            <label>Owner *</label>
            <select
              name="owner_id"
              value={form_data.owner_id}
              onChange={handle_change}
              required
            >
              <option value="">Select an owner</option>
              {users.map((user) => (
                <option key={user.id} value={user.id}>
                  {user.name}
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
              required
            />
          </div>

          <div className="form-group">
            <label>Status</label>
            <select name="status" value={form_data.status} onChange={handle_change}>
              <option>Open</option>
              <option>Won</option>
              <option>Lost</option>
              <option>Pending</option>
            </select>
          </div>

          <div className="form-group">
            <label>Stage *</label>
            <input
              type="text"
              name="stage"
              value={form_data.stage}
              onChange={handle_change}
              required
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
