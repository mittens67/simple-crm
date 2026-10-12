import { describe, it, expect, beforeAll, beforeEach } from 'vitest';
import { Types } from 'mongoose';
import { deal_service } from '../../services/deal';
import Deal from '../../models/deal';
import Pipeline, { IPipeline } from '../../models/pipeline';
import Customer from '../../models/customer';
import User from '../../models/user';
import Role from '../../models/role';
import AuditLog from '../../models/audit-log';
import type { IUser } from '../../models/user';
import type { IRole } from '../../models/role';
import type { ICustomer } from '../../models/customer';
import {
  ValidationError,
  NotFoundError,
  ForbiddenError,
  BadUserInputError,
} from '../../utils/errors';
import { mock_context, mock_context_with } from '../helpers/context';
import {
  create_test_pipeline,
  first_open_stage,
  stage_named,
  won_stage,
  lost_stage,
} from '../helpers/pipeline';

let owner: IUser;
let other_owner: IUser;
let manager: IUser;
let sales_role: IRole;
let manager_role: IRole;
let customer: ICustomer;
let pipeline: IPipeline;

beforeAll(async () => {
  sales_role = await Role.create({
    name: 'DealSales',
    permissions: {
      'deals.read': true,
      'deals.create': true,
      'deals.update': true,
      'deals.delete': true,
    },
  });

  manager_role = await Role.create({
    name: 'DealManager',
    permissions: { 'deals.*': true },
  });

  owner = await User.create({
    name: 'Deal Owner',
    email: 'dealowner@example.com',
    password: 'password123',
    role_ids: [sales_role._id],
  });

  other_owner = await User.create({
    name: 'Other Owner',
    email: 'otherowner@example.com',
    password: 'password123',
    role_ids: [sales_role._id],
  });

  manager = await User.create({
    name: 'Deal Manager',
    email: 'dealmanager@example.com',
    password: 'password123',
    role_ids: [manager_role._id],
  });

  customer = await Customer.create({
    name: 'Deal Customer',
    email: 'dealcustomer@example.com',
    phone: '555-0000',
  });

  pipeline = await create_test_pipeline('Deal Test Pipeline');
});

beforeEach(async () => {
  await Deal.deleteMany({});
  await AuditLog.deleteMany({});
});

const as_owner = () => mock_context(owner, sales_role);
const as_other = () => mock_context(other_owner, sales_role);
const as_manager = () => mock_context(manager, manager_role);

const valid_input = (overrides: Record<string, unknown> = {}) => ({
  title: 'Platform licence',
  customer_id: String(customer._id),
  owner_id: String(owner._id),
  value: 50000,
  ...overrides,
});

/** Builds a deal document directly, bypassing the service. */
const make_deal = (overrides: Record<string, unknown> = {}) =>
  Deal.create({
    title: 'Owned',
    customer_id: customer._id,
    owner_id: owner._id,
    value: 1000,
    pipeline_id: pipeline._id,
    stage_id: stage_named(pipeline, 'Proposal')._id,
    stage_entered_at: new Date(),
    ...overrides,
  });

describe('DealService.create', () => {
  it('creates a deal defaulting to Open on the first stage', async () => {
    const deal = await deal_service.create(as_owner(), valid_input());

    expect(deal.title).toBe('Platform licence');
    expect(deal.value).toBe(50000);
    expect(deal.status).toBe('Open');
    // No stage given, so it lands on the first stage of the default pipeline.
    expect(String(deal.stage_id)).toBe(String(first_open_stage(pipeline)._id));
    expect(String(deal.pipeline_id)).toBe(String(pipeline._id));
    expect(deal.stage_entered_at).toBeInstanceOf(Date);
  });

  it('accepts an explicit stage within the pipeline', async () => {
    const negotiation = stage_named(pipeline, 'Negotiation');
    const deal = await deal_service.create(
      as_owner(),
      valid_input({ pipeline_id: String(pipeline._id), stage_id: String(negotiation._id) })
    );

    expect(String(deal.stage_id)).toBe(String(negotiation._id));
  });

  it('rejects a stage that belongs to another pipeline', async () => {
    const other = await Pipeline.create({
      name: 'Unrelated Pipeline',
      stages: [{ name: 'Only', display_order: 0, probability: 10, outcome: 'open' }],
    });

    await expect(
      deal_service.create(
        as_owner(),
        valid_input({
          pipeline_id: String(pipeline._id),
          stage_id: String(other.stages[0]._id),
        })
      )
    ).rejects.toThrow(NotFoundError);
  });

  it('rejects a negative value', async () => {
    // Float! alone permitted this; only the zod schema rules it out.
    await expect(deal_service.create(as_owner(), valid_input({ value: -100 }))).rejects.toThrow(
      ValidationError
    );
  });

  it('rejects a customer that does not exist', async () => {
    await expect(
      deal_service.create(as_owner(), valid_input({ customer_id: new Types.ObjectId().toString() }))
    ).rejects.toThrow(BadUserInputError);
  });

  it('rejects an owner that does not exist', async () => {
    await expect(
      deal_service.create(as_owner(), valid_input({ owner_id: new Types.ObjectId().toString() }))
    ).rejects.toThrow(BadUserInputError);
  });

  it('rejects a malformed id without hitting the database', async () => {
    await expect(
      deal_service.create(as_owner(), valid_input({ customer_id: 'not-an-id' }))
    ).rejects.toThrow(ValidationError);
  });

  it('requires deals.create', async () => {
    const no_perm = mock_context_with(owner, { 'deals.read': true });
    await expect(deal_service.create(no_perm, valid_input())).rejects.toThrow(ForbiddenError);
  });

  it('writes an audit entry', async () => {
    await deal_service.create(as_owner(), valid_input());
    expect(await AuditLog.countDocuments({ action: 'Deal created' })).toBe(1);
  });
});

