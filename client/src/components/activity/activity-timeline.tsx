import { useState } from 'react';
import { useMutation, useQuery } from '@apollo/client';
import {
  CalendarClock,
  Check,
  CheckSquare,
  Mail,
  MessageSquare,
  Phone,
  Plus,
  RotateCcw,
  Trash2,
  Users,
} from 'lucide-react';
import type { ReactNode } from 'react';
import {
  ACTIVITIES_QUERY,
  CREATE_ACTIVITY_MUTATION,
  COMPLETE_ACTIVITY_MUTATION,
  REOPEN_ACTIVITY_MUTATION,
  DELETE_ACTIVITY_MUTATION,
} from '../../lib/graphql-queries';
import {
  Badge,
  Button,
  Card,
  CardHeader,
  EmptyState,
  Input,
  Modal,
  Select,
  Textarea,
  useToast,
} from '../ui';
import './activity-timeline.scss';

export type ActivityTargetType = 'Lead' | 'Customer' | 'Deal' | 'SupportTicket';

interface Activity {
  id: string;
  type: 'Call' | 'Email' | 'Meeting' | 'Note' | 'Task';
  subject: string;
  body?: string | null;
  due_at?: string | null;
  completed_at?: string | null;
  is_overdue: boolean;
  created_at: string;
  owner: { id: string; name: string };
}

const ICONS: Record<Activity['type'], ReactNode> = {
  Call: <Phone />,
  Email: <Mail />,
  Meeting: <Users />,
  Note: <MessageSquare />,
  Task: <CheckSquare />,
};

const ACTIVITY_TYPES: Activity['type'][] = ['Call', 'Email', 'Meeting', 'Note', 'Task'];

const relative = (iso: string) => {
  const days = Math.round((Date.now() - new Date(iso).getTime()) / 86_400_000);
  if (days === 0) return 'today';
  if (days === 1) return 'yesterday';
  if (days < 30) return `${days} days ago`;
  return new Date(iso).toLocaleDateString(undefined, { dateStyle: 'medium' });
};

interface ActivityTimelineProps {
  target_type: ActivityTargetType;
  target_id: string;
  can_write: boolean;
}

/**
 * The record's history.
 *
 * This is what replaces the single overwritable `sales_notes` string, which
 * lost its previous contents on every edit and carried no author or timestamp.
 * Tasks (an activity with a due date) appear here too, so planned work and
 * past interactions live on one thread.
 */
