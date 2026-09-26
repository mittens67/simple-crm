import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Plus, Sparkles, UserPlus } from 'lucide-react';
import { useAuth } from '../../../../auth/auth-context';
import { useLeads, useUsers } from '../../../../hooks';
import { useResourcePage } from '../../../../hooks/use-resource-page';
import { useLeadScoring } from '../../../../hooks/use-lead-scoring';
import type { Lead, LeadInput } from '../../../../types/lead';
import {
  Badge,
  Button,
  DataTable,
  EmptyState,
  Pagination,
  tone_for_status,
  type Column,
} from '../../../../components/ui';
import ListPage from '../../../../components/layout/list-page';
import { LeadScoreBadge, LeadInsight } from '../../../../components/ai/lead-score';
import LeadModal from './lead-modal';
import LeadView from './lead-view';

const Leads = () => {
  const { can } = useAuth();
  const leads = useLeads();
  const { items: users } = useUsers();
  const scoring = useLeadScoring();
  const [viewing, set_viewing] = useState<Lead | null>(null);
  const [insight_for, set_insight_for] = useState<Lead | null>(null);

  const page = useResourcePage<Lead, LeadInput>({ crud: leads, noun: 'lead' });

  const is_terminal = (lead: Lead) => lead.status === 'Archived' || lead.status === 'Converted';

  const show_insight = async (lead: Lead) => {
    // Already scored: show what we have. Unscored: score it, then show.
    const scored = lead.ai_score == null ? await scoring.score_lead(lead.id) : lead;
    set_insight_for((scored as Lead) ?? lead);
  };

  const columns: Column<Lead>[] = [
    {
      key: 'name',
      header: 'Name',
      sort_value: (lead) => lead.name,
      render: (lead) => (
        <Link to={`/leads/${lead.id}`} className="list-cell-primary">
          {lead.name}
        </Link>
      ),
    },
    {
      key: 'email',
      header: 'Email',
      sort_value: (lead) => lead.email,
      hide_on_mobile: true,
      render: (lead) => lead.email,
    },
    {
      key: 'phone',
      header: 'Phone',
      hide_on_mobile: true,
      render: (lead) => lead.phone,
    },
    {
      key: 'score',
      header: 'Score',
      // Unscored leads sort last rather than as zero.
      sort_value: (lead) => lead.ai_score ?? null,
      render: (lead) => (
        <LeadScoreBadge
          lead={lead}
          scoring={scoring.is_scoring(lead.id)}
          on_score={can('leads.update') ? () => show_insight(lead) : undefined}
        />
      ),
    },
    {
      key: 'status',
      header: 'Status',
      sort_value: (lead) => lead.status,
      render: (lead) => <Badge tone={tone_for_status(lead.status)}>{lead.status}</Badge>,
    },
    {
      key: 'rep',
      header: 'Assigned Rep',
      sort_value: (lead) => lead.assigned_rep?.name ?? null,
      hide_on_mobile: true,
      render: (lead) => lead.assigned_rep?.name ?? <span className="muted">Unassigned</span>,
    },
    {
      key: 'customer',
      header: 'Converted To',
      hide_on_mobile: true,
      render: (lead) =>
        lead.customer ? (
          <Link to={`/customers/${lead.customer.id}`}>{lead.customer.name}</Link>
        ) : (
          <span className="muted">—</span>
        ),
    },
    {
      key: 'actions',
      header: 'Actions',
      align: 'right',
      render: (lead) => (
        <div className="list-row-actions">
          {can('leads.update') &&
            (is_terminal(lead) ? (
              <Button size="sm" onClick={() => set_viewing(lead)}>
                View
              </Button>
            ) : (
              <Button size="sm" onClick={() => page.open_edit(lead)}>
                Edit
              </Button>
            ))}
          {can('leads.delete') && !is_terminal(lead) && (
            <Button size="sm" variant="danger" onClick={() => page.remove(lead.id)}>
              Archive
            </Button>
          )}
        </div>
      ),
    },
  ];

  return (
    <ListPage
      title="Leads"
      description="Inbound enquiries, from first contact through to conversion."
      search={{
        value: page.search_input,
        on_change: page.set_search_input,
        placeholder: 'Search leads by name, email, or phone',
        result_count: leads.total,
      }}
      actions={
        <>
          {can('leads.update') && (
            <Button
              icon={<Sparkles />}
              loading={scoring.bulk_loading}
              onClick={() => scoring.score_batch(5)}
              title="Score the next few unscored leads"
            >
              Score leads
            </Button>
          )}
          {can('leads.create') && (
            <Button variant="primary" icon={<Plus />} onClick={page.open_create}>
              New Lead
            </Button>
          )}
        </>
      }
    >
      {insight_for && <LeadInsight lead={insight_for} is_live={scoring.is_live} />}

      <DataTable
        caption="Leads"
        columns={columns}
        rows={leads.items}
        row_key={(lead) => lead.id}
        loading={leads.loading}
        empty={
          <EmptyState
            icon={<UserPlus />}
            title={page.search_input ? 'No leads match that search' : 'No leads yet'}
            description={
              page.search_input
                ? 'Try a different name, email or phone number.'
                : 'Leads appear here as enquiries come in.'
            }
            action={
              !page.search_input && can('leads.create') ? (
                <Button variant="primary" icon={<Plus />} onClick={page.open_create}>
                  New Lead
                </Button>
              ) : undefined
            }
          />
        }
      />

      <Pagination
        offset={leads.offset}
        limit={leads.limit}
        total={leads.total}
        on_previous={leads.previous_page}
        on_next={leads.next_page}
      />

      {viewing && <LeadView lead={viewing} on_close={() => set_viewing(null)} />}

      {page.modal_open && (
        <LeadModal
          lead={page.editing}
          users={users}
          saving={page.saving}
          on_save={page.submit}
          on_close={page.close_modal}
        />
      )}
    </ListPage>
  );
};

export default Leads;
