import { useState } from 'react';
import { useAuth } from '../../../../auth/auth-context';
import { useDeals, useCustomers, useUsers } from '../../../../hooks';
import { useDialog } from '../../../../components/dialogs/DialogProvider';
import LoadingSpinner from '../../../../components/ui/loading-spinner';
import DealModal from './deal-modal';
import '../(leads)/leads.scss';

const Deals = () => {
  const { can } = useAuth();
  const { deals, loading, create, update, delete: deleteDeal, setError: setDeals_error } = useDeals();
  const { customers } = useCustomers();
  const { users } = useUsers();
  const { showAlert, showConfirm } = useDialog();
  const [modal_open, set_modal_open] = useState(false);
  const [editing, set_editing] = useState<any>(null);
  const [search_input, set_search_input] = useState('');

  const filtered_deals = deals.filter((deal: any) =>
    deal.title.toLowerCase().includes(search_input.toLowerCase()) ||
    deal.customer.name.toLowerCase().includes(search_input.toLowerCase())
  );

  const handle_create = async (input: any) => {
    try {
      await create(input as any);
      set_modal_open(false);
    } catch (err) {
      const error_msg = err instanceof Error ? err.message : 'Failed to create deal';
      setDeals_error(error_msg);
      await showAlert('Error', `Error creating deal: ${error_msg}`);
    }
  };

  const handle_update = async (input: any) => {
    if (!editing) return;
    try {
      await update(editing.id, input as any);
      set_modal_open(false);
      set_editing(null);
    } catch (err) {
      const error_msg = err instanceof Error ? err.message : 'Failed to update deal';
      setDeals_error(error_msg);
      await showAlert('Error', `Error updating deal: ${error_msg}`);
    }
  };

  const handle_delete = async (id: string) => {
    const confirmed = await showConfirm({
      title: 'Delete Deal',
      message: 'Are you sure you want to delete this deal?',
      confirmText: 'Delete',
      cancelText: 'Cancel',
    });
    if (confirmed) {
      try {
        await deleteDeal(id);
      } catch (err) {
        const error_msg = err instanceof Error ? err.message : 'Failed to delete deal';
        setDeals_error(error_msg);
        await showAlert('Error', `Error deleting deal: ${error_msg}`);
      }
    }
  };

  const handle_open_create = () => {
    set_editing(null);
    set_modal_open(true);
  };

  const handle_open_edit = (deal: any) => {
    set_editing(deal);
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
          value={search_input}
          onChange={(e) => set_search_input(e.target.value)}
          disabled={loading}
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
          {filtered_deals.map((deal: any) => (
            <tr key={deal.id}>
              <td>{deal.title}</td>
              <td>{deal.customer.name}</td>
              <td>{deal.owner?.name || 'Unassigned'}</td>
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
