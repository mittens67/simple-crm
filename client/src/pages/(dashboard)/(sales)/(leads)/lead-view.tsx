import type { Lead } from '../../../../types/lead';
import { Badge, Button, Modal, tone_for_status } from '../../../../components/ui';
import './lead-view.scss';

interface LeadViewProps {
  lead: Lead;
  on_close: () => void;
}

const format_date = (iso?: string | null) =>
  iso ? new Date(iso).toLocaleString(undefined, { dateStyle: 'medium', timeStyle: 'short' }) : '—';

/**
 * Read-only view for leads in a terminal state (Archived or Converted), which
 * cannot be edited.
 */
const LeadView = ({ lead, on_close }: LeadViewProps) => (
  <Modal
    title="Lead details"
    on_close={on_close}
    footer={
      <Button variant="primary" onClick={on_close}>
        Close
      </Button>
    }
  >
    <dl className="lead-view">
      <div>
        <dt>Name</dt>
        <dd>{lead.name}</dd>
      </div>
      <div>
        <dt>Email</dt>
        <dd>{lead.email}</dd>
      </div>
      <div>
        <dt>Phone</dt>
        <dd>{lead.phone}</dd>
      </div>
      <div>
        <dt>Status</dt>
        <dd>
          <Badge tone={tone_for_status(lead.status)}>{lead.status}</Badge>
        </dd>
      </div>
      <div>
        <dt>Assigned rep</dt>
        <dd>{lead.assigned_rep?.name ?? '—'}</dd>
      </div>
      <div>
        <dt>Converted to</dt>
        <dd>{lead.customer?.name ?? '—'}</dd>
      </div>
      <div>
        <dt>Created</dt>
        <dd>{format_date(lead.created_at)}</dd>
      </div>
      <div>
        <dt>Last updated</dt>
        <dd>{format_date(lead.updated_at)}</dd>
      </div>

      {lead.sales_notes && (
        <div className="lead-view-wide">
          <dt>Sales notes</dt>
          <dd>{lead.sales_notes}</dd>
        </div>
      )}
      {lead.archive_notes && (
        <div className="lead-view-wide">
          <dt>Archive notes</dt>
          <dd>{lead.archive_notes}</dd>
        </div>
      )}
      {lead.ai_rationale && (
        <div className="lead-view-wide">
          <dt>AI assessment{lead.ai_score != null && ` (${lead.ai_score})`}</dt>
          <dd>{lead.ai_rationale}</dd>
        </div>
      )}
    </dl>
  </Modal>
);

export default LeadView;