describe('DealService.update', () => {
  it('updates fields', async () => {
    const deal = await make_deal();

    const updated = await deal_service.update(as_owner(), String(deal._id), {
      title: 'Renamed',
      value: 2000,
    });

    expect(updated.title).toBe('Renamed');
    expect(updated.value).toBe(2000);
  });

  it('requires a lost reason when marking a deal lost', async () => {
    const deal = await make_deal();

    await expect(
      deal_service.update(as_owner(), String(deal._id), { status: 'Lost' })
    ).rejects.toThrow(ValidationError);
  });

  it('accepts a lost deal with a reason and stamps closed_at', async () => {
    const deal = await make_deal();

    const updated = await deal_service.update(as_owner(), String(deal._id), {
      status: 'Lost',
      lost_reason: 'Price',
    });

    expect(updated.status).toBe('Lost');
    expect(updated.lost_reason).toBe('Price');
    expect(updated.closed_at).toBeDefined();
  });

  it('clears closed_at and the lost reason when a deal is reopened', async () => {
    const deal = await make_deal();
    await deal_service.update(as_owner(), String(deal._id), {
      status: 'Lost',
      lost_reason: 'Price',
    });

    const reopened = await deal_service.update(as_owner(), String(deal._id), { status: 'Open' });

    expect(reopened.closed_at).toBeFalsy();
    expect(reopened.lost_reason).toBeFalsy();
  });

  it('ignores unknown fields rather than mass-assigning them', async () => {
    const deal = await make_deal();

    // Object.assign(deal, input) used to write whatever arrived.
    const updated = await deal_service.update(as_owner(), String(deal._id), {
      title: 'Renamed',
      stage_id: new Types.ObjectId().toString(),
    });

    expect(updated.title).toBe('Renamed');
    // Stage changes go through moveDealToStage, never a field edit.
    expect(String(updated.stage_id)).toBe(String(stage_named(pipeline, 'Proposal')._id));
  });

  it("refuses to update another owner's deal", async () => {
    const deal = await make_deal({ owner_id: other_owner._id });

    await expect(
      deal_service.update(as_owner(), String(deal._id), { title: 'Hijacked' })
    ).rejects.toThrow(NotFoundError);
  });
});

describe('DealService.move_to_stage', () => {
  it('stamps stage_entered_at when the stage changes', async () => {
    const deal = await make_deal({ stage_entered_at: new Date(Date.now() - 10 * 86400000) });
    const before = deal.stage_entered_at.getTime();

    const moved = await deal_service.move_to_stage(
      as_owner(),
      String(deal._id),
      String(stage_named(pipeline, 'Negotiation')._id)
    );

    expect(String(moved.stage_id)).toBe(String(stage_named(pipeline, 'Negotiation')._id));
    expect(moved.stage_entered_at.getTime()).toBeGreaterThan(before);
  });

  it('records how long the deal sat in the previous stage', async () => {
    const deal = await make_deal({ stage_entered_at: new Date(Date.now() - 7 * 86400000) });

    await deal_service.move_to_stage(
      as_owner(),
      String(deal._id),
      String(stage_named(pipeline, 'Negotiation')._id)
    );

    const log = await AuditLog.findOne({ action: 'Deal stage changed' });
    expect(log?.metadata).toMatchObject({
      stage_from: 'Proposal',
      stage_to: 'Negotiation',
      days_in_previous_stage: 7,
    });
  });

  it('closes the deal as Won when moved to the won stage', async () => {
    const deal = await make_deal();

    const moved = await deal_service.move_to_stage(
      as_owner(),
      String(deal._id),
      String(won_stage(pipeline)._id)
    );

    expect(moved.status).toBe('Won');
    expect(moved.closed_at).toBeDefined();
  });

  it('closes the deal as Lost when moved to the lost stage', async () => {
    const deal = await make_deal();

    const moved = await deal_service.move_to_stage(
      as_owner(),
      String(deal._id),
      String(lost_stage(pipeline)._id)
    );

    expect(moved.status).toBe('Lost');
    expect(moved.closed_at).toBeDefined();
    // A reason is always present so win/loss analysis has something to group by.
    expect(moved.lost_reason).toBeTruthy();
  });

  it('reopens a closed deal moved back to an open stage', async () => {
    const deal = await make_deal();
    await deal_service.move_to_stage(as_owner(), String(deal._id), String(won_stage(pipeline)._id));

    const reopened = await deal_service.move_to_stage(
      as_owner(),
      String(deal._id),
      String(stage_named(pipeline, 'Proposal')._id)
    );

    expect(reopened.status).toBe('Open');
    expect(reopened.closed_at).toBeFalsy();
  });

  it('is a no-op when the deal is already on that stage', async () => {
    const deal = await make_deal();
    const before = deal.stage_entered_at.getTime();

    const moved = await deal_service.move_to_stage(
      as_owner(),
      String(deal._id),
      String(stage_named(pipeline, 'Proposal')._id)
    );

    expect(moved.stage_entered_at.getTime()).toBe(before);
    expect(await AuditLog.countDocuments({ action: 'Deal stage changed' })).toBe(0);
  });

  it("refuses to move another owner's deal", async () => {
    const deal = await make_deal({ owner_id: other_owner._id });

    await expect(
      deal_service.move_to_stage(
        as_owner(),
        String(deal._id),
        String(stage_named(pipeline, 'Negotiation')._id)
      )
    ).rejects.toThrow(NotFoundError);
  });
});

