import { useParams } from 'react-router-dom';
import { useQuery } from '@apollo/client';
import { useAuth } from '../../../../auth/auth-context';
import { DEAL_QUERY } from '../../../../lib/graphql-queries';
import type { Deal } from '../../../../types/deal';
import { LOST_REASON_LABELS } from '../../../../types/deal';
import { Badge, EmptyState, tone_for_status } from '../../../../components/ui';
import LoadingSpinner from '../../../../components/ui/loading-spinner';
import RecordPage from '../../../../components/layout/record-page';
import ActivityTimeline from '../../../../components/activity/activity-timeline';
import AiPanel from '../../../../components/ai/ai-panel';

const money = (value: number) => `$${(value ?? 0).toLocaleString()}`;

const format_date = (iso?: string | null) =>
  iso ? new Date(iso).toLocaleDateString(undefined, { dateStyle: 'medium' }) : '—';

const DealDetail = () => {
  const { id = '' } = useParams();
  const { can } = useAuth();
  const { data, loading, error } = useQuery(DEAL_QUERY, { variables: { id } });

  if (loading && !data) return <LoadingSpinner />;

  const deal = data?.deal as Deal | undefined;

  if (error || !deal) {
    return (
      <RecordPage title="Deal not found" back_to="/deals" back_label="Back to deals" facts={[]}>
        <EmptyState
          title="Deal not found"
          description={error?.message ?? 'It may belong to another owner.'}
        />
      </RecordPage>
    );
  }

  return (
    <RecordPage
      title={deal.title}
      description={deal.customer?.name}
      back_to="/deals"
      back_label="Back to deals"
      facts={[
        { label: 'Value', value: money(deal.value) },
        {
          // Value scaled by the current stage's win probability.
          label: 'Weighted value',
          value: `${money(deal.weighted_value)}${deal.stage ? ` (${deal.stage.probability}%)` : ''}`,
        },
        {
          label: 'Status',
          value: <Badge tone={tone_for_status(deal.status)}>{deal.status}</Badge>,
        },
        { label: 'Stage', value: deal.stage?.name ?? '—' },
        {
          // Time in stage is what makes a stalled deal visible.
          label: 'Days in stage',
          value:
            deal.days_in_stage > 30 ? (
              <Badge tone="warning">{deal.days_in_stage} days — stalled</Badge>
            ) : (
              `${deal.days_in_stage}`
            ),
        },
        { label: 'Owner', value: deal.owner?.name ?? 'Unassigned' },
        { label: 'Expected close', value: format_date(deal.expected_close_date) },
        ...(deal.closed_at ? [{ label: 'Closed', value: format_date(deal.closed_at) }] : []),
        ...(deal.lost_reason
          ? [{ label: 'Lost reason', value: LOST_REASON_LABELS[deal.lost_reason] }]
          : []),
      ]}
      aside={<AiPanel target_type="Deal" target_id={deal.id} label={deal.title} />}
    >
      <ActivityTimeline target_type="Deal" target_id={deal.id} can_write={can('deals.update')} />
    </RecordPage>
  );
};

export default DealDetail;
