import { useState, useEffect } from 'react';

interface Lead {
  id: string;
  name: string;
  email: string;
  phone: string;
  status: string;
  assigned_rep?: {
    id: string;
    name: string;
  };
  customer?: {
    id: string;
    name: string;
  };
  sales_notes?: string;
  archive_notes?: string;
}

interface User {
  id: string;
  name: string;
  email: string;
}

interface LeadModalProps {
  lead: Lead | null;
  users: User[];
  on_save: (input: any) => void;
  on_close: () => void;
}

const LeadModal = ({ lead, users, on_save, on_close }: LeadModalProps) => {
  const [form_data, set_form_data] = useState({
    name: '',
    email: '',
    phone: '',
    status: 'Open',
    assigned_rep_id: '',
    sales_notes: '',
    archive_notes: '',
  });

  useEffect(() => {
    if (lead) {
      set_form_data({
        name: lead.name,
        email: lead.email,
        phone: lead.phone,
        status: lead.status,
        assigned_rep_id: lead.assigned_rep?.id || '',
        sales_notes: lead.sales_notes || '',
        archive_notes: lead.archive_notes || '',
      });
    }
  }, [lead]);

  const handle_change = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    set_form_data((prev) => ({ ...prev, [name]: value }));
  };

  const handle_submit = (e: React.FormEvent) => {
    e.preventDefault();
    const { name, email, phone, status, assigned_rep_id, sales_notes, archive_notes } = form_data;
    const input = {
      name,
      email,
      phone,
      status,
      ...(assigned_rep_id && { assigned_rep_id }),
      ...(sales_notes && { sales_notes }),
      ...(archive_notes && { archive_notes }),
    };
    on_save(input);
  };

  const is_terminal = lead && (lead.status === 'Archived' || lead.status === 'Converted');

  return (
    <div className="modal-overlay" onClick={on_close}>
      <div className="modal-content" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h2>{lead ? 'Edit Lead' : 'New Lead'}</h2>
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
              disabled={is_terminal}
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
              disabled={is_terminal}
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
              disabled={is_terminal}
              required
            />
          </div>

          <div className="form-group">
            <label>Status</label>
            <select name="status" value={form_data.status} onChange={handle_change} disabled={is_terminal}>
              <option>Open</option>
              <option>Pending</option>
              <option>Archived</option>
              <option>Converted</option>
            </select>
          </div>

          <div className="form-group">
            <label>Assigned Rep</label>
            <select
              name="assigned_rep_id"
              value={form_data.assigned_rep_id}
              onChange={handle_change}
              disabled={is_terminal}
            >
              <option value="">Unassigned</option>
              {users.map((user) => (
                <option key={user.id} value={user.id}>
                  {user.name}
                </option>
              ))}
            </select>
          </div>

          {form_data.status !== 'Archived' && (
            <div className="form-group">
              <label>Sales Notes</label>
              <textarea
                name="sales_notes"
                value={form_data.sales_notes}
                onChange={handle_change}
                disabled={is_terminal}
                rows={3}
                placeholder="Track conversations, interests, objections..."
              />
            </div>
          )}

          {(form_data.status === 'Archived' || form_data.status === 'Converted') && (
            <div className="form-group">
              <label>Archive Notes</label>
              <textarea
                name="archive_notes"
                value={form_data.archive_notes}
                onChange={handle_change}
                disabled={is_terminal && form_data.status === 'Converted'}
                rows={3}
                placeholder="Reason for archiving or converting..."
              />
            </div>
          )}

          <div className="modal-actions">
            <button type="button" className="btn-secondary" onClick={on_close}>
              Close
            </button>
            {!is_terminal && (
              <button type="submit" className="btn-primary">
                {lead ? 'Update' : 'Create'}
              </button>
            )}
          </div>
        </form>
      </div>
    </div>
  );
};

export default LeadModal;
