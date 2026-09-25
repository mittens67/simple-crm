import { describe, it, expect, beforeAll, beforeEach } from 'vitest';
import { Types } from 'mongoose';
import { customer_service } from '../../services/customer';
import Customer from '../../models/customer';
import User from '../../models/user';
import Role from '../../models/role';
import AuditLog from '../../models/audit-log';
import type { IUser } from '../../models/user';
import type { IRole } from '../../models/role';
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

beforeAll(async () => {
  sales_role = await Role.create({
    name: 'CustomerSales',
    permissions: {
      'customers.read': true,
      'customers.create': true,
      'customers.update': true,
      'customers.delete': true,
    },
  });

  manager_role = await Role.create({
    name: 'CustomerManager',
    permissions: { 'customers.*': true },
  });

  rep = await User.create({
    name: 'Cust Rep',
    email: 'custrep@example.com',
    password: 'password123',
    role_ids: [sales_role._id],
  });

  other_rep = await User.create({
    name: 'Other Cust Rep',
    email: 'othercustrep@example.com',
    password: 'password123',
    role_ids: [sales_role._id],
  });

  manager = await User.create({
    name: 'Cust Manager',
    email: 'custmanager@example.com',
    password: 'password123',
    role_ids: [manager_role._id],
  });
});

beforeEach(async () => {
  await Customer.deleteMany({});
  await AuditLog.deleteMany({});
});

const as_rep = () => mock_context(rep, sales_role);
const as_manager = () => mock_context(manager, manager_role);

const valid_input = (overrides: Record<string, unknown> = {}) => ({
  name: 'Acme Contact',
  email: 'contact@acme.com',
  phone: '555-1234',
  ...overrides,
});

describe('CustomerService.create', () => {
  it('creates a customer', async () => {
    const customer = await customer_service.create(as_rep(), valid_input());

    expect(customer.name).toBe('Acme Contact');
    // The model lowercases emails.
    expect(customer.email).toBe('contact@acme.com');
  });

  it('rejects a malformed email', async () => {
    // Previously customers had no application-level validation at all.
    await expect(
      customer_service.create(as_rep(), valid_input({ email: 'not-an-email' }))
    ).rejects.toThrow(ValidationError);
  });

  it('rejects an assigned rep that does not exist', async () => {
    await expect(
      customer_service.create(
        as_rep(),
        valid_input({ assigned_rep_id: new Types.ObjectId().toString() })
      )
    ).rejects.toThrow(BadUserInputError);
  });

  it('attaches a valid assigned rep', async () => {
    const customer = await customer_service.create(
      as_rep(),
      valid_input({ assigned_rep_id: String(rep._id) })
    );

    expect(String(customer.assigned_rep_id)).toBe(String(rep._id));
  });

  it('requires customers.create', async () => {
    const no_perm = mock_context_with(rep, { 'customers.read': true });
    await expect(customer_service.create(no_perm, valid_input())).rejects.toThrow(ForbiddenError);
  });

  it('writes an audit entry', async () => {
    await customer_service.create(as_rep(), valid_input());
    expect(await AuditLog.countDocuments({ action: 'Customer created' })).toBe(1);
  });
});

describe('CustomerService.update', () => {
  it('updates a customer the caller owns', async () => {
    const customer = await Customer.create({ ...valid_input(), assigned_rep_id: rep._id });

    const updated = await customer_service.update(as_rep(), String(customer._id), {
      name: 'Renamed',
    });

    expect(updated.name).toBe('Renamed');
  });

  it("refuses to update another rep's customer", async () => {
    const customer = await Customer.create({ ...valid_input(), assigned_rep_id: other_rep._id });

    await expect(
      customer_service.update(as_rep(), String(customer._id), { name: 'Hijacked' })
    ).rejects.toThrow(NotFoundError);
  });

  it('throws NotFoundError for a customer that does not exist', async () => {
    await expect(
      customer_service.update(as_manager(), new Types.ObjectId().toString(), { name: 'x' })
    ).rejects.toThrow(NotFoundError);
  });
});

describe('CustomerService.list', () => {
  beforeEach(async () => {
    await Customer.create({ ...valid_input({ email: 'a@acme.com' }), assigned_rep_id: rep._id });
    await Customer.create({
      ...valid_input({ email: 'b@acme.com' }),
      assigned_rep_id: other_rep._id,
    });
  });

  it('scopes the list to the calling rep', async () => {
    const page = await customer_service.list(as_rep(), {});

    expect(page.total).toBe(1);
    expect(page.items[0].email).toBe('a@acme.com');
  });

  it('lets a wildcard role see every customer', async () => {
    const page = await customer_service.list(as_manager(), {});
    expect(page.total).toBe(2);
  });

  it('is paginated rather than returning the whole collection', async () => {
    const page = await customer_service.list(as_manager(), { limit: 1 });

    expect(page.items).toHaveLength(1);
    expect(page.has_more).toBe(true);
  });
});

describe('CustomerService.remove', () => {
  it('deletes a customer in scope', async () => {
    const customer = await Customer.create({ ...valid_input(), assigned_rep_id: rep._id });

    expect(await customer_service.remove(as_rep(), String(customer._id))).toBe(true);
    expect(await Customer.countDocuments()).toBe(0);
  });

  it("refuses to delete another rep's customer", async () => {
    const customer = await Customer.create({ ...valid_input(), assigned_rep_id: other_rep._id });

    await expect(customer_service.remove(as_rep(), String(customer._id))).rejects.toThrow(
      NotFoundError
    );
  });
});
