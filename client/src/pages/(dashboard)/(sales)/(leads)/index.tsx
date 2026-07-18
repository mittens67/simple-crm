import { useState } from 'react';
import { useQuery, useMutation } from '@apollo/client';
import { useAuth } from '../../../../auth/auth-context';
import {
  LEADS_QUERY,
  CREATE_LEAD_MUTATION,
  UPDATE_LEAD_MUTATION,
  DELETE_LEAD_MUTATION,
  USERS_QUERY,
} from '../../../../lib/graphql-queries';
import LeadModal from './lead-modal';
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
  const [search, set_search] = useState('');

  const { data: leads_data, loading: leads_loading, refetch: refetch_leads } = useQuery(LEADS_QUERY);
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

  const handle_create = async (input: any) => {
    await create_lead({ variables: { input } });
  };

  const handle_update = async (input: any) => {
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
  };

  const leads = leads_data?.leads || [];
  const filtered_leads = leads.filter((lead: Lead) =>
    lead.name.toLowerCase().includes(search.toLowerCase()) ||
    lead.email.toLowerCase().includes(search.toLowerCase())
  );

  const users: User[] = users_data?.users || [];

  if (leads_loading) return <div className="leads">Loading...</div>;

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
          placeholder="Search leads..."
          value={search}
          onChange={(e) => set_search(e.target.value)}
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
          {filtered_leads.map((lead: Lead) => (
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
                  <button className="btn-small" onClick={() => handle_open_edit(lead)}>
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
