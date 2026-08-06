import { useState, useEffect } from 'react';
import { useQuery, useMutation } from '@apollo/client';
import { useAuth } from '../../../../auth/auth-context';
import LoadingSpinner from '../../../../components/ui/loading-spinner';
import {
  LEADS_QUERY,
  CREATE_LEAD_MUTATION,
  UPDATE_LEAD_MUTATION,
  DELETE_LEAD_MUTATION,
  USERS_QUERY,
  CUSTOMERS_QUERY,
} from '../../../../lib/graphql-queries';
import LeadModal from './lead-modal';
import LeadView from './lead-view';
import type { LeadInput } from './lead-modal';
import './leads.scss';

interface Lead {
  id: string;
  name: string;
  email: string;
  phone: string;
  status: string;
  assigned_rep?: {
    id: string;
    name: string;
    email: string;
  };
  customer?: {
    id: string;
    name: string;
  };
  sales_notes?: string;
  archive_notes?: string;
  created_at: string;
  updated_at: string;
}

interface User {
  id: string;
  name: string;
  email: string;
}

const Leads = () => {
  const { can } = useAuth();
  const [modal_open, set_modal_open] = useState(false);
  const [editing, set_editing] = useState<Lead | null>(null);
  const [viewing, set_viewing] = useState<Lead | null>(null);
  const [search_input, set_search_input] = useState('');
  const [search_query, set_search_query] = useState('');
  const [limit] = useState(20);
  const [offset, set_offset] = useState(0);

  useEffect(() => {
    const timer = setTimeout(() => {
      set_search_query(search_input);
      set_offset(0);
    }, 300);
    return () => clearTimeout(timer);
  }, [search_input]);

  const { data: leads_data, loading: leads_loading, refetch: refetch_leads } = useQuery(LEADS_QUERY, {
    variables: { search: search_query || undefined, limit, offset },
  });
  const { data: users_data } = useQuery(USERS_QUERY);

  const [create_lead] = useMutation(CREATE_LEAD_MUTATION, {
    onCompleted: () => {
      refetch_leads();
      set_modal_open(false);
    },
    onError: (error) => {
      console.error('Create lead error:', error.message);
      alert(`Error creating lead: ${error.message}`);
    },
  });

  const [update_lead] = useMutation(UPDATE_LEAD_MUTATION, {
    refetchQueries: [{ query: CUSTOMERS_QUERY }],
    onCompleted: () => {
      refetch_leads();
      set_modal_open(false);
      set_editing(null);
    },
  });

  const [delete_lead] = useMutation(DELETE_LEAD_MUTATION, {
    onCompleted: () => {
      refetch_leads();
    },
  });

  const handle_create = async (input: LeadInput) => {
    await create_lead({ variables: { input } });
  };

  const handle_update = async (input: LeadInput) => {
    if (!editing) return;
    await update_lead({ variables: { id: editing.id, input } });
  };

  const handle_delete = async (id: string) => {
    if (window.confirm('Are you sure?')) {
      await delete_lead({ variables: { id } });
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

  const leads = leads_data?.leads?.data || [];
  const total = leads_data?.leads?.total || 0;
  const max_pages = Math.ceil(total / limit);
  const users: User[] = users_data?.users || [];

  if (leads_loading) return <LoadingSpinner />;

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
          onClick={() => set_offset(Math.max(0, offset - limit))}
          disabled={offset === 0}
        >
          ← Previous
        </button>
        <span style={{ fontSize: '14px' }}>
          Page {offset / limit + 1} of {max_pages || 1} ({total} total)
        </span>
        <button
          className="btn-secondary"
          onClick={() => set_offset(offset + limit)}
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
