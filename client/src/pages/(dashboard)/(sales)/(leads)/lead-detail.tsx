import { useParams } from 'react-router-dom';
import { useQuery } from '@apollo/client';
import { useAuth } from '../../../../auth/auth-context';
import { LEAD_QUERY } from '../../../../lib/graphql-queries';
import type { Lead } from '../../../../types/lead';
import { Badge, EmptyState, tone_for_status } from '../../../../components/ui';
import LoadingSpinner from '../../../../components/ui/loading-spinner';
import RecordPage from '../../../../components/layout/record-page';
import ActivityTimeline from '../../../../components/activity/activity-timeline';
import AiPanel from '../../../../components/ai/ai-panel';
import { LeadInsight } from '../../../../components/ai/lead-score';

const format_date = (iso?: string | null) =>
  iso ? new Date(iso).toLocaleDateString(undefined, { dateStyle: 'medium' }) : '—';

const LeadDetail = () => {
  const { id = '' } = useParams();
  const { can } = useAuth();
  const { data, loading, error } = useQuery(LEAD_QUERY, { variables: { id } });

  if (loading && !data) return <LoadingSpinner />;

  const lead = data?.lead as Lead | undefined;

  if (error || !lead) {
    return (
      <RecordPage
        title="Lead not found"
        back_to="/leads"
        back_label="Back to leads"
        facts={[]}
      >
        <EmptyState
          title="Lead not found"
          description={
            error?.message ??
            'It may have been archived, or it belongs to another rep.'
          }
        />
      </RecordPage>
    );
  }

  return (
    <RecordPage
      title={lead.name}
      description={lead.email}
      back_to="/leads"
      back_label="Back to leads"
      facts={[
        {
          label: 'Status',
          value: <Badge tone={tone_for_status(lead.status)}>{lead.status}</Badge>,
        },
        { label: 'Phone', value: lead.phone },
        { label: 'Assigned rep', value: lead.assigned_rep?.name ?? 'Unassigned' },
        { label: 'Converted to', value: lead.customer?.name ?? '—' },
        { label: 'Created', value: format_date(lead.created_at) },
        { label: 'Last updated', value: format_date(lead.updated_at) },
        ...(lead.sales_notes ? [{ label: 'Sales notes', value: lead.sales_notes }] : []),
      ]}
      aside={can('leads.read') ? <AiPanel target_type="Lead" target_id={lead.id} label={lead.name} /> : undefined}
    >
      {/* The cached score, if the lead has been assessed. */}
      {lead.ai_score != null && <LeadInsight lead={lead} is_live={lead.ai_provider !== 'mock'} />}

      <ActivityTimeline
        target_type="Lead"
        target_id={lead.id}
        can_write={can('leads.update')}
      />
    </RecordPage>
  );
};

export default LeadDetail;
