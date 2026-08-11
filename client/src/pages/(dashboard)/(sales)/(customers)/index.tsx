import { useState } from 'react';
import { useAuth } from '../../../../auth/auth-context';
import { useCustomers, useUsers } from '../../../../hooks';
import type { Customer } from '../../../../types/customer';
import LoadingSpinner from '../../../../components/ui/loading-spinner';
import CustomerModal from './customer-modal';
import '../(leads)/leads.scss';

const Customers = () => {
  const { can } = useAuth();
  const { customers, loading, create, update, delete: deleteCustomer, setError: setCustomers_error } = useCustomers();
  const { users } = useUsers();
  const [modal_open, set_modal_open] = useState(false);
  const [editing, set_editing] = useState<Customer | null>(null);
  const [search_input, set_search_input] = useState('');

  const filtered_customers = customers.filter((customer: Customer) =>
    customer.name.toLowerCase().includes(search_input.toLowerCase()) ||
    customer.email.toLowerCase().includes(search_input.toLowerCase())
  );

  const handle_create = async (input: any) => {
    try {
      await create(input as any);
      set_modal_open(false);
    } catch (err) {
      const error_msg = err instanceof Error ? err.message : 'Failed to create customer';
      setCustomers_error(error_msg);
      alert(`Error creating customer: ${error_msg}`);
    }
  };

  const handle_update = async (input: any) => {
    if (!editing) return;
    try {
      await update(editing.id, input as any);
      set_modal_open(false);
      set_editing(null);
    } catch (err) {
      const error_msg = err instanceof Error ? err.message : 'Failed to update customer';
      setCustomers_error(error_msg);
      alert(`Error updating customer: ${error_msg}`);
    }
  };

  const handle_delete = async (id: string) => {
    if (window.confirm('Are you sure?')) {
      try {
        await deleteCustomer(id);
      } catch (err) {
        const error_msg = err instanceof Error ? err.message : 'Failed to delete customer';
        setCustomers_error(error_msg);
        alert(`Error deleting customer: ${error_msg}`);
      }
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

  if (loading) return <LoadingSpinner />;

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
