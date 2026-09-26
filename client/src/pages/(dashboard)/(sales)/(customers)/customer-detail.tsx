import { useParams } from 'react-router-dom';
import { useQuery } from '@apollo/client';
import { useAuth } from '../../../../auth/auth-context';
import { CUSTOMER_QUERY } from '../../../../lib/graphql-queries';
import type { Customer } from '../../../../types/customer';
import { EmptyState } from '../../../../components/ui';
import LoadingSpinner from '../../../../components/ui/loading-spinner';
import RecordPage from '../../../../components/layout/record-page';
import ActivityTimeline from '../../../../components/activity/activity-timeline';
import AiPanel from '../../../../components/ai/ai-panel';

const format_date = (iso?: string | null) =>
  iso ? new Date(iso).toLocaleDateString(undefined, { dateStyle: 'medium' }) : '—';

const CustomerDetail = () => {
  const { id = '' } = useParams();
  const { can } = useAuth();
  const { data, loading, error } = useQuery(CUSTOMER_QUERY, { variables: { id } });

  if (loading && !data) return <LoadingSpinner />;

  const customer = data?.customer as Customer | undefined;

  if (error || !customer) {
    return (
      <RecordPage title="Customer not found" back_to="/customers" back_label="Back to customers" facts={[]}>
        <EmptyState
          title="Customer not found"
          description={error?.message ?? 'It may belong to another rep.'}
        />
      </RecordPage>
    );
  }

  return (
    <RecordPage
      title={customer.name}
      description={customer.email}
      back_to="/customers"
      back_label="Back to customers"
      facts={[
        { label: 'Phone', value: customer.phone },
        { label: 'Assigned rep', value: customer.assigned_rep?.name ?? 'Unassigned' },
        { label: 'Customer since', value: format_date(customer.created_at) },
        { label: 'Last updated', value: format_date(customer.updated_at) },
      ]}
      aside={<AiPanel target_type="Customer" target_id={customer.id} label={customer.name} />}
    >
      <ActivityTimeline
        target_type="Customer"
        target_id={customer.id}
        can_write={can('customers.update')}
      />
    </RecordPage>
  );
};

export default CustomerDetail;
