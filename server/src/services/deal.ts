import { Types } from 'mongoose';
import Customer from '../models/customer';
import User from '../models/user';
import Deal, { IDeal } from '../models/deal';
import { IPipeline, IStage } from '../models/pipeline';
import { deal_repository } from '../repositories/deal';
import { pipeline_repository } from '../repositories/pipeline';
import { pipeline_service } from './pipeline';
import { ApolloContext } from '../graphql/context';
import { require_permission } from '../auth/authorize';
import { create_deal_schema, update_deal_schema } from '../schemas/deal';
import { Page } from '../core/base-repository';
import { scope_filter_for } from '../core/scoping';
import { assert_exists, assert_found, audit, parse_or_throw, pick_fields } from '../core/service-helpers';
import { ValidationError } from '../utils/errors';

const UPDATABLE_FIELDS = [
  'title',
  'customer_id',
  'owner_id',
  'value',
  'status',
  'lost_reason',
] as const;

export interface BoardColumn {
  stage: IStage;
  deals: IDeal[];
  total_value: number;
  deal_count: number;
}

export class DealService {
  private scope(context: ApolloContext, action: 'read' | 'update' | 'delete' = 'read') {
    return scope_filter_for(context, 'deals', 'owner_id', action);
  }

  async list(
    context: ApolloContext,
    args: { search?: string; limit?: number; offset?: number }
  ): Promise<Page<IDeal>> {
    require_permission(context, 'deals.read');
    return deal_repository.find_page({ ...args, filter: this.scope(context) });
  }

  async get(context: ApolloContext, id: string): Promise<IDeal> {
    require_permission(context, 'deals.read');
    return assert_found(await deal_repository.find_by_id(id, this.scope(context)), 'Deal');
  }

  async list_by_owner(context: ApolloContext, owner_id: string): Promise<IDeal[]> {
    require_permission(context, 'deals.read');
    return deal_repository.find_all({
      $and: [{ owner_id: new Types.ObjectId(owner_id) }, this.scope(context)],
    });
  }

  /**
   * Open deals grouped into their stages, which is what a pipeline board
   * renders. Closed deals are excluded — a board shows live work.
   */
  async board(context: ApolloContext, pipeline_id?: string | null): Promise<BoardColumn[]> {
    require_permission(context, 'deals.read');

    const pipeline = pipeline_id
      ? await pipeline_service.get(context, pipeline_id)
      : await pipeline_service.require_default();

    const deals = await deal_repository.find_all({
      $and: [
        { pipeline_id: pipeline._id, status: { $in: ['Open', 'Pending'] } },
        this.scope(context),
      ],
    });

    const by_stage = new Map<string, IDeal[]>();
    for (const deal of deals) {
      const key = String(deal.stage_id);
      const bucket = by_stage.get(key);
      if (bucket) bucket.push(deal);
      else by_stage.set(key, [deal]);
    }

    return [...pipeline.stages]
      .sort((a, b) => a.display_order - b.display_order)
      .map((stage) => {
        const stage_deals = by_stage.get(String(stage._id)) ?? [];
        return {
          stage,
          deals: stage_deals,
          deal_count: stage_deals.length,
          total_value: stage_deals.reduce((sum, deal) => sum + deal.value, 0),
        };
      });
  }

  async create(context: ApolloContext, input: unknown): Promise<IDeal> {
    const actor = require_permission(context, 'deals.create');
    const data = parse_or_throw(create_deal_schema, input);

    await assert_exists(Customer, data.customer_id, 'Customer');
    await assert_exists(User, data.owner_id, 'Deal owner');

    const pipeline = data.pipeline_id
      ? assert_found(await pipeline_repository.find_by_id(data.pipeline_id), 'Pipeline')
      : await pipeline_service.require_default();

    const stage = pipeline_service.resolve_stage(pipeline, data.stage_id);

    const deal = await deal_repository.create({
      title: data.title,
      customer_id: new Types.ObjectId(data.customer_id),
      owner_id: new Types.ObjectId(data.owner_id),
      value: data.value,
      status: data.status,
      pipeline_id: pipeline._id as Types.ObjectId,
      stage_id: stage._id,
      stage_entered_at: new Date(),
      ...(data.expected_close_date && { expected_close_date: new Date(data.expected_close_date) }),
    });

    await audit(actor, 'Deal created', {
      deal_id: String(deal._id),
      value: data.value,
      stage: stage.name,
    });
    return deal;
  }

