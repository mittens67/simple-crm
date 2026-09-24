import { describe, it, expect, beforeAll, beforeEach } from 'vitest';
import { Types } from 'mongoose';
import { deal_service } from '../../services/deal';
import Deal from '../../models/deal';
import Customer from '../../models/customer';
import User from '../../models/user';
import Role from '../../models/role';
import ActivityLog from '../../models/activity-log';
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

let owner: IUser;
let other_owner: IUser;
let manager: IUser;
let sales_role: IRole;
let manager_role: IRole;
let customer: ICustomer;

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
});

beforeEach(async () => {
  await Deal.deleteMany({});
  await ActivityLog.deleteMany({});
});

const as_owner = () => mock_context(owner, sales_role);
const as_other = () => mock_context(other_owner, sales_role);
const as_manager = () => mock_context(manager, manager_role);

const valid_input = (overrides: Record<string, unknown> = {}) => ({
  title: 'Platform licence',
  customer_id: String(customer._id),
  owner_id: String(owner._id),
  value: 50000,
  stage: 'Proposal',
  ...overrides,
});

describe('DealService.create', () => {
  it('creates a deal defaulting to Open', async () => {
    const deal = await deal_service.create(as_owner(), valid_input());

    expect(deal.title).toBe('Platform licence');
    expect(deal.value).toBe(50000);
    expect(deal.status).toBe('Open');
  });

  it('rejects a negative value', async () => {
    // Float! alone permitted this; only the zod schema rules it out.
    await expect(deal_service.create(as_owner(), valid_input({ value: -100 }))).rejects.toThrow(
      ValidationError
    );
  });

  it('rejects a missing stage', async () => {
    await expect(deal_service.create(as_owner(), valid_input({ stage: '' }))).rejects.toThrow(
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
    expect(await ActivityLog.countDocuments({ action: 'Deal created' })).toBe(1);
  });
});

describe('DealService.update', () => {
  const owned_deal = () =>
    Deal.create({
      title: 'Owned',
      customer_id: customer._id,
      owner_id: owner._id,
      value: 1000,
      stage: 'Proposal',
    });

  it('updates fields', async () => {
    const deal = await owned_deal();

    const updated = await deal_service.update(as_owner(), String(deal._id), {
      title: 'Renamed',
      value: 2000,
    });

    expect(updated.title).toBe('Renamed');
    expect(updated.value).toBe(2000);
  });

  it('records stage movement in the audit log', async () => {
    const deal = await owned_deal();

    await deal_service.update(as_owner(), String(deal._id), { stage: 'Negotiation' });

    const log = await ActivityLog.findOne({ action: 'Deal updated' });
    expect(log?.metadata).toMatchObject({ stage_from: 'Proposal', stage_to: 'Negotiation' });
  });

  it('ignores unknown fields rather than mass-assigning them', async () => {
    const deal = await owned_deal();

    // Object.assign(deal, input) used to write whatever arrived.
    const updated = await deal_service.update(as_owner(), String(deal._id), {
      title: 'Renamed',
      created_at: new Date(0),
    });

    expect(updated.title).toBe('Renamed');
    expect(updated.created_at.getTime()).not.toBe(0);
  });

  it("refuses to update another owner's deal", async () => {
    const deal = await Deal.create({
      title: 'Theirs',
      customer_id: customer._id,
      owner_id: other_owner._id,
      value: 1,
      stage: 'Proposal',
    });

    await expect(
      deal_service.update(as_owner(), String(deal._id), { title: 'Hijacked' })
    ).rejects.toThrow(NotFoundError);
  });
});

describe('DealService.list', () => {
  beforeEach(async () => {
    await Deal.create({
      title: 'Mine',
      customer_id: customer._id,
      owner_id: owner._id,
      value: 1,
      stage: 'Proposal',
    });
    await Deal.create({
      title: 'Theirs',
      customer_id: customer._id,
      owner_id: other_owner._id,
      value: 2,
      stage: 'Closing',
    });
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
    const deal = await Deal.create({
      title: 'Doomed',
      customer_id: customer._id,
      owner_id: owner._id,
      value: 1,
      stage: 'Proposal',
    });

    expect(await deal_service.remove(as_owner(), String(deal._id))).toBe(true);
    expect(await Deal.countDocuments()).toBe(0);
  });

  it("refuses to delete another owner's deal", async () => {
    const deal = await Deal.create({
      title: 'Theirs',
      customer_id: customer._id,
      owner_id: other_owner._id,
      value: 1,
      stage: 'Proposal',
    });

    await expect(deal_service.remove(as_owner(), String(deal._id))).rejects.toThrow(NotFoundError);
    expect(await Deal.countDocuments()).toBe(1);
  });
});
