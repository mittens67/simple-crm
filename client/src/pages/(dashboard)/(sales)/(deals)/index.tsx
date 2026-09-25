import { useAuth } from '../../../../auth/auth-context';
import { useDeals, useCustomers, useUsers } from '../../../../hooks';
import { useResourcePage } from '../../../../hooks/use-resource-page';
import type { Deal, DealInput } from '../../../../types/deal';
import LoadingSpinner from '../../../../components/ui/loading-spinner';
import Pagination from '../../../../components/ui/pagination';
import DealModal from './deal-modal';
import '../(leads)/leads.scss';

const Deals = () => {
  const { can } = useAuth();
  const deals = useDeals();
  const { items: customers } = useCustomers();
  const { items: users } = useUsers();

  const page = useResourcePage<Deal, DealInput>({ crud: deals, noun: 'deal' });

  if (deals.loading && deals.items.length === 0) return <LoadingSpinner />;

  return (
    <div className="leads">
      <div className="leads-header">
        <h1>Deals</h1>
        {can('deals.create') && (
          <button className="btn-primary" onClick={page.open_create}>
            + New Deal
          </button>
        )}
      </div>

      <div className="leads-search">
        <input
          type="text"
          placeholder="Search deals by title or stage..."
          value={page.search_input}
          onChange={(e) => page.set_search_input(e.target.value)}
        />
      </div>

      <table className="leads-table">
        <thead>
          <tr>
            <th>Title</th>
            <th>Customer</th>
            <th>Owner</th>
            <th>Value</th>
            <th>Stage</th>
            <th>Days in stage</th>
            <th>Status</th>
            <th>Actions</th>
          </tr>
        </thead>
        <tbody>
          {deals.items.length === 0 && (
            <tr>
              <td colSpan={8} className="table-empty">
                {page.search_input ? 'No deals match that search.' : 'No deals yet.'}
              </td>
            </tr>
          )}
          {deals.items.map((deal) => (
            <tr key={deal.id}>
              <td>{deal.title}</td>
              <td>{deal.customer?.name || '-'}</td>
              <td>{deal.owner?.name || 'Unassigned'}</td>
              <td>${(deal.value ?? 0).toLocaleString()}</td>
              <td>{deal.stage?.name || '-'}</td>
              <td>{deal.days_in_stage}</td>
              <td>
                <span className={`status status-${deal.status.toLowerCase()}`}>{deal.status}</span>
              </td>
              <td className="actions">
                {can('deals.update') && (
                  <button className="btn-small" onClick={() => page.open_edit(deal)}>
                    Edit
                  </button>
                )}
                {can('deals.delete') && (
                  <button className="btn-small btn-danger" onClick={() => page.remove(deal.id)}>
                    Delete
                  </button>
                )}
              </td>
            </tr>
          ))}
        </tbody>
      </table>

      <Pagination
        offset={deals.offset}
        limit={deals.limit}
        total={deals.total}
        on_previous={deals.previous_page}
        on_next={deals.next_page}
      />

      {page.modal_open && (
        <DealModal
          deal={page.editing}
          customers={customers}
          users={users}
          on_save={page.submit}
          on_close={page.close_modal}
        />
      )}
    </div>
  );
};

export default Deals;
