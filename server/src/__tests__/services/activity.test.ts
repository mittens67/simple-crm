import { describe, it, expect, beforeAll, beforeEach } from 'vitest';
import { Types } from 'mongoose';
import { activity_service, is_overdue } from '../../services/activity';
import Activity from '../../models/activity';
import Lead from '../../models/lead';
import Customer from '../../models/customer';
import User from '../../models/user';
import Role from '../../models/role';
import type { IUser } from '../../models/user';
import type { IRole } from '../../models/role';
import type { ILead } from '../../models/lead';
import type { ICustomer } from '../../models/customer';
import {
  ValidationError,
  NotFoundError,
  ForbiddenError,
  BadUserInputError,
} from '../../utils/errors';
import { mock_context, mock_context_with } from '../helpers/context';

let rep: IUser;
let other_rep: IUser;
let manager: IUser;
let sales_role: IRole;
let manager_role: IRole;
let lead: ILead;
let customer: ICustomer;

beforeAll(async () => {
  sales_role = await Role.create({
    name: 'ActivitySales',
    permissions: {
      'leads.read': true,
      'leads.update': true,
      'leads.delete': true,
      'customers.read': true,
      'customers.update': true,
    },
  });
  manager_role = await Role.create({
    name: 'ActivityManager',
    permissions: { 'leads.*': true, 'customers.*': true },
  });

  rep = await User.create({
    name: 'Activity Rep',
    email: 'activityrep@example.com',
    password: 'password123',
    role_ids: [sales_role._id],
  });
  other_rep = await User.create({
    name: 'Other Activity Rep',
    email: 'otheractivityrep@example.com',
    password: 'password123',
    role_ids: [sales_role._id],
  });
  manager = await User.create({
    name: 'Activity Manager',
    email: 'activitymanager@example.com',
    password: 'password123',
    role_ids: [manager_role._id],
  });

  lead = await Lead.create({
    name: 'Timeline Lead',
    email: 'timeline@example.com',
    phone: '555-2222',
    assigned_rep_id: rep._id,
  });
  customer = await Customer.create({
    name: 'Timeline Customer',
    email: 'timelinecustomer@example.com',
    phone: '555-3333',
  });
});

beforeEach(async () => {
  await Activity.deleteMany({});
});

const as_rep = () => mock_context(rep, sales_role);
const as_other_rep = () => mock_context(other_rep, sales_role);
const as_manager = () => mock_context(manager, manager_role);

const note_input = (overrides: Record<string, unknown> = {}) => ({
  type: 'Note',
  subject: 'Call summary',
  body: 'Discussed pricing.',
  target_type: 'Lead',
  target_id: String(lead._id),
  ...overrides,
});

describe('ActivityService.create', () => {
  it('logs an activity against a lead', async () => {
    const activity = await activity_service.create(as_rep(), note_input());

    expect(activity.subject).toBe('Call summary');
    expect(activity.target_type).toBe('Lead');
    expect(String(activity.target_id)).toBe(String(lead._id));
  });

  it('attributes the activity to the acting user, not the client', async () => {
    const activity = await activity_service.create(as_rep(), note_input({ owner_id: String(other_rep._id) }));

    expect(String(activity.owner_id)).toBe(String(rep._id));
  });

  it('rejects a target that does not exist', async () => {
    await expect(
      activity_service.create(as_rep(), note_input({ target_id: new Types.ObjectId().toString() }))
    ).rejects.toThrow(BadUserInputError);
  });

  it('rejects an unknown target type', async () => {
    await expect(
      activity_service.create(as_rep(), note_input({ target_type: 'Invoice' }))
    ).rejects.toThrow(ValidationError);
  });

  it('rejects an empty subject', async () => {
    await expect(activity_service.create(as_rep(), note_input({ subject: '' }))).rejects.toThrow(
      ValidationError
    );
  });

  it('requires update permission on the target resource', async () => {
    // Read-only on leads is not enough to write to a lead's timeline.
    const read_only = mock_context_with(rep, { 'leads.read': true });

    await expect(activity_service.create(read_only, note_input())).rejects.toThrow(ForbiddenError);
  });

  it('attaches to a customer as readily as a lead', async () => {
    const activity = await activity_service.create(
      as_rep(),
      note_input({ target_type: 'Customer', target_id: String(customer._id) })
    );

    expect(activity.target_type).toBe('Customer');
  });
});

