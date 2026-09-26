import { useState } from 'react';
import { useLazyQuery, useMutation, useQuery } from '@apollo/client';
import { Copy, Mail, Sparkles } from 'lucide-react';
import {
  AI_STATUS_QUERY,
  AI_SUMMARY_QUERY,
  DRAFT_EMAIL_MUTATION,
} from '../../lib/graphql-queries';
import { Button, Card, CardHeader, Modal, Textarea, useToast } from '../ui';
import type { ActivityTargetType } from '../activity/activity-timeline';
import './ai-panel.scss';

interface AiPanelProps {
  target_type: ActivityTargetType;
  target_id: string;
  /** Used in the drafted email's context, e.g. the lead's name. */
  label: string;
}

/**
 * On-demand summary and email drafting for a record.
 *
 * Both are explicit actions rather than something that runs on page load:
 * free-tier request ceilings are low, and summarising every record a user
 * happens to open would exhaust the quota for no benefit.
 */
const AiPanel = ({ target_type, target_id, label }: AiPanelProps) => {
  const toast = useToast();
  const [draft, set_draft] = useState<string | null>(null);
  const [instruction, set_instruction] = useState('');
  const [asking, set_asking] = useState(false);

  const { data: status_data } = useQuery(AI_STATUS_QUERY);
  const is_live = Boolean(status_data?.aiStatus?.is_live);

  const [load_summary, { data: summary_data, loading: summarising }] = useLazyQuery(
    AI_SUMMARY_QUERY,
    { fetchPolicy: 'network-only' }
  );
  const [draft_email, { loading: drafting }] = useMutation(DRAFT_EMAIL_MUTATION, {
    errorPolicy: 'all',
  });

  const summary = summary_data?.aiSummary as string | undefined;

  const run_summary = async () => {
    const result = await load_summary({ variables: { target_type, target_id } });
    if (result.error) toast.error(result.error.message);
  };

  const run_draft = async () => {
    try {
      const response = await draft_email({
        variables: { target_type, target_id, instruction: instruction || undefined },
      });
      if (response.errors?.length) throw new Error(response.errors[0].message);
      set_draft(response.data?.draftEmail ?? '');
      set_asking(false);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to draft email');
    }
  };

  const copy = async () => {
    if (!draft) return;
    try {
      await navigator.clipboard.writeText(draft);
      toast.success('Draft copied');
    } catch {
      // Clipboard access needs a secure context and permission.
      toast.error('Could not copy — select the text and copy manually');
    }
  };

  return (
    <Card as="section" className="ai-panel">
      <CardHeader title="AI assistant" />

      {!is_live && (
        <p className="ai-panel-note">
          Using the built-in demo model. Output is synthetic, but the validation and
          permission path is the same one a real model goes through.
        </p>
      )}

      <div className="ai-panel-actions">
        <Button size="sm" icon={<Sparkles />} loading={summarising} onClick={run_summary}>
          Summarise history
        </Button>
        <Button size="sm" icon={<Mail />} onClick={() => set_asking(true)}>
          Draft follow-up
        </Button>
      </div>

      {summary && <p className="ai-panel-summary">{summary}</p>}

      {asking && (
        <Modal
          title="Draft a follow-up email"
          on_close={() => set_asking(false)}
          footer={
            <>
              <Button onClick={() => set_asking(false)} disabled={drafting}>
                Cancel
              </Button>
              <Button variant="primary" loading={drafting} onClick={run_draft}>
                Draft
              </Button>
            </>
          }
        >
          <Textarea
            label="Anything specific to include?"
            rows={3}
            value={instruction}
            onChange={(event) => set_instruction(event.target.value)}
            hint={`Optional. The draft is based on the activity logged against ${label}.`}
          />
        </Modal>
      )}

      {draft && (
        <Modal
          title="Draft email"
          on_close={() => set_draft(null)}
          footer={
            <>
              <Button onClick={() => set_draft(null)}>Close</Button>
              <Button variant="primary" icon={<Copy />} onClick={copy}>
                Copy
              </Button>
            </>
          }
        >
          {/* Editable, because a generated draft is a starting point rather
              than something to send as-is. */}
          <Textarea
            label="Draft"
            rows={14}
            value={draft}
            onChange={(event) => set_draft(event.target.value)}
          />
        </Modal>
      )}
    </Card>
  );
};

export default AiPanel;
