import { useMemo, useState } from 'react';
import { useMutation, useQuery } from '@apollo/client';
import { Link } from 'react-router-dom';
import { ChevronLeft, ChevronRight, KanbanSquare } from 'lucide-react';
import { useAuth } from '../../../../auth/auth-context';
import {
  Badge,
  Button,
  EmptyState,
  Select,
  useToast,
  tone_for_status,
} from '../../../../components/ui';
import { PageHeader } from '../../../../components/ui';
import LoadingSpinner from '../../../../components/ui/loading-spinner';
import {
  PIPELINE_BOARD_QUERY,
  PIPELINES_QUERY,
  MOVE_DEAL_TO_STAGE_MUTATION,
} from '../../../../lib/graphql-queries';
import type { BoardColumn, Deal, Pipeline } from '../../../../types/deal';
import './pipeline.scss';

const money = (value: number) =>
  value >= 1000 ? `$${Math.round(value / 1000).toLocaleString()}k` : `$${Math.round(value)}`;

/**
 * The pipeline board.
 *
 * Deals were previously a flat table with a free-string `stage` field that had
 * no UI input at all, so there was no way to see or change where a deal sat.
 *
 * Stage changes go through `moveDealToStage` rather than a field edit, so the
 * server stamps `stage_entered_at` and applies the stage's own outcome to the
 * deal's status — which is what keeps the board and the status column from
 * disagreeing.
 *
 * Movement is by explicit control rather than drag-and-drop: the data model is
 * what makes the board work, and keyboard-accessible buttons get there without
 * a drag library. Drag is a later polish step, not a prerequisite.
 */
const PipelineBoard = () => {
  const { can } = useAuth();
  const toast = useToast();
  const [pipeline_id, set_pipeline_id] = useState<string>('');
  const [moving_id, set_moving_id] = useState<string | null>(null);

  const { data: pipelines_data } = useQuery(PIPELINES_QUERY);
  const pipelines = useMemo(() => (pipelines_data?.pipelines ?? []) as Pipeline[], [pipelines_data]);

  const { data, loading, refetch } = useQuery(PIPELINE_BOARD_QUERY, {
    variables: { pipeline_id: pipeline_id || undefined },
  });

  const [move_deal] = useMutation(MOVE_DEAL_TO_STAGE_MUTATION, { errorPolicy: 'all' });

  const columns = (data?.pipelineBoard ?? []) as BoardColumn[];

  const move = async (deal: Deal, stage_id: string) => {
    set_moving_id(deal.id);
    try {
      const response = await move_deal({ variables: { id: deal.id, stage_id } });
      if (response.errors?.length) throw new Error(response.errors[0].message);
      // A move can change which column a deal belongs to and close it, so the
      // whole board is refetched rather than patched.
      await refetch();
      toast.success(`${deal.title} moved`);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to move deal');
    } finally {
      set_moving_id(null);
    }
  };

  const board_total = columns.reduce((sum, column) => sum + column.total_value, 0);
  const board_count = columns.reduce((sum, column) => sum + column.deal_count, 0);

  if (loading && columns.length === 0) return <LoadingSpinner />;

  return (
    <div className="pipeline">
      <PageHeader
        title="Pipeline"
        description={`${board_count} open deal${board_count === 1 ? '' : 's'} worth ${money(board_total)}`}
        actions={
          pipelines.length > 1 && (
            <Select
              label="Pipeline"
              value={pipeline_id}
              onChange={(event) => set_pipeline_id(event.target.value)}
              placeholder="Default pipeline"
              options={pipelines.map((pipeline) => ({ value: pipeline.id, label: pipeline.name }))}
            />
          )
        }
      />

      {columns.length === 0 ? (
        <EmptyState
          icon={<KanbanSquare />}
          title="No pipeline configured"
          description="A pipeline with at least one won and one lost stage is needed before deals can move through it."
        />
      ) : (
        <div className="pipeline-board">
          {columns.map((column, index) => {
            const previous = columns[index - 1];
            const next = columns[index + 1];

            return (
              <section key={column.stage.id} className="pipeline-column">
                <header>
                  <h2>{column.stage.name}</h2>
                  <p>
                    {column.deal_count} · {money(column.total_value)}
                  </p>
                  <span className="pipeline-probability">{column.stage.probability}%</span>
                </header>

                <div className="pipeline-cards">
                  {column.deals.length === 0 && <p className="pipeline-column-empty">Empty</p>}

                  {column.deals.map((deal) => (
                    <article
                      key={deal.id}
                      className={`pipeline-card${moving_id === deal.id ? ' pipeline-card-moving' : ''}`}
                    >
                      <Link to={`/deals/${deal.id}`} className="pipeline-card-title">
                        {deal.title}
                      </Link>
                      <p className="pipeline-card-customer">{deal.customer?.name ?? '—'}</p>

                      <div className="pipeline-card-meta">
                        <strong>{money(deal.value)}</strong>
                        {/* A deal sitting in one stage for a month is the
                            signal worth surfacing on a board. */}
                        {deal.days_in_stage > 30 && (
                          <Badge tone="warning" title={`${deal.days_in_stage} days in this stage`}>
                            Stalled
                          </Badge>
                        )}
                        {deal.status === 'Pending' && (
                          <Badge tone={tone_for_status(deal.status)}>{deal.status}</Badge>
                        )}
                      </div>

                      <p className="pipeline-card-owner">
                        {deal.owner?.name ?? 'Unassigned'} · {deal.days_in_stage}d
                      </p>

                      {can('deals.update') && (
                        <div className="pipeline-card-actions">
                          <Button
                            size="sm"
                            variant="ghost"
                            icon_only
                            aria-label={
                              previous ? `Move ${deal.title} to ${previous.stage.name}` : 'No earlier stage'
                            }
                            disabled={!previous || moving_id === deal.id}
                            onClick={() => previous && move(deal, previous.stage.id)}
                          >
                            <ChevronLeft />
                          </Button>
                          <Button
                            size="sm"
                            variant="ghost"
                            icon_only
                            aria-label={
                              next ? `Move ${deal.title} to ${next.stage.name}` : 'No later stage'
                            }
                            disabled={!next || moving_id === deal.id}
                            onClick={() => next && move(deal, next.stage.id)}
                          >
                            <ChevronRight />
                          </Button>
                        </div>
                      )}
                    </article>
                  ))}
                </div>
              </section>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default PipelineBoard;
