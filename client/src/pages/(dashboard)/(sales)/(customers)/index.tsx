import { useAuth } from '../../../../auth/auth-context';
import { useCustomers, useUsers } from '../../../../hooks';
import { useResourcePage } from '../../../../hooks/use-resource-page';
import type { Customer, CustomerInput } from '../../../../types/customer';
import LoadingSpinner from '../../../../components/ui/loading-spinner';
import Pagination from '../../../../components/ui/pagination';
import CustomerModal from './customer-modal';
import '../(leads)/leads.scss';

const Customers = () => {
  const { can } = useAuth();
  const customers = useCustomers();
  const { items: users } = useUsers();

  const page = useResourcePage<Customer, CustomerInput>({ crud: customers, noun: 'customer' });

  if (customers.loading && customers.items.length === 0) return <LoadingSpinner />;

  return (
    <div className="leads">
      <div className="leads-header">
        <h1>Customers</h1>
        {can('customers.create') && (
          <button className="btn-primary" onClick={page.open_create}>
            + New Customer
          </button>
        )}
      </div>

      <div className="leads-search">
        <input
          type="text"
          placeholder="Search customers by name, email, or phone..."
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
            <th>Assigned Rep</th>
            <th>Actions</th>
          </tr>
        </thead>
        <tbody>
          {customers.items.length === 0 && (
            <tr>
              <td colSpan={5} className="table-empty">
                {page.search_input ? 'No customers match that search.' : 'No customers yet.'}
              </td>
            </tr>
          )}
          {customers.items.map((customer) => (
            <tr key={customer.id}>
              <td>{customer.name}</td>
              <td>{customer.email}</td>
              <td>{customer.phone}</td>
              <td>{customer.assigned_rep?.name || 'Unassigned'}</td>
              <td className="actions">
                {can('customers.update') && (
                  <button className="btn-small" onClick={() => page.open_edit(customer)}>
                    Edit
                  </button>
                )}
                {can('customers.delete') && (
                  <button className="btn-small btn-danger" onClick={() => page.remove(customer.id)}>
                    Delete
                  </button>
                )}
              </td>
            </tr>
          ))}
        </tbody>
      </table>

      <Pagination
        offset={customers.offset}
        limit={customers.limit}
        total={customers.total}
        on_previous={customers.previous_page}
        on_next={customers.next_page}
      />

      {page.modal_open && (
        <CustomerModal
          customer={page.editing}
          users={users}
          on_save={page.submit}
          on_close={page.close_modal}
        />
      )}
    </div>
  );
};

export default Customers;
