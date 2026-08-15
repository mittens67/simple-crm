import { useState, useEffect } from 'react';
import type { CustomerInput } from '../../../../types/customer';

interface Customer {
  id: string;
  name: string;
  email: string;
  phone: string;
  assigned_rep?: {
    id: string;
    name: string;
  };
}

interface User {
  id: string;
  name: string;
  email: string;
}

interface CustomerModalProps {
  customer: Customer | null;
  users: User[];
  on_save: (input: CustomerInput) => void;
  on_close: () => void;
}

const CustomerModal = ({ customer, users, on_save, on_close }: CustomerModalProps) => {
  const [form_data, set_form_data] = useState({
    name: '',
    email: '',
    phone: '',
    assigned_rep_id: '',
  });

  useEffect(() => {
    if (customer) {
      set_form_data({
        name: customer.name,
        email: customer.email,
        phone: customer.phone,
        assigned_rep_id: customer.assigned_rep?.id || '',
      });
    }
  }, [customer]);

  const handle_change = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    set_form_data((prev) => ({ ...prev, [name]: value }));
  };

  const handle_submit = (e: React.FormEvent) => {
    e.preventDefault();
    const { name, email, phone, assigned_rep_id } = form_data;
    const input = {
      name,
      email,
      phone,
      ...(assigned_rep_id && { assigned_rep_id }),
    };
    on_save(input);
  };

  return (
    <div className="modal-overlay" onClick={on_close}>
      <div className="modal-content" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h2>{customer ? 'Edit Customer' : 'New Customer'}</h2>
          <button className="modal-close" onClick={on_close}>
            ✕
          </button>
        </div>

        <form onSubmit={handle_submit} className="modal-form">
          <div className="form-group">
            <label>Name *</label>
            <input
              type="text"
              name="name"
              value={form_data.name}
              onChange={handle_change}
              required
            />
          </div>

          <div className="form-group">
            <label>Email *</label>
            <input
              type="email"
              name="email"
              value={form_data.email}
              onChange={handle_change}
              required
            />
          </div>

          <div className="form-group">
            <label>Phone *</label>
            <input
              type="tel"
              name="phone"
              value={form_data.phone}
              onChange={handle_change}
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

          <div className="modal-actions">
            <button type="button" className="btn-secondary" onClick={on_close}>
              Cancel
            </button>
            <button type="submit" className="btn-primary">
              {customer ? 'Update' : 'Create'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default CustomerModal;