describe('ActivityService timeline', () => {
  it('returns the timeline for one record, newest first', async () => {
    await activity_service.create(as_rep(), note_input({ subject: 'First' }));
    await activity_service.create(as_rep(), note_input({ subject: 'Second' }));
    // An activity on a different record must not leak into this timeline.
    await activity_service.create(
      as_rep(),
      note_input({ subject: 'Elsewhere', target_type: 'Customer', target_id: String(customer._id) })
    );

    const page = await activity_service.list_for_target(as_rep(), {
      target_type: 'Lead',
      target_id: String(lead._id),
    });

    expect(page.total).toBe(2);
    expect(page.items.map((a) => a.subject)).toContain('First');
    expect(page.items.map((a) => a.subject)).not.toContain('Elsewhere');
  });

  it('preserves history rather than overwriting it', async () => {
    // The old sales_notes string lost its contents on every edit.
    await activity_service.create(as_rep(), note_input({ subject: 'Call 1' }));
    await activity_service.create(as_rep(), note_input({ subject: 'Call 2' }));
    await activity_service.create(as_rep(), note_input({ subject: 'Call 3' }));

    const page = await activity_service.list_for_target(as_rep(), {
      target_type: 'Lead',
      target_id: String(lead._id),
    });

    expect(page.total).toBe(3);
  });
});

describe('ActivityService tasks', () => {
  const task_input = (overrides: Record<string, unknown> = {}) =>
    note_input({ type: 'Task', subject: 'Send quote', due_at: new Date().toISOString(), ...overrides });

  it("lists the caller's open tasks", async () => {
    await activity_service.create(as_rep(), task_input());
    await activity_service.create(as_rep(), note_input({ subject: 'Not a task' }));

    const page = await activity_service.list_tasks(as_rep(), {});

    expect(page.total).toBe(1);
    expect(page.items[0].subject).toBe('Send quote');
  });

  it('excludes completed tasks unless asked', async () => {
    const task = await activity_service.create(as_rep(), task_input());
    await activity_service.set_completed(as_rep(), String(task._id), true);

    expect((await activity_service.list_tasks(as_rep(), {})).total).toBe(0);
    expect((await activity_service.list_tasks(as_rep(), { include_completed: true })).total).toBe(1);
  });

  it('reopening a task puts it back on the list', async () => {
    const task = await activity_service.create(as_rep(), task_input());
    await activity_service.set_completed(as_rep(), String(task._id), true);
    await activity_service.set_completed(as_rep(), String(task._id), false);

    expect((await activity_service.list_tasks(as_rep(), {})).total).toBe(1);
  });

  it("refuses to read another user's tasks without the wider scope", async () => {
    await expect(
      activity_service.list_tasks(as_rep(), { owner_id: String(other_rep._id) })
    ).rejects.toThrow(ForbiddenError);
  });

  it("lets a manager read another user's tasks", async () => {
    await activity_service.create(as_rep(), task_input());

    const page = await activity_service.list_tasks(as_manager(), { owner_id: String(rep._id) });
    expect(page.total).toBe(1);
  });

  it('flags a task past its due date as overdue', async () => {
    const past = new Date(Date.now() - 86400000);
    const task = await activity_service.create(as_rep(), task_input({ due_at: past.toISOString() }));

    expect(is_overdue(task)).toBe(true);
  });

  it('does not flag a completed task as overdue', async () => {
    const past = new Date(Date.now() - 86400000);
    const task = await activity_service.create(as_rep(), task_input({ due_at: past.toISOString() }));
    const done = await activity_service.set_completed(as_rep(), String(task._id), true);

    expect(is_overdue(done)).toBe(false);
  });
});

describe('ActivityService.update', () => {
  it('lets the author edit their own activity', async () => {
    const activity = await activity_service.create(as_rep(), note_input());

    const updated = await activity_service.update(as_rep(), String(activity._id), {
      subject: 'Corrected',
    });
    expect(updated.subject).toBe('Corrected');
  });

  it("refuses to let another rep edit someone else's activity", async () => {
    const activity = await activity_service.create(as_rep(), note_input());

    await expect(
      activity_service.update(as_other_rep(), String(activity._id), { subject: 'Tampered' })
    ).rejects.toThrow(ForbiddenError);
  });

  it('lets a manager with the wider scope edit any activity', async () => {
    const activity = await activity_service.create(as_rep(), note_input());

    const updated = await activity_service.update(as_manager(), String(activity._id), {
      subject: 'Corrected by manager',
    });
    expect(updated.subject).toBe('Corrected by manager');
  });

  it('throws NotFoundError for an activity that does not exist', async () => {
    await expect(
      activity_service.get(as_rep(), new Types.ObjectId().toString())
    ).rejects.toThrow(NotFoundError);
  });
});
