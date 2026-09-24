import { Types } from 'mongoose';
import Customer from '../models/customer';
import User from '../models/user';
import { IDeal } from '../models/deal';
import { deal_repository } from '../repositories/deal';
import { ApolloContext } from '../graphql/context';
import { require_permission } from '../auth/authorize';
import { create_deal_schema, update_deal_schema } from '../schemas/deal';
import { Page } from '../core/base-repository';
import { scope_filter_for } from '../core/scoping';
import { assert_exists, assert_found, audit, parse_or_throw, pick_fields } from '../core/service-helpers';

const UPDATABLE_FIELDS = ['title', 'customer_id', 'owner_id', 'value', 'status', 'stage'] as const;

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

  async create(context: ApolloContext, input: unknown): Promise<IDeal> {
    const actor = require_permission(context, 'deals.create');
    const data = parse_or_throw(create_deal_schema, input);

    await assert_exists(Customer, data.customer_id, 'Customer');
    await assert_exists(User, data.owner_id, 'Deal owner');

    const deal = await deal_repository.create({
      title: data.title,
      customer_id: new Types.ObjectId(data.customer_id),
      owner_id: new Types.ObjectId(data.owner_id),
      value: data.value,
      status: data.status,
      stage: data.stage,
    });

    await audit(actor, 'Deal created', { deal_id: String(deal._id), value: data.value });
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

    const changes = pick_fields(data, UPDATABLE_FIELDS);
    const updated = assert_found(await deal_repository.update(id, changes), 'Deal');

    await audit(actor, 'Deal updated', {
      deal_id: String(updated._id),
      // Stage and status movement is the interesting part of a deal's history.
      ...(data.stage && data.stage !== existing.stage && {
        stage_from: existing.stage,
        stage_to: data.stage,
      }),
      ...(data.status && data.status !== existing.status && {
        status_from: existing.status,
        status_to: data.status,
      }),
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

export const deal_service = new DealService();
