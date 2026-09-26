import { Link } from 'react-router-dom';
import { Handshake, KanbanSquare, Plus } from 'lucide-react';
import { useAuth } from '../../../../auth/auth-context';
import { useDeals, useCustomers, useUsers } from '../../../../hooks';
import { useResourcePage } from '../../../../hooks/use-resource-page';
import type { Deal, DealInput } from '../../../../types/deal';
import {
  Badge,
  Button,
  ButtonLink,
  DataTable,
  EmptyState,
  Pagination,
  tone_for_status,
  type Column,
} from '../../../../components/ui';
import ListPage from '../../../../components/layout/list-page';
import DealModal from './deal-modal';

const money = (value: number) => `$${(value ?? 0).toLocaleString()}`;

const Deals = () => {
  const { can } = useAuth();
  const deals = useDeals();
  const { items: customers } = useCustomers();
  const { items: users } = useUsers();

  const page = useResourcePage<Deal, DealInput>({ crud: deals, noun: 'deal' });

  const columns: Column<Deal>[] = [
    {
      key: 'title',
      header: 'Title',
      sort_value: (deal) => deal.title,
      render: (deal) => (
        <Link to={`/deals/${deal.id}`} className="list-cell-primary">
          {deal.title}
        </Link>
      ),
    },
    {
      key: 'customer',
      header: 'Customer',
      sort_value: (deal) => deal.customer?.name ?? null,
      hide_on_mobile: true,
      render: (deal) => deal.customer?.name ?? <span className="muted">—</span>,
    },
    {
      key: 'owner',
      header: 'Owner',
      sort_value: (deal) => deal.owner?.name ?? null,
      hide_on_mobile: true,
      render: (deal) => deal.owner?.name ?? <span className="muted">Unassigned</span>,
    },
    {
      key: 'value',
      header: 'Value',
      align: 'right',
      sort_value: (deal) => deal.value,
      render: (deal) => money(deal.value),
    },
    {
      key: 'weighted',
      header: 'Weighted',
      align: 'right',
      hide_on_mobile: true,
      sort_value: (deal) => deal.weighted_value,
      // Value scaled by the stage's win probability.
      render: (deal) => <span className="muted">{money(deal.weighted_value)}</span>,
    },
    {
      key: 'stage',
      header: 'Stage',
      sort_value: (deal) => deal.stage?.display_order ?? null,
      render: (deal) =>
        deal.stage ? (
          <span title={`${deal.stage.probability}% win probability`}>{deal.stage.name}</span>
        ) : (
          <span className="muted">—</span>
        ),
    },
    {
      key: 'days_in_stage',
      header: 'Days',
      align: 'right',
      hide_on_mobile: true,
      sort_value: (deal) => deal.days_in_stage,
      // Long-stalled deals are the ones worth noticing.
      render: (deal) => (
        <span className={deal.days_in_stage > 30 ? 'deals-stalled' : undefined}>
          {deal.days_in_stage}
        </span>
      ),
    },
    {
      key: 'status',
      header: 'Status',
      sort_value: (deal) => deal.status,
      render: (deal) => <Badge tone={tone_for_status(deal.status)}>{deal.status}</Badge>,
    },
    {
      key: 'actions',
      header: 'Actions',
      align: 'right',
      render: (deal) => (
        <div className="list-row-actions">
          {can('deals.update') && (
            <Button size="sm" onClick={() => page.open_edit(deal)}>
              Edit
            </Button>
          )}
          {can('deals.delete') && (
            <Button size="sm" variant="danger" onClick={() => page.remove(deal.id)}>
              Delete
            </Button>
          )}
        </div>
      ),
    },
  ];

  return (
    <ListPage
      title="Deals"
      description="Open opportunities and their position in the pipeline."
      search={{
        value: page.search_input,
        on_change: page.set_search_input,
        placeholder: 'Search deals by title or stage',
        result_count: deals.total,
      }}
      actions={
        <>
          <ButtonLink to="/pipeline" icon={<KanbanSquare />} title="Pipeline board">
            Board
          </ButtonLink>
          {can('deals.create') && (
            <Button variant="primary" icon={<Plus />} onClick={page.open_create}>
              New Deal
            </Button>
          )}
        </>
      }
    >
      <DataTable
        caption="Deals"
        columns={columns}
        rows={deals.items}
        row_key={(deal) => deal.id}
        loading={deals.loading}
        empty={
          <EmptyState
            icon={<Handshake />}
            title={page.search_input ? 'No deals match that search' : 'No deals yet'}
            description={
              page.search_input
                ? 'Try a different title or stage name.'
                : 'Create a deal against a customer to start tracking it.'
            }
            action={
              !page.search_input && can('deals.create') ? (
                <Button variant="primary" icon={<Plus />} onClick={page.open_create}>
                  New Deal
                </Button>
              ) : undefined
            }
          />
        }
      />

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
          saving={page.saving}
          on_save={page.submit}
          on_close={page.close_modal}
        />
      )}
    </ListPage>
  );
};

export default Deals;
