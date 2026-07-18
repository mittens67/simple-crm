import { useState } from 'react';
import { useQuery, useMutation } from '@apollo/client';
import { useAuth } from '../../../../auth/auth-context';
import {
  DEALS_QUERY,
  CREATE_DEAL_MUTATION,
  UPDATE_DEAL_MUTATION,
  DELETE_DEAL_MUTATION,
  CUSTOMERS_QUERY,
  USERS_QUERY,
} from '../../../../lib/graphql-queries';
import DealModal from './deal-modal';
import '../(leads)/leads.scss';

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
  created_at: string;
  updated_at: string;
}

interface Customer {
  id: string;
  name: string;
}

interface User {
  id: string;
  name: string;
}

const Deals = () => {
  const { can } = useAuth();
  const [modal_open, set_modal_open] = useState(false);
  const [editing, set_editing] = useState<Deal | null>(null);
  const [search, set_search] = useState('');

  const { data: deals_data, loading: deals_loading, refetch: refetch_deals } = useQuery(DEALS_QUERY);
  const { data: customers_data } = useQuery(CUSTOMERS_QUERY);
  const { data: users_data } = useQuery(USERS_QUERY);

  const [create_deal] = useMutation(CREATE_DEAL_MUTATION, {
    onCompleted: () => {
      refetch_deals();
      set_modal_open(false);
    },
  });

  const [update_deal] = useMutation(UPDATE_DEAL_MUTATION, {
    onCompleted: () => {
      refetch_deals();
      set_modal_open(false);
      set_editing(null);
    },
  });

  const [delete_deal] = useMutation(DELETE_DEAL_MUTATION, {
    onCompleted: () => {
      refetch_deals();
    },
  });

  const handle_create = async (input: any) => {
    await create_deal({ variables: { input } });
  };

  const handle_update = async (input: any) => {
    if (!editing) return;
    await update_deal({ variables: { id: editing.id, input } });
  };

  const handle_delete = async (id: string) => {
    if (window.confirm('Are you sure?')) {
      await delete_deal({ variables: { id } });
    }
  };

  const handle_open_create = () => {
    set_editing(null);
    set_modal_open(true);
  };

  const handle_open_edit = (deal: Deal) => {
    set_editing(deal);
    set_modal_open(true);
  };

  const handle_close_modal = () => {
    set_modal_open(false);
    set_editing(null);
  };

  const deals = deals_data?.deals || [];
  const filtered_deals = deals.filter((deal: Deal) =>
    deal.title.toLowerCase().includes(search.toLowerCase()) ||
    deal.customer.name.toLowerCase().includes(search.toLowerCase())
  );

  const customers: Customer[] = customers_data?.customers || [];
  const users: User[] = users_data?.users || [];

  if (deals_loading) return <div className="leads">Loading...</div>;

  return (
    <div className="leads">
      <div className="leads-header">
        <h1>Deals</h1>
        {can('deals.create') && (
          <button className="btn-primary" onClick={handle_open_create}>
            + New Deal
          </button>
        )}
      </div>

      <div className="leads-search">
        <input
          type="text"
          placeholder="Search deals..."
          value={search}
          onChange={(e) => set_search(e.target.value)}
        />
      </div>

      <table className="leads-table">
        <thead>
          <tr>
            <th>Title</th>
            <th>Customer</th>
            <th>Owner</th>
            <th>Value</th>
            <th>Status</th>
            <th>Stage</th>
            <th>Actions</th>
          </tr>
        </thead>
        <tbody>
          {filtered_deals.map((deal: Deal) => (
            <tr key={deal.id}>
              <td>{deal.title}</td>
              <td>{deal.customer.name}</td>
              <td>{deal.owner.name}</td>
              <td>${deal.value.toLocaleString()}</td>
              <td>
                <span className={`status status-${deal.status.toLowerCase()}`}>
                  {deal.status}
                </span>
              </td>
              <td>{deal.stage}</td>
              <td className="actions">
                {can('deals.update') && (
                  <button className="btn-small" onClick={() => handle_open_edit(deal)}>
                    Edit
                  </button>
                )}
                {can('deals.delete') && (
                  <button className="btn-small btn-danger" onClick={() => handle_delete(deal.id)}>
                    Delete
                  </button>
                )}
              </td>
            </tr>
          ))}
        </tbody>
      </table>

      {modal_open && (
        <DealModal
          deal={editing}
          customers={customers}
          users={users}
          on_save={editing ? handle_update : handle_create}
          on_close={handle_close_modal}
        />
      )}
    </div>
  );
};

export default Deals;
