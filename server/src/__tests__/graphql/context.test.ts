import { describe, it, expect, beforeEach } from 'vitest';
import type { Request, Response } from 'express';
import { Types } from 'mongoose';
import User from '../../models/user';
import Role from '../../models/role';
import { context } from '../../graphql/context';
import { sign_access_token } from '../../auth/tokens';

/**
 * Context construction decides who the caller is and what they may do, and had
 * no coverage. The multi-role union behaviour in particular is the thing most
 * likely to regress: it replaced a header-driven "active role" that could
 * silently reduce access.
 */

const build = (headers: Record<string, string> = {}) =>
  context({
    req: { headers, cookies: {} } as unknown as Request,
    res: {} as Response,
  });

beforeEach(async () => {
  await User.deleteMany({});
  await Role.deleteMany({});
});

const bearer = (user_id: Types.ObjectId | string) => ({
  authorization: `Bearer ${sign_access_token(user_id)}`,
});

describe('anonymous requests', () => {
  it('has no user and no permissions when no header is sent', async () => {
    const result = await build();

    expect(result.user).toBeUndefined();
    expect(result.permissions).toEqual({});
    expect(result.roles).toEqual([]);
  });

  it('ignores a malformed authorization header', async () => {
    expect((await build({ authorization: 'Basic abc123' })).user).toBeUndefined();
    expect((await build({ authorization: 'Bearer' })).user).toBeUndefined();
  });

  it('treats an invalid token as anonymous rather than erroring', async () => {
    // Resolvers decide access; a bad token must not crash the request.
    const result = await build({ authorization: 'Bearer not-a-real-jwt' });

    expect(result.user).toBeUndefined();
    expect(result.permissions).toEqual({});
  });

  it('treats a token for a deleted user as anonymous', async () => {
    const result = await build(bearer(new Types.ObjectId()));

    expect(result.user).toBeUndefined();
  });
});

describe('authenticated requests', () => {
  it('resolves the user and their role permissions', async () => {
    const role = await Role.create({ name: 'Sales', permissions: { 'leads.read': true } });
    const user = await User.create({
      name: 'Rep',
      email: 'rep@context.test',
      password: 'hashed',
      role_ids: [role._id],
    });

    const result = await build(bearer(user._id as Types.ObjectId));

    expect(String(result.user?._id)).toBe(String(user._id));
    expect(result.roles).toHaveLength(1);
    expect(result.permissions).toEqual({ 'leads.read': true });
  });

  it('refuses a deactivated user', async () => {
    const role = await Role.create({ name: 'Sales', permissions: { 'leads.read': true } });
    const user = await User.create({
      name: 'Former Rep',
      email: 'former@context.test',
      password: 'hashed',
      role_ids: [role._id],
      is_active: false,
    });

    // Deactivation takes effect immediately, without waiting for the access
    // token to expire.
    const result = await build(bearer(user._id as Types.ObjectId));

    expect(result.user).toBeUndefined();
    expect(result.permissions).toEqual({});
  });

  it('handles a user with no roles', async () => {
    const user = await User.create({
      name: 'Roleless',
      email: 'roleless@context.test',
      password: 'hashed',
      role_ids: [],
    });

    const result = await build(bearer(user._id as Types.ObjectId));

    expect(result.user).toBeTruthy();
    expect(result.permissions).toEqual({});
  });
});

describe('multi-role permissions', () => {
  const two_role_user = async () => {
    const sales = await Role.create({
      name: 'Sales',
      permissions: { 'leads.read': true, 'deals.read': true },
    });
    const support = await Role.create({
      name: 'Support',
      permissions: { 'support_tickets.read': true },
    });
    const user = await User.create({
      name: 'Both',
      email: 'both@context.test',
      password: 'hashed',
      role_ids: [sales._id, support._id],
    });
    return { user, sales, support };
  };

  it('unions the permissions of every role held', async () => {
    const { user } = await two_role_user();

    const result = await build(bearer(user._id as Types.ObjectId));

    expect(result.roles).toHaveLength(2);
    expect(result.permissions).toEqual({
      'leads.read': true,
      'deals.read': true,
      'support_tickets.read': true,
    });
  });

  it('ignores the x-active-role-id header entirely', async () => {
    const { user, support } = await two_role_user();

    // Role switching is now a display concern. Previously this header chose
    // which single role applied, so switching could remove access — and an
    // unrecognised value silently fell back to the first role.
    const result = await build({
      ...bearer(user._id as Types.ObjectId),
      'x-active-role-id': String(support._id),
    });

    expect(result.permissions).toEqual({
      'leads.read': true,
      'deals.read': true,
      'support_tickets.read': true,
    });
  });

  it('is unaffected by a fabricated role id in the header', async () => {
    const { user } = await two_role_user();

    const result = await build({
      ...bearer(user._id as Types.ObjectId),
      'x-active-role-id': String(new Types.ObjectId()),
    });

    expect(Object.keys(result.permissions)).toHaveLength(3);
  });
});

describe('per-request loaders', () => {
  it('builds a fresh loader set for every request', async () => {
    const first = await build();
    const second = await build();

    // Sharing loaders across requests would leak one user's data into another's
    // response through the DataLoader cache.
    expect(first.loaders).toBeDefined();
    expect(first.loaders).not.toBe(second.loaders);
    expect(first.loaders.user).not.toBe(second.loaders.user);
  });
});