  async update(context: ApolloContext, id: string, input: unknown): Promise<IDeal> {
    const actor = require_permission(context, 'deals.update');
    const data = parse_or_throw(update_deal_schema, input);

    const existing = assert_found(
      await deal_repository.find_by_id(id, this.scope(context, 'update')),
      'Deal'
    );

    await assert_exists(Customer, data.customer_id, 'Customer');
    await assert_exists(User, data.owner_id, 'Deal owner');

    // A lost deal without a reason makes win/loss analysis useless, so the
    // reason is required at the point the deal is marked lost.
    if (data.status === 'Lost' && !data.lost_reason && !existing.lost_reason) {
      throw new ValidationError('A lost reason is required when marking a deal as lost');
    }

    const changes = pick_fields(data, UPDATABLE_FIELDS) as Record<string, unknown>;

    if (data.expected_close_date) {
      changes.expected_close_date = new Date(data.expected_close_date);
    }

    // Closing stamps closed_at once; reopening clears it.
    const is_closing = (data.status === 'Won' || data.status === 'Lost') && existing.status !== data.status;
    const is_reopening =
      data.status && ['Open', 'Pending'].includes(data.status) &&
      ['Won', 'Lost'].includes(existing.status);

    if (is_closing) changes.closed_at = new Date();
    if (is_reopening) {
      changes.closed_at = null;
      changes.lost_reason = null;
    }

    const updated = assert_found(await deal_repository.update(id, changes), 'Deal');

    await audit(actor, 'Deal updated', {
      deal_id: String(updated._id),
      ...(data.status && data.status !== existing.status && {
        status_from: existing.status,
        status_to: data.status,
      }),
    });
    return updated;
  }

  /**
   * Moving a stage is a distinct operation, not a field edit: it stamps
   * stage_entered_at, which is what makes time-in-stage and stage-conversion
   * reporting possible, and applies the stage's own outcome to the deal.
   */
  async move_to_stage(context: ApolloContext, id: string, stage_id: string): Promise<IDeal> {
    const actor = require_permission(context, 'deals.update');

    const deal = assert_found(
      await deal_repository.find_by_id(id, this.scope(context, 'update')),
      'Deal'
    );
    const pipeline = assert_found(
      await pipeline_repository.find_by_id(String(deal.pipeline_id)),
      'Pipeline'
    );
    const stage = pipeline_service.resolve_stage(pipeline, stage_id);

    if (String(deal.stage_id) === String(stage._id)) {
      return deal;
    }

    const previous = pipeline.stages.id(deal.stage_id);
    const changes: Record<string, unknown> = {
      stage_id: stage._id,
      stage_entered_at: new Date(),
    };

    // A terminal stage closes the deal, so the board and the status cannot
    // drift apart.
    if (stage.outcome === 'won') {
      changes.status = 'Won';
      changes.closed_at = new Date();
      changes.lost_reason = null;
    } else if (stage.outcome === 'lost') {
      changes.status = 'Lost';
      changes.closed_at = new Date();
      changes.lost_reason = deal.lost_reason ?? 'Other';
    } else if (deal.closed_at) {
      changes.status = 'Open';
      changes.closed_at = null;
      changes.lost_reason = null;
    }

    const updated = assert_found(await deal_repository.update(id, changes), 'Deal');

    await audit(actor, 'Deal stage changed', {
      deal_id: String(updated._id),
      stage_from: previous?.name ?? null,
      stage_to: stage.name,
      days_in_previous_stage: days_between(deal.stage_entered_at, new Date()),
    });
    return updated;
  }

  async remove(context: ApolloContext, id: string): Promise<boolean> {
    const actor = require_permission(context, 'deals.delete');

    assert_found(await deal_repository.find_by_id(id, this.scope(context, 'delete')), 'Deal');
    const deleted = await deal_repository.delete(id);

    await audit(actor, 'Deal deleted', { deal_id: id });
    return deleted;
  }
}

export const days_between = (from: Date, to: Date): number =>
  Math.max(0, Math.floor((to.getTime() - from.getTime()) / (1000 * 60 * 60 * 24)));

/** value scaled by the probability of the stage the deal currently sits in. */
export const weighted_value = (deal: IDeal, pipeline: IPipeline | null): number => {
  const stage = pipeline?.stages.id(deal.stage_id);
  if (!stage) return 0;
  return (deal.value * stage.probability) / 100;
};

export const deal_service = new DealService();
export { Deal };
