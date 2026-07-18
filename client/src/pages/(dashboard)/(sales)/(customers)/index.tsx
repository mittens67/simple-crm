import { useState } from 'react';
import { useQuery, useMutation } from '@apollo/client';
import { useAuth } from '../../../../auth/auth-context';
import {
  CUSTOMERS_QUERY,
  CREATE_CUSTOMER_MUTATION,
  UPDATE_CUSTOMER_MUTATION,
  DELETE_CUSTOMER_MUTATION,
  USERS_QUERY,
} from '../../../../lib/graphql-queries';
import CustomerModal from './customer-modal';
import '../(leads)/leads.scss';

interface Customer {
  id: string;
  name: string;
  email: string;
  phone: string;
  assigned_rep?: {
    id: string;
    name: string;
    email: string;
  };
  created_at: string;
  updated_at: string;
}

interface User {
  id: string;
  name: string;
  email: string;
}

const Customers = () => {
  const { can } = useAuth();
  const [modal_open, set_modal_open] = useState(false);
  const [editing, set_editing] = useState<Customer | null>(null);
  const [search, set_search] = useState('');

  const { data: customers_data, loading: customers_loading, refetch: refetch_customers } = useQuery(CUSTOMERS_QUERY);
  const { data: users_data } = useQuery(USERS_QUERY);

  const [create_customer] = useMutation(CREATE_CUSTOMER_MUTATION, {
    onCompleted: () => {
      refetch_customers();
      set_modal_open(false);
    },
    onError: (error) => {
      console.error('Create customer error:', error.message);
      alert(`Error creating customer: ${error.message}`);
    },
  });

  const [update_customer] = useMutation(UPDATE_CUSTOMER_MUTATION, {
    onCompleted: () => {
      refetch_customers();
      set_modal_open(false);
      set_editing(null);
    },
  });

  const [delete_customer] = useMutation(DELETE_CUSTOMER_MUTATION, {
    onCompleted: () => {
      refetch_customers();
    },
  });

  const handle_create = async (input: any) => {
    await create_customer({ variables: { input } });
  };

  const handle_update = async (input: any) => {
    if (!editing) return;
    await update_customer({ variables: { id: editing.id, input } });
  };

  const handle_delete = async (id: string) => {
    if (window.confirm('Are you sure?')) {
      await delete_customer({ variables: { id } });
    }
  };

  const handle_open_create = () => {
    set_editing(null);
    set_modal_open(true);
  };

  const handle_open_edit = (customer: Customer) => {
    set_editing(customer);
    set_modal_open(true);
  };

  const handle_close_modal = () => {
    set_modal_open(false);
    set_editing(null);
  };

  const customers = customers_data?.customers || [];
  const filtered_customers = customers.filter((customer: Customer) =>
    customer.name.toLowerCase().includes(search.toLowerCase()) ||
    customer.email.toLowerCase().includes(search.toLowerCase())
  );

  const users: User[] = users_data?.users || [];

  if (customers_loading) return <div className="leads">Loading...</div>;

  return (
    <div className="leads">
      <div className="leads-header">
        <h1>Customers</h1>
        {can('customers.create') && (
          <button className="btn-primary" onClick={handle_open_create}>
            + New Customer
          </button>
        )}
      </div>

      <div className="leads-search">
        <input
          type="text"
          placeholder="Search customers..."
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
            <th>Assigned Rep</th>
            <th>Actions</th>
          </tr>
        </thead>
        <tbody>
          {filtered_customers.map((customer: Customer) => (
            <tr key={customer.id}>
              <td>{customer.name}</td>
              <td>{customer.email}</td>
              <td>{customer.phone}</td>
              <td>{customer.assigned_rep?.name || 'Unassigned'}</td>
              <td className="actions">
                {can('customers.update') && (
                  <button className="btn-small" onClick={() => handle_open_edit(customer)}>
                    Edit
                  </button>
                )}
                {can('customers.delete') && (
                  <button className="btn-small btn-danger" onClick={() => handle_delete(customer.id)}>
                    Delete
                  </button>
                )}
              </td>
            </tr>
          ))}
        </tbody>
      </table>

      {modal_open && (
        <CustomerModal
          customer={editing}
          users={users}
          on_save={editing ? handle_update : handle_create}
          on_close={handle_close_modal}
        />
      )}
    </div>
  );
};

export default Customers;