const ActivityTimeline = ({ target_type, target_id, can_write }: ActivityTimelineProps) => {
  const toast = useToast();
  const [composing, set_composing] = useState(false);
  const [form, set_form] = useState({ type: 'Note', subject: '', body: '', due_at: '' });
  const [errors, set_errors] = useState<{ subject?: string }>({});
  const [saving, set_saving] = useState(false);

  const variables = { target_type, target_id, limit: 50 };
  const { data, loading, refetch } = useQuery(ACTIVITIES_QUERY, { variables });

  const [create_activity] = useMutation(CREATE_ACTIVITY_MUTATION, { errorPolicy: 'all' });
  const [complete_activity] = useMutation(COMPLETE_ACTIVITY_MUTATION, { errorPolicy: 'all' });
  const [reopen_activity] = useMutation(REOPEN_ACTIVITY_MUTATION, { errorPolicy: 'all' });
  const [delete_activity] = useMutation(DELETE_ACTIVITY_MUTATION, { errorPolicy: 'all' });

  const activities = (data?.activities?.items ?? []) as Activity[];

  const run = async (work: () => Promise<{ errors?: readonly { message: string }[] }>, ok: string) => {
    try {
      const response = await work();
      if (response.errors?.length) throw new Error(response.errors[0].message);
      await refetch();
      toast.success(ok);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Something went wrong');
    }
  };

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!form.subject.trim()) {
      set_errors({ subject: 'A subject is required' });
      return;
    }
    set_errors({});
    set_saving(true);

    try {
      const response = await create_activity({
        variables: {
          input: {
            type: form.type,
            subject: form.subject,
            body: form.body || undefined,
            target_type,
            target_id,
            // Only tasks carry a due date.
            due_at: form.type === 'Task' && form.due_at ? new Date(form.due_at).toISOString() : undefined,
          },
        },
      });
      if (response.errors?.length) throw new Error(response.errors[0].message);

      await refetch();
      set_composing(false);
      set_form({ type: 'Note', subject: '', body: '', due_at: '' });
      toast.success('Activity logged');
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to log activity');
    } finally {
      set_saving(false);
    }
  };

  return (
    <Card as="section" className="timeline-card">
      <CardHeader
        title="Activity"
        action={
          can_write && (
            <Button size="sm" icon={<Plus />} onClick={() => set_composing(true)}>
              Log activity
            </Button>
          )
        }
      />

      {loading && activities.length === 0 && <p className="timeline-loading">Loading history…</p>}

      {!loading && activities.length === 0 && (
        <EmptyState
          icon={<MessageSquare />}
          title="No activity yet"
          description="Calls, emails, meetings, notes and tasks logged against this record appear here."
        />
      )}

      <ol className="timeline">
        {activities.map((activity) => (
          <li key={activity.id} className="timeline-item">
            <span className={`timeline-icon timeline-icon-${activity.type.toLowerCase()}`}>
              {ICONS[activity.type]}
            </span>

            <div className="timeline-content">
              <div className="timeline-head">
                <strong>{activity.subject}</strong>
                {activity.type === 'Task' && activity.completed_at && (
                  <Badge tone="success">Done</Badge>
                )}
                {activity.is_overdue && <Badge tone="danger">Overdue</Badge>}
                {activity.type === 'Task' && !activity.completed_at && !activity.is_overdue && (
                  <Badge tone="info">Open task</Badge>
                )}
              </div>

              {activity.body && <p className="timeline-body">{activity.body}</p>}

              <p className="timeline-meta">
                {activity.type} · {activity.owner.name} · {relative(activity.created_at)}
                {activity.due_at && (
                  <>
                    {' · '}
                    <CalendarClock aria-hidden="true" />
                    due {new Date(activity.due_at).toLocaleDateString(undefined, { dateStyle: 'medium' })}
                  </>
                )}
              </p>
            </div>

            {can_write && (
              <div className="timeline-actions">
                {activity.type === 'Task' &&
                  (activity.completed_at ? (
                    <Button
                      size="sm"
                      variant="ghost"
                      icon_only
                      aria-label={`Reopen ${activity.subject}`}
                      onClick={() =>
                        run(() => reopen_activity({ variables: { id: activity.id } }), 'Task reopened')
                      }
                    >
                      <RotateCcw />
                    </Button>
                  ) : (
                    <Button
                      size="sm"
                      variant="ghost"
                      icon_only
                      aria-label={`Complete ${activity.subject}`}
                      onClick={() =>
                        run(
                          () => complete_activity({ variables: { id: activity.id } }),
                          'Task completed'
                        )
                      }
                    >
                      <Check />
                    </Button>
                  ))}
                <Button
                  size="sm"
                  variant="ghost"
                  icon_only
                  aria-label={`Delete ${activity.subject}`}
                  onClick={() =>
                    run(() => delete_activity({ variables: { id: activity.id } }), 'Activity deleted')
                  }
                >
                  <Trash2 />
                </Button>
              </div>
            )}
          </li>
        ))}
      </ol>

      {composing && (
        <Modal
          title="Log activity"
          on_close={() => set_composing(false)}
          footer={
            <>
              <Button onClick={() => set_composing(false)} disabled={saving}>
                Cancel
              </Button>
              <Button variant="primary" type="submit" form="activity-form" loading={saving}>
                Log
              </Button>
            </>
          }
        >
          <form id="activity-form" onSubmit={submit} noValidate>
            <Select
              label="Type"
              value={form.type}
              onChange={(event) => set_form((prev) => ({ ...prev, type: event.target.value }))}
              options={ACTIVITY_TYPES.map((type) => ({ value: type, label: type }))}
            />
            <Input
              label="Subject"
              required
              value={form.subject}
              onChange={(event) => set_form((prev) => ({ ...prev, subject: event.target.value }))}
              error={errors.subject}
            />
            <Textarea
              label="Details"
              rows={4}
              value={form.body}
              onChange={(event) => set_form((prev) => ({ ...prev, body: event.target.value }))}
            />
            {form.type === 'Task' && (
              <Input
                label="Due date"
                type="date"
                value={form.due_at}
                onChange={(event) => set_form((prev) => ({ ...prev, due_at: event.target.value }))}
                hint="Tasks with a due date appear in your task list."
              />
            )}
          </form>
        </Modal>
      )}
    </Card>
  );
};

export default ActivityTimeline;
