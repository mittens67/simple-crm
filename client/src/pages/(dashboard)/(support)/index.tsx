import { LifeBuoy, Plus } from 'lucide-react';
import { useAuth } from '../../../auth/auth-context';
import { useSupportTickets, useCustomers, useUsers } from '../../../hooks';
import { useResourcePage } from '../../../hooks/use-resource-page';
import type { SupportTicket, SupportTicketInput } from '../../../types/support-ticket';
import { TICKET_STATUS_LABELS } from '../../../types/common';
import {
  Badge,
  Button,
  DataTable,
  EmptyState,
  Pagination,
  tone_for_status,
  type Column,
} from '../../../components/ui';
import ListPage from '../../../components/layout/list-page';
import SupportTicketModal from './support-ticket-modal';

const Support = () => {
  const { can } = useAuth();
  const tickets = useSupportTickets();
  const { items: customers } = useCustomers();
  const { items: users } = useUsers();

  const page = useResourcePage<SupportTicket, SupportTicketInput>({
    crud: tickets,
    noun: 'ticket',
  });

  const columns: Column<SupportTicket>[] = [
    {
      key: 'issue',
      header: 'Issue',
      sort_value: (ticket) => ticket.issue_summary,
      render: (ticket) => <span className="list-cell-primary">{ticket.issue_summary}</span>,
    },
    {
      key: 'customer',
      header: 'Customer',
      sort_value: (ticket) => ticket.customer?.name ?? null,
      hide_on_mobile: true,
      render: (ticket) => ticket.customer?.name ?? <span className="muted">—</span>,
    },
    {
      key: 'agent',
      header: 'Agent',
      sort_value: (ticket) => ticket.assigned_agent?.name ?? null,
      hide_on_mobile: true,
      render: (ticket) => ticket.assigned_agent?.name ?? <span className="muted">Unassigned</span>,
    },
    {
      key: 'priority',
      header: 'Priority',
      // Sorted by urgency, not alphabetically — "Urgent" before "Low".
      sort_value: (ticket) => ({ Urgent: 0, High: 1, Medium: 2, Low: 3 })[ticket.priority],
      render: (ticket) => <Badge tone={tone_for_status(ticket.priority)}>{ticket.priority}</Badge>,
    },
    {
      key: 'status',
      header: 'Status',
      sort_value: (ticket) => ticket.status,
      render: (ticket) => (
        <Badge tone={tone_for_status(ticket.status)}>{TICKET_STATUS_LABELS[ticket.status]}</Badge>
      ),
    },
    {
      key: 'sla',
      header: 'SLA',
      sort_value: (ticket) => (ticket.is_sla_breached ? 0 : 1),
      render: (ticket) =>
        ticket.is_sla_breached ? (
          <Badge tone="danger" title={`First response due ${new Date(ticket.sla_due_at).toLocaleString()}`}>
            Breached
          </Badge>
        ) : (
          <Badge tone="success">On track</Badge>
        ),
    },
    {
      key: 'actions',
      header: 'Actions',
      align: 'right',
      render: (ticket) => (
        <div className="list-row-actions">
          {can('support_tickets.update') && (
            <Button size="sm" onClick={() => page.open_edit(ticket)}>
              Edit
            </Button>
          )}
          {can('support_tickets.delete') && (
            <Button size="sm" variant="danger" onClick={() => page.remove(ticket.id)}>
              Delete
            </Button>
          )}
        </div>
      ),
    },
  ];

  return (
    <ListPage
      title="Support Tickets"
      description="Your queue, with first-response SLA tracking."
      search={{
        value: page.search_input,
        on_change: page.set_search_input,
        placeholder: 'Search tickets by issue',
        result_count: tickets.total,
      }}
      actions={
        can('support_tickets.create') && (
          <Button variant="primary" icon={<Plus />} onClick={page.open_create}>
            New Ticket
          </Button>
        )
      }
    >
      <DataTable
        caption="Support tickets"
        columns={columns}
        rows={tickets.items}
        row_key={(ticket) => ticket.id}
        loading={tickets.loading}
        empty={
          <EmptyState
            icon={<LifeBuoy />}
            title={page.search_input ? 'No tickets match that search' : 'Queue is clear'}
            description={
              page.search_input
                ? 'Try different wording from the issue summary.'
                : 'New tickets will appear here as customers report problems.'
            }
          />
        }
      />

      <Pagination
        offset={tickets.offset}
        limit={tickets.limit}
        total={tickets.total}
        on_previous={tickets.previous_page}
        on_next={tickets.next_page}
      />

      {page.modal_open && (
        <SupportTicketModal
          ticket={page.editing}
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

export default Support;
