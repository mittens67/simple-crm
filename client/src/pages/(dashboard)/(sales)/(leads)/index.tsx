import { useState } from 'react';
import { useAuth } from '../../../../auth/auth-context';
import { useLeads, useUsers } from '../../../../hooks';
import { useResourcePage } from '../../../../hooks/use-resource-page';
import type { Lead, LeadInput } from '../../../../types/lead';
import LoadingSpinner from '../../../../components/ui/loading-spinner';
import Pagination from '../../../../components/ui/pagination';
import LeadModal from './lead-modal';
import LeadView from './lead-view';
import './leads.scss';

const Leads = () => {
  const { can } = useAuth();
  const leads = useLeads();
  const { items: users } = useUsers();
  const [viewing, set_viewing] = useState<Lead | null>(null);

  const page = useResourcePage<Lead, LeadInput>({ crud: leads, noun: 'lead' });

  const is_terminal = (lead: Lead) => lead.status === 'Archived' || lead.status === 'Converted';

  if (leads.loading && leads.items.length === 0) return <LoadingSpinner />;

  return (
    <div className="leads">
      <div className="leads-header">
        <h1>Leads</h1>
        {can('leads.create') && (
          <button className="btn-primary" onClick={page.open_create}>
            + New Lead
          </button>
        )}
      </div>

      <div className="leads-search">
        <input
          type="text"
          placeholder="Search leads by name, email, or phone..."
          value={page.search_input}
          onChange={(e) => page.set_search_input(e.target.value)}
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
          {leads.items.length === 0 && (
            <tr>
              <td colSpan={7} className="table-empty">
                {page.search_input ? 'No leads match that search.' : 'No leads yet.'}
              </td>
            </tr>
          )}
          {leads.items.map((lead) => (
            <tr key={lead.id}>
              <td>{lead.name}</td>
              <td>{lead.email}</td>
              <td>{lead.phone}</td>
              <td>
                <span className={`status status-${lead.status.toLowerCase()}`}>{lead.status}</span>
              </td>
              <td>{lead.assigned_rep?.name || 'Unassigned'}</td>
              <td>{lead.customer?.name || '-'}</td>
              <td className="actions">
                {can('leads.update') && !is_terminal(lead) && (
                  <button className="btn-small" onClick={() => page.open_edit(lead)}>
                    Edit
                  </button>
                )}
                {can('leads.update') && is_terminal(lead) && (
                  <button className="btn-small" onClick={() => set_viewing(lead)}>
                    View
                  </button>
                )}
                {can('leads.delete') && !is_terminal(lead) && (
                  <button className="btn-small btn-danger" onClick={() => page.remove(lead.id)}>
                    Delete
                  </button>
                )}
              </td>
            </tr>
          ))}
        </tbody>
      </table>

      <Pagination
        offset={leads.offset}
        limit={leads.limit}
        total={leads.total}
        on_previous={leads.previous_page}
        on_next={leads.next_page}
      />

      {viewing && <LeadView lead={viewing} on_close={() => set_viewing(null)} />}

      {page.modal_open && (
        <LeadModal
          lead={page.editing}
          users={users}
          on_save={page.submit}
          on_close={page.close_modal}
        />
      )}
    </div>
  );
};

export default Leads;
