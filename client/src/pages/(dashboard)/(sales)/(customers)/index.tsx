import { Link } from 'react-router-dom';
import { Building2, Plus } from 'lucide-react';
import { useAuth } from '../../../../auth/auth-context';
import { useCustomers, useUsers } from '../../../../hooks';
import { useResourcePage } from '../../../../hooks/use-resource-page';
import type { Customer, CustomerInput } from '../../../../types/customer';
import {
  Button,
  DataTable,
  EmptyState,
  Pagination,
  type Column,
} from '../../../../components/ui';
import ListPage from '../../../../components/layout/list-page';
import CustomerModal from './customer-modal';

const Customers = () => {
  const { can } = useAuth();
  const customers = useCustomers();
  const { items: users } = useUsers();

  const page = useResourcePage<Customer, CustomerInput>({ crud: customers, noun: 'customer' });

  const columns: Column<Customer>[] = [
    {
      key: 'name',
      header: 'Name',
      sort_value: (customer) => customer.name,
      render: (customer) => (
        <Link to={`/customers/${customer.id}`} className="list-cell-primary">
          {customer.name}
        </Link>
      ),
    },
    {
      key: 'email',
      header: 'Email',
      sort_value: (customer) => customer.email,
      render: (customer) => customer.email,
    },
    {
      key: 'phone',
      header: 'Phone',
      hide_on_mobile: true,
      render: (customer) => customer.phone,
    },
    {
      key: 'rep',
      header: 'Assigned Rep',
      sort_value: (customer) => customer.assigned_rep?.name ?? null,
      hide_on_mobile: true,
      render: (customer) =>
        customer.assigned_rep?.name ?? <span className="muted">Unassigned</span>,
    },
    {
      key: 'actions',
      header: 'Actions',
      align: 'right',
      render: (customer) => (
        <div className="list-row-actions">
          {can('customers.update') && (
            <Button size="sm" onClick={() => page.open_edit(customer)}>
              Edit
            </Button>
          )}
          {can('customers.delete') && (
            <Button size="sm" variant="danger" onClick={() => page.remove(customer.id)}>
              Delete
            </Button>
          )}
        </div>
      ),
    },
  ];

  return (
    <ListPage
      title="Customers"
      description="Accounts you have won, and the reps who own them."
      search={{
        value: page.search_input,
        on_change: page.set_search_input,
        placeholder: 'Search customers by name, email, or phone',
        result_count: customers.total,
      }}
      actions={
        can('customers.create') && (
          <Button variant="primary" icon={<Plus />} onClick={page.open_create}>
            New Customer
          </Button>
        )
      }
    >
      <DataTable
        caption="Customers"
        columns={columns}
        rows={customers.items}
        row_key={(customer) => customer.id}
        loading={customers.loading}
        empty={
          <EmptyState
            icon={<Building2 />}
            title={page.search_input ? 'No customers match that search' : 'No customers yet'}
            description={
              page.search_input
                ? 'Try a different name, email or phone number.'
                : 'Customers are created automatically when a lead converts.'
            }
          />
        }
      />

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
          saving={page.saving}
          on_save={page.submit}
          on_close={page.close_modal}
        />
      )}
    </ListPage>
  );
};

export default Customers;
