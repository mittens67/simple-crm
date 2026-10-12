import { useState } from 'react';
import { useMutation, useQuery } from '@apollo/client';
import { CheckSquare, Check, RotateCcw } from 'lucide-react';
import {
  TASKS_QUERY,
  COMPLETE_ACTIVITY_MUTATION,
  REOPEN_ACTIVITY_MUTATION,
} from '../../../lib/graphql-queries';
import {
  Badge,
  Button,
  Checkbox,
  DataTable,
  EmptyState,
  Pagination,
  useToast,
  type Column,
} from '../../../components/ui';
import ListPage from '../../../components/layout/list-page';
import './tasks.scss';

interface Task {
  id: string;
  subject: string;
  body?: string | null;
  due_at?: string | null;
  completed_at?: string | null;
  is_overdue: boolean;
  target_type: string;
  target_id: string;
  created_at: string;
  owner: { id: string; name: string };
}

const PAGE_SIZE = 20;

const ROUTE_BY_TARGET: Record<string, string> = {
  Lead: '/leads',
  Customer: '/customers',
  Deal: '/deals',
};

const format_due = (iso?: string | null) =>
  iso ? new Date(iso).toLocaleDateString(undefined, { dateStyle: 'medium' }) : '—';

/**
 * The caller's own task list.
 *
 * Tasks are activities with a due date, so this is a filtered view of the same
 * entity that powers the record timelines rather than a separate concept.
 */
const Tasks = () => {
  const toast = useToast();
  const [include_completed, set_include_completed] = useState(false);
  const [offset, set_offset] = useState(0);

  const { data, loading, refetch } = useQuery(TASKS_QUERY, {
    variables: { include_completed, limit: PAGE_SIZE, offset },
    notifyOnNetworkStatusChange: true,
  });

  const [complete_activity] = useMutation(COMPLETE_ACTIVITY_MUTATION, { errorPolicy: 'all' });
  const [reopen_activity] = useMutation(REOPEN_ACTIVITY_MUTATION, { errorPolicy: 'all' });

  const tasks = (data?.tasks?.items ?? []) as Task[];
  const total = data?.tasks?.total ?? 0;

  const toggle = async (task: Task) => {
    const done = Boolean(task.completed_at);
    try {
      const mutation = done ? reopen_activity : complete_activity;
      const response = await mutation({ variables: { id: task.id } });
      if (response.errors?.length) throw new Error(response.errors[0].message);
      await refetch();
      toast.success(done ? 'Task reopened' : 'Task completed');
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to update task');
    }
  };

  const columns: Column<Task>[] = [
    {
      key: 'subject',
      header: 'Task',
      sort_value: (task) => task.subject,
      render: (task) => (
        <div>
          <span className="list-cell-primary">{task.subject}</span>
          {task.body && <p className="tasks-body">{task.body}</p>}
        </div>
      ),
    },
    {
      key: 'due',
      header: 'Due',
      // Undated tasks sort last rather than first.
      sort_value: (task) => (task.due_at ? new Date(task.due_at).getTime() : null),
      render: (task) =>
        task.is_overdue ? (
          <Badge tone="danger">{format_due(task.due_at)}</Badge>
        ) : (
          format_due(task.due_at)
        ),
    },
    {
      key: 'related',
      header: 'Related to',
      hide_on_mobile: true,
      render: (task) => {
        const route = ROUTE_BY_TARGET[task.target_type];
        return route ? (
          <a href={`${route}/${task.target_id}`}>{task.target_type}</a>
        ) : (
          task.target_type
        );
      },
    },
    {
      key: 'status',
      header: 'Status',
      sort_value: (task) => (task.completed_at ? 1 : 0),
      render: (task) =>
        task.completed_at ? <Badge tone="success">Done</Badge> : <Badge tone="info">Open</Badge>,
    },
    {
      key: 'actions',
      header: 'Actions',
      align: 'right',
      render: (task) => (
        <div className="list-row-actions">
          <Button
            size="sm"
            icon={task.completed_at ? <RotateCcw /> : <Check />}
            onClick={() => toggle(task)}
          >
            {task.completed_at ? 'Reopen' : 'Complete'}
          </Button>
        </div>
      ),
    },
  ];

  return (
    <ListPage
      title="My Tasks"
      description="Follow-ups you have scheduled against leads, customers and deals."
      filters={
        <Checkbox
          label="Show completed"
          checked={include_completed}
          onChange={(event) => {
            set_include_completed(event.target.checked);
            set_offset(0);
          }}
        />
      }
    >
      <DataTable
        caption="Tasks"
        columns={columns}
        rows={tasks}
        row_key={(task) => task.id}
        loading={loading}
        empty={
          <EmptyState
            icon={<CheckSquare />}
            title={include_completed ? 'No tasks' : 'Nothing outstanding'}
            description="Log a Task activity against a record to schedule a follow-up."
          />
        }
      />

      <Pagination
        offset={offset}
        limit={PAGE_SIZE}
        total={total}
        on_previous={() => set_offset((current) => Math.max(0, current - PAGE_SIZE))}
        on_next={() => set_offset((current) => current + PAGE_SIZE)}
      />
    </ListPage>
  );
};

export default Tasks;
