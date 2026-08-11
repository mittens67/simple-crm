import { useState, useEffect } from 'react';
import { useAuth } from '../../../../auth/auth-context';
import { useLeads, useUsers } from '../../../../hooks';
import type { Lead } from '../../../../types/lead';
import type { LeadInput } from './lead-modal';
import LoadingSpinner from '../../../../components/ui/loading-spinner';
import LeadModal from './lead-modal';
import LeadView from './lead-view';
import './leads.scss';

const Leads = () => {
  const { can } = useAuth();
  const { leads, total, loading, create, update, delete: deleteLead, setSearch, setOffset, offset, limit, setError: setLeads_error } = useLeads();
  const { users } = useUsers();
  const [modal_open, set_modal_open] = useState(false);
  const [editing, set_editing] = useState<Lead | null>(null);
  const [viewing, set_viewing] = useState<Lead | null>(null);
  const [search_input, set_search_input] = useState('');

  useEffect(() => {
    const timer = setTimeout(() => {
      setSearch(search_input);
      setOffset(0);
    }, 300);
    return () => clearTimeout(timer);
  }, [search_input, setSearch, setOffset]);

  const handle_create = async (input: LeadInput) => {
    try {
      await create(input as any);
      set_modal_open(false);
    } catch (err) {
      const error_msg = err instanceof Error ? err.message : 'Failed to create lead';
      setLeads_error(error_msg);
      alert(`Error creating lead: ${error_msg}`);
    }
  };

  const handle_update = async (input: LeadInput) => {
    if (!editing) return;
    try {
      await update(editing.id, input as any);
      set_modal_open(false);
      set_editing(null);
    } catch (err) {
      const error_msg = err instanceof Error ? err.message : 'Failed to update lead';
      setLeads_error(error_msg);
      alert(`Error updating lead: ${error_msg}`);
    }
  };

  const handle_delete = async (id: string) => {
    if (window.confirm('Are you sure?')) {
      try {
        await deleteLead(id);
      } catch (err) {
        const error_msg = err instanceof Error ? err.message : 'Failed to delete lead';
        setLeads_error(error_msg);
        alert(`Error deleting lead: ${error_msg}`);
      }
    }
  };

  const handle_open_create = () => {
    set_editing(null);
    set_modal_open(true);
  };

  const handle_open_edit = (lead: Lead) => {
    set_editing(lead);
    set_modal_open(true);
  };

  const handle_close_modal = () => {
    set_modal_open(false);
    set_editing(null);
    set_viewing(null);
  };

  const max_pages = Math.ceil(total / limit);

  if (loading) return <LoadingSpinner />;

  return (
    <div className="leads">
      <div className="leads-header">
        <h1>Leads</h1>
        {can('leads.create') && (
          <button className="btn-primary" onClick={handle_open_create}>
            + New Lead
          </button>
        )}
      </div>

      <div className="leads-search">
        <input
          type="text"
          placeholder="Search leads by name, email, or phone..."
          value={search_input}
          onChange={(e) => set_search_input(e.target.value)}
          disabled={loading}
        />
      </div>

      <table className="leads-table">
        <thead>
          <tr>
            <th>Name</th>
            <th>Email</th>
            <th>Phone</th>
            <th>Status</th>
            <th>Assigned Rep</th>
            <th>Converted To</th>
            <th>Actions</th>
          </tr>
        </thead>
        <tbody>
          {leads.map((lead: Lead) => (
            <tr key={lead.id}>
              <td>{lead.name}</td>
              <td>{lead.email}</td>
              <td>{lead.phone}</td>
              <td>
                <span className={`status status-${lead.status.toLowerCase()}`}>
                  {lead.status}
                </span>
              </td>
              <td>{lead.assigned_rep?.name || 'Unassigned'}</td>
              <td>{lead.customer?.name || '-'}</td>
              <td className="actions">
                {can('leads.update') && lead.status !== 'Archived' && lead.status !== 'Converted' && (
                  <button className="btn-small" onClick={() => handle_open_edit(lead)}>
                    Edit
                  </button>
                )}
                {can('leads.update') && (lead.status === 'Archived' || lead.status === 'Converted') && (
                  <button className="btn-small" onClick={() => set_viewing(lead)}>
                    View
                  </button>
                )}
                {can('leads.delete') && lead.status !== 'Archived' && lead.status !== 'Converted' && (
                  <button className="btn-small btn-danger" onClick={() => handle_delete(lead.id)}>
                    Delete
                  </button>
                )}
              </td>
            </tr>
          ))}
        </tbody>
      </table>

      <div className="pagination-controls" style={{ marginTop: '20px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <button
          className="btn-secondary"
          onClick={() => setOffset(Math.max(0, offset - limit))}
          disabled={offset === 0}
        >
          ← Previous
        </button>
        <span style={{ fontSize: '14px' }}>
          Page {offset / limit + 1} of {max_pages || 1} ({total} total)
        </span>
        <button
          className="btn-secondary"
          onClick={() => setOffset(offset + limit)}
          disabled={offset + limit >= total}
        >
          Next →
        </button>
      </div>

      {viewing && (
        <LeadView
          lead={viewing}
          on_close={handle_close_modal}
        />
      )}

      {modal_open && (
        <LeadModal
          lead={editing}
          users={users}
          on_save={editing ? handle_update : handle_create}
          on_close={handle_close_modal}
        />
      )}
    </div>
  );
};

export default Leads;
