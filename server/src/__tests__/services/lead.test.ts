import { describe, it, expect, beforeAll, beforeEach } from 'vitest';
import { Types } from 'mongoose';
import { lead_service } from '../../services/lead';
import Lead from '../../models/lead';
import Customer from '../../models/customer';
import User from '../../models/user';
import Role from '../../models/role';
import ActivityLog from '../../models/activity-log';
import type { IUser } from '../../models/user';
import type { IRole } from '../../models/role';
import { ValidationError, NotFoundError, ForbiddenError, BadUserInputError } from '../../utils/errors';
import { mock_context, mock_context_with } from '../helpers/context';

// MongoDB setup is handled by src/__tests__/setup.ts (wired in vitest.config.ts)

let rep: IUser;
let other_rep: IUser;
let manager: IUser;
let sales_role: IRole;
let manager_role: IRole;

beforeAll(async () => {
  // A rep may only see their own book of business.
  sales_role = await Role.create({
    name: 'SalesScoped',
    permissions: {
      'leads.read': true,
      'leads.create': true,
      'leads.update': true,
      'leads.delete': true,
    },
  });

  // A manager holds the .all scopes on top of the same actions.
  manager_role = await Role.create({
    name: 'SalesManager',
    permissions: {
      'leads.read': true,
      'leads.create': true,
      'leads.update': true,
      'leads.delete': true,
      'leads.read.all': true,
      'leads.update.all': true,
      'leads.delete.all': true,
    },
  });

  rep = await User.create({
    name: 'Rep',
    email: 'rep@example.com',
    password: 'password123',
    role_ids: [sales_role._id],
  });

  other_rep = await User.create({
    name: 'Other Rep',
    email: 'other@example.com',
    password: 'password123',
    role_ids: [sales_role._id],
  });

  manager = await User.create({
    name: 'Manager',
    email: 'manager@example.com',
    password: 'password123',
    role_ids: [manager_role._id],
  });
});

beforeEach(async () => {
  await Lead.deleteMany({});
  await Customer.deleteMany({});
  await ActivityLog.deleteMany({});
});

const as_rep = () => mock_context(rep, sales_role);
const as_other_rep = () => mock_context(other_rep, sales_role);
const as_manager = () => mock_context(manager, manager_role);

const valid_input = (overrides: Record<string, unknown> = {}) => ({
  name: 'John Doe',
  email: 'john@example.com',
  phone: '555-1234',
  ...overrides,
});

describe('LeadService.create', () => {
  it('creates a lead with valid input', async () => {
    const lead = await lead_service.create(as_rep(), valid_input());

    expect(lead.name).toBe('John Doe');
    expect(lead.status).toBe('Open');
  });

  it('rejects invalid input with a ValidationError', async () => {
    await expect(
      lead_service.create(as_rep(), valid_input({ email: 'not-an-email' }))
    ).rejects.toThrow(ValidationError);
  });

  it('moves the lead to Pending when a rep is attached', async () => {
    const lead = await lead_service.create(
      as_rep(),
      valid_input({ assigned_rep_id: String(rep._id) })
    );

    expect(lead.status).toBe('Pending');
    expect(String(lead.assigned_rep_id)).toBe(String(rep._id));
  });

  it('rejects an assignment to a user that does not exist', async () => {
    await expect(
      lead_service.create(
        as_rep(),
        valid_input({ assigned_rep_id: new Types.ObjectId().toString() })
      )
    ).rejects.toThrow(BadUserInputError);
  });

  it('requires leads.create', async () => {
    const no_perm = mock_context_with(rep, {});
    await expect(lead_service.create(no_perm, valid_input())).rejects.toThrow(ForbiddenError);
  });

  it('writes an audit entry', async () => {
    await lead_service.create(as_rep(), valid_input());

    const logs = await ActivityLog.find({ action: 'Lead created' });
    expect(logs).toHaveLength(1);
    expect(String(logs[0].user_id)).toBe(String(rep._id));
  });
});

