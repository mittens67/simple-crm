import { describe, it, expect } from 'vitest';
import { require_auth, require_permission, can } from '../../auth/authorize';
import { AppError, ErrorCode } from '../../utils/errors';
import type { Permission } from '../../auth/permissions';
import { mock_context, mock_context_with } from '../helpers/context';
import type { IUser } from '../../models/user';
import type { IRole } from '../../models/role';

const user = { _id: '123', email: 'test@example.com' } as unknown as IUser;

const role_with = (permissions: Record<string, boolean>) =>
  ({ _id: '456', permissions }) as unknown as IRole;

/** Asserts the thrown error carries the expected machine-readable code. */
const expect_code = (fn: () => unknown, code: ErrorCode) => {
  try {
    fn();
  } catch (error) {
    expect(error).toBeInstanceOf(AppError);
    expect((error as AppError).code).toBe(code);
    return;
  }
  throw new Error(`expected ${code} to be thrown`);
};

describe('require_auth', () => {
  it('returns the user when authenticated', () => {
    expect(require_auth(mock_context(user))).toBe(user);
  });

  it('throws UNAUTHENTICATED when there is no user', () => {
    expect_code(() => require_auth(mock_context(null)), ErrorCode.UNAUTHENTICATED);
  });
});

describe('require_permission', () => {
  it('returns the user when the permission is granted', () => {
    const context = mock_context(user, role_with({ 'leads.read': true }));
    expect(require_permission(context, 'leads.read')).toBe(user);
  });

  it('throws UNAUTHENTICATED before checking permissions', () => {
    expect_code(
      () => require_permission(mock_context(null), 'leads.read'),
      ErrorCode.UNAUTHENTICATED
    );
  });

  it('throws FORBIDDEN when the permission is missing', () => {
    const context = mock_context(user, role_with({ 'customers.read': true }));
    expect_code(() => require_permission(context, 'leads.delete'), ErrorCode.FORBIDDEN);
  });

  it('grants access via a resource wildcard', () => {
    const context = mock_context(user, role_with({ 'leads.*': true }));
    expect(require_permission(context, 'leads.delete')).toBe(user);
  });

  it('grants access via the global wildcard', () => {
    const context = mock_context(user, role_with({ '*': true }));
    expect(require_permission(context, 'anything.action' as Permission)).toBe(user);
  });

  it('resolves the resource of a three-segment scope permission', () => {
    // 'leads.read.all' must resolve its resource to 'leads', not 'leads.read'.
    const context = mock_context(user, role_with({ 'leads.*': true }));
    expect(can(context, 'leads.read.all')).toBe(true);
  });
});

describe('multi-role permissions', () => {
  it('unions the permissions of every role held', () => {
    const context = mock_context(
      user,
      role_with({ 'leads.read': true }),
      role_with({ 'support_tickets.read': true })
    );

    expect(can(context, 'leads.read')).toBe(true);
    expect(can(context, 'support_tickets.read')).toBe(true);
  });

  it('holding an extra role never removes access', () => {
    const sales_only = mock_context(user, role_with({ 'deals.*': true }));
    const sales_and_support = mock_context(
      user,
      role_with({ 'deals.*': true }),
      role_with({ 'support_tickets.read': true })
    );

    expect(can(sales_only, 'deals.update')).toBe(true);
    // Under the previous "one active role" model this could come back false
    // purely because a different role happened to be selected.
    expect(can(sales_and_support, 'deals.update')).toBe(true);
  });

  it('ignores permissions explicitly set to false', () => {
    const context = mock_context_with(user, { 'leads.read': false });
    expect(can(context, 'leads.read')).toBe(false);
  });
});
