import { describe, it, expect } from 'vitest';
import { has_permission } from '../../auth/permissions';

describe('has_permission', () => {
  it('returns true for exact permission match', () => {
    const permissions = { 'leads.read': true, 'leads.create': false };
    expect(has_permission(permissions, 'leads.read')).toBe(true);
  });

  it('returns false for missing permission', () => {
    const permissions = { 'leads.read': true };
    expect(has_permission(permissions, 'leads.delete')).toBe(false);
  });

  it('returns true for wildcard permission on resource', () => {
    const permissions = { 'leads.*': true };
    expect(has_permission(permissions, 'leads.read')).toBe(true);
    expect(has_permission(permissions, 'leads.create')).toBe(true);
    expect(has_permission(permissions, 'leads.delete')).toBe(true);
  });

  it('returns true for global wildcard permission', () => {
    const permissions = { '*': true };
    expect(has_permission(permissions, 'leads.read')).toBe(true);
    expect(has_permission(permissions, 'users.delete')).toBe(true);
    expect(has_permission(permissions, 'deals.create')).toBe(true);
  });

  it('prioritizes exact permission over wildcard', () => {
    const permissions = { 'leads.read': true, 'leads.*': false };
    expect(has_permission(permissions, 'leads.read')).toBe(true);
  });

  it('returns false for undefined permissions', () => {
    expect(has_permission(undefined, 'leads.read')).toBe(false);
  });

  it('returns false for empty permissions object', () => {
    expect(has_permission({}, 'leads.read')).toBe(false);
  });

  it('handles permission with false value correctly', () => {
    const permissions = { 'leads.read': false, 'leads.create': true };
    expect(has_permission(permissions, 'leads.read')).toBe(false);
    expect(has_permission(permissions, 'leads.create')).toBe(true);
  });

  it('works with multiple resources', () => {
    const permissions = {
      'leads.read': true,
      'customers.*': true,
      'deals.delete': false,
      '*': false,
    };

    expect(has_permission(permissions, 'leads.read')).toBe(true);
    expect(has_permission(permissions, 'customers.create')).toBe(true);
    expect(has_permission(permissions, 'deals.delete')).toBe(false);
  });

  it('handles Map-based permissions', () => {
    const permissions = new Map([
      ['leads.read', true],
      ['leads.create', false],
    ]);
    expect(has_permission(permissions, 'leads.read')).toBe(true);
    expect(has_permission(permissions, 'leads.create')).toBe(false);
    expect(has_permission(permissions, 'leads.delete')).toBe(false);
  });
});