describe('DealService.board', () => {
  it('groups open deals into ordered stage columns', async () => {
    await make_deal({ title: 'A', stage_id: stage_named(pipeline, 'Proposal')._id });
    await make_deal({ title: 'B', stage_id: stage_named(pipeline, 'Proposal')._id, value: 500 });
    await make_deal({ title: 'C', stage_id: stage_named(pipeline, 'Negotiation')._id });

    const board = await deal_service.board(as_owner(), String(pipeline._id));

    expect(board.map((c) => c.stage.name)).toEqual([
      'Prospecting',
      'Qualification',
      'Proposal',
      'Negotiation',
      'Closed Won',
      'Closed Lost',
    ]);

    const proposal = board.find((c) => c.stage.name === 'Proposal')!;
    expect(proposal.deal_count).toBe(2);
    expect(proposal.total_value).toBe(1500);
  });

  it('excludes closed deals from the board', async () => {
    await make_deal({ status: 'Won', stage_id: won_stage(pipeline)._id });

    const board = await deal_service.board(as_owner(), String(pipeline._id));
    const won_column = board.find((c) => c.stage.outcome === 'won')!;

    expect(won_column.deal_count).toBe(0);
  });

  it('scopes the board to the calling owner', async () => {
    await make_deal({ title: 'Mine' });
    await make_deal({ title: 'Theirs', owner_id: other_owner._id });

    const mine = await deal_service.board(as_owner(), String(pipeline._id));
    const all = await deal_service.board(as_manager(), String(pipeline._id));

    expect(mine.reduce((sum, c) => sum + c.deal_count, 0)).toBe(1);
    expect(all.reduce((sum, c) => sum + c.deal_count, 0)).toBe(2);
  });
});

describe('DealService.list', () => {
  beforeEach(async () => {
    await make_deal({ title: 'Mine' });
    await make_deal({ title: 'Theirs', owner_id: other_owner._id, value: 2 });
  });

  it('scopes the list to the calling owner', async () => {
    const page = await deal_service.list(as_owner(), {});

    expect(page.total).toBe(1);
    expect(page.items[0].title).toBe('Mine');
  });

  it('lets a wildcard role see every deal', async () => {
    const page = await deal_service.list(as_manager(), {});
    expect(page.total).toBe(2);
  });

  it('searches by title within the caller scope', async () => {
    const page = await deal_service.list(as_other(), { search: 'Theirs' });

    expect(page.items).toHaveLength(1);
    expect(page.items[0].title).toBe('Theirs');
  });

  it('returns a page shape rather than a bare array', async () => {
    const page = await deal_service.list(as_manager(), { limit: 1 });

    expect(page.items).toHaveLength(1);
    expect(page.total).toBe(2);
    expect(page.has_more).toBe(true);
  });
});

describe('DealService.remove', () => {
  it('deletes a deal the caller owns', async () => {
    const deal = await make_deal({ title: 'Doomed' });

    expect(await deal_service.remove(as_owner(), String(deal._id))).toBe(true);
    expect(await Deal.countDocuments()).toBe(0);
  });

  it("refuses to delete another owner's deal", async () => {
    const deal = await make_deal({ owner_id: other_owner._id });

    await expect(deal_service.remove(as_owner(), String(deal._id))).rejects.toThrow(NotFoundError);
    expect(await Deal.countDocuments()).toBe(1);
  });
});
