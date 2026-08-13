import { describe, it, expect } from 'vitest';
import { GraphQLError } from 'graphql';
import { require_auth, require_permission } from '../../auth/authorize';
import type { ApolloContext } from '../../graphql/context';
import { mock_context } from '../helpers/context';
import type { IUser } from '../../models/user';

describe('require_auth', () => {
  it('returns user when authenticated', () => {
    const user = { _id: '123', email: 'test@example.com' } as IUser;
    const context = mock_context(user) as any as ApolloContext;

    const result = require_auth(context);
    expect(result).toBe(user);
  });

  it('throws UNAUTHENTICATED when user is null', () => {
    const context = {
      user: null,
      auth_retried: false,
    } as any as ApolloContext;

    expect(() => require_auth(context)).toThrow();
    try {
      require_auth(context);
    } catch (error) {
      if (error instanceof GraphQLError) {
        expect(error.extensions.code).toBe('UNAUTHENTICATED');
      }
    }
  });

  it('throws UNAUTHENTICATED when user is undefined', () => {
    const context = {
      user: undefined,
      auth_retried: false,
    } as any as ApolloContext;

    expect(() => require_auth(context)).toThrow();
    try {
      require_auth(context);
    } catch (error) {
      if (error instanceof GraphQLError) {
        expect(error.extensions.code).toBe('UNAUTHENTICATED');
      }
    }
  });
});

describe('require_permission', () => {
  it('returns user when permission is granted', () => {
    const user = { _id: '123', email: 'test@example.com' } as IUser;
    const role = { _id: '456', permissions: { 'leads.read': true } };
    const context = mock_context(user, role) as any as ApolloContext;

    const result = require_permission(context, 'leads.read');
    expect(result).toBe(user);
  });

  it('throws UNAUTHENTICATED when user is null', () => {
    const context = {
      user: null,
      role: null,
      auth_retried: false,
    } as any as ApolloContext;

    expect(() => require_permission(context, 'leads.read')).toThrow();
    try {
      require_permission(context, 'leads.read');
    } catch (error) {
      if (error instanceof GraphQLError) {
        expect(error.extensions.code).toBe('UNAUTHENTICATED');
      }
    }
  });

  it('throws FORBIDDEN when permission is denied', () => {
    const user = { _id: '123', email: 'test@example.com' } as IUser;
    const role = { _id: '456', permissions: { 'customers.read': true } };
    const context = mock_context(user, role) as any as ApolloContext;

    expect(() => require_permission(context, 'leads.delete')).toThrow();
    try {
      require_permission(context, 'leads.delete');
    } catch (error) {
      if (error instanceof GraphQLError) {
        expect(error.extensions.code).toBe('FORBIDDEN');
      }
    }
  });

  it('grants access via wildcard permission', () => {
    const user = { _id: '123', email: 'test@example.com' } as IUser;
    const role = { _id: '456', permissions: { 'leads.*': true } };
    const context = mock_context(user, role) as any as ApolloContext;

    const result = require_permission(context, 'leads.delete');
    expect(result).toBe(user);
  });

  it('grants access via global wildcard', () => {
    const user = { _id: '123', email: 'test@example.com' } as IUser;
    const role = { _id: '456', permissions: { '*': true } };
    const context = mock_context(user, role) as any as ApolloContext;

    const result = require_permission(context, 'anything.action');
    expect(result).toBe(user);
  });
});