describe('LeadService.update', () => {
  const create_owned_lead = () =>
    Lead.create({ ...valid_input(), assigned_rep_id: rep._id, status: 'Pending' });

  it('updates fields', async () => {
    const lead = await create_owned_lead();

    const updated = await lead_service.update(as_rep(), String(lead._id), { name: 'Renamed' });
    expect(updated.name).toBe('Renamed');
  });

  it('returns the lead to Open when the rep is detached', async () => {
    const lead = await create_owned_lead();

    const updated = await lead_service.update(as_manager(), String(lead._id), {
      assigned_rep_id: null,
    });
    expect(updated.status).toBe('Open');
  });

  it('ignores fields that are not updatable', async () => {
    const lead = await create_owned_lead();

    // customer_id is set by conversion, never directly by a client.
    const forged = new Types.ObjectId().toString();
    const updated = await lead_service.update(as_rep(), String(lead._id), {
      name: 'Renamed',
      customer_id: forged,
    });

    expect(updated.name).toBe('Renamed');
    expect(updated.customer_id).toBeUndefined();
  });

  it('throws NotFoundError for a lead that does not exist', async () => {
    await expect(
      lead_service.update(as_rep(), new Types.ObjectId().toString(), { name: 'x' })
    ).rejects.toThrow(NotFoundError);
  });
});

describe('LeadService conversion', () => {
  it('creates a linked customer and back-links it', async () => {
    const lead = await Lead.create({ ...valid_input(), assigned_rep_id: rep._id });

    const converted = await lead_service.update(as_rep(), String(lead._id), {
      status: 'Converted',
    });

    expect(converted.status).toBe('Converted');
    expect(converted.customer_id).toBeDefined();

    const customer = await Customer.findById(converted.customer_id);
    expect(customer?.email).toBe('john@example.com');
    expect(String(customer?.assigned_rep_id)).toBe(String(rep._id));
  });

  it('does not create a second customer when already converted', async () => {
    const lead = await Lead.create({ ...valid_input(), assigned_rep_id: rep._id });

    await lead_service.update(as_rep(), String(lead._id), { status: 'Converted' });
    await lead_service.update(as_rep(), String(lead._id), { status: 'Converted' });

    expect(await Customer.countDocuments()).toBe(1);
  });

  it('records the conversion in the audit log', async () => {
    const lead = await Lead.create({ ...valid_input(), assigned_rep_id: rep._id });

    await lead_service.update(as_rep(), String(lead._id), { status: 'Converted' });

    expect(await ActivityLog.countDocuments({ action: 'Lead converted' })).toBe(1);
  });
});

describe('LeadService.list', () => {
  beforeEach(async () => {
    await Lead.create({ ...valid_input({ email: 'a@x.com' }), assigned_rep_id: rep._id });
    await Lead.create({ ...valid_input({ email: 'b@x.com' }), assigned_rep_id: other_rep._id });
    await Lead.create({ ...valid_input({ email: 'c@x.com' }) });
  });

  it('shows a rep only the leads assigned to them', async () => {
    const page = await lead_service.list(as_rep(), {});

    expect(page.total).toBe(1);
    expect(page.items[0].email).toBe('a@x.com');
  });

  it('shows a different rep a different set', async () => {
    const page = await lead_service.list(as_other_rep(), {});

    expect(page.total).toBe(1);
    expect(page.items[0].email).toBe('b@x.com');
  });

  it('shows a manager every lead via the .all scope', async () => {
    const page = await lead_service.list(as_manager(), {});
    expect(page.total).toBe(3);
  });

  it('reports a total consistent with the scope, not the raw collection', async () => {
    // Filtering after the fact would report 3 here and break pagination.
    const page = await lead_service.list(as_rep(), { limit: 10 });
    expect(page.total).toBe(1);
    expect(page.has_more).toBe(false);
  });
});

describe('LeadService.get', () => {
  it("refuses to read another rep's lead", async () => {
    const lead = await Lead.create({ ...valid_input(), assigned_rep_id: other_rep._id });

    await expect(lead_service.get(as_rep(), String(lead._id))).rejects.toThrow(NotFoundError);
  });

  it('lets a manager read any lead', async () => {
    const lead = await Lead.create({ ...valid_input(), assigned_rep_id: other_rep._id });

    const found = await lead_service.get(as_manager(), String(lead._id));
    expect(String(found._id)).toBe(String(lead._id));
  });
});

describe('LeadService.archive', () => {
  it('soft deletes by archiving rather than removing', async () => {
    const lead = await Lead.create({ ...valid_input(), assigned_rep_id: rep._id });

    const archived = await lead_service.archive(as_rep(), String(lead._id));

    expect(archived.status).toBe('Archived');
    expect(await Lead.countDocuments()).toBe(1);
  });

  it("refuses to archive another rep's lead", async () => {
    const lead = await Lead.create({ ...valid_input(), assigned_rep_id: other_rep._id });

    await expect(lead_service.archive(as_rep(), String(lead._id))).rejects.toThrow(NotFoundError);
  });
});
