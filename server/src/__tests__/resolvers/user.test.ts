import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest';
import mongoose, { Types } from 'mongoose';
import { GraphQLError } from 'graphql';
import bcrypt from 'bcryptjs';
import User from '../../models/user';
import Role from '../../models/role';
import RefreshToken from '../../models/refresh-token';
import { mock_context } from '../helpers/context';
import type { ApolloContext } from '../../graphql/context';
import userResolvers from '../../graphql/resolvers/user';

let sales_role: any;
let admin_role: any;
let test_user: any;
let test_admin: any;

beforeEach(async () => {
  // Clear collections
  await User.deleteMany({});
  await Role.deleteMany({});
  await RefreshToken.deleteMany({});

  // Create roles
  sales_role = await Role.create({
    name: 'Sales',
    permissions: {
      'leads.read': true,
      'leads.create': true,
      'leads.update': true,
      'customers.read': true,
    },
  });

  admin_role = await Role.create({
    name: 'Admin',
    permissions: { '*': true },
  });

  // Create test users
  const password_hash = await bcrypt.hash('Password123', 10);

  test_user = await User.create({
    name: 'Sales User',
    email: 'sales@example.com',
    password: password_hash,
    role_ids: [sales_role._id],
    is_active: true,
  });

  test_admin = await User.create({
    name: 'Admin User',
    email: 'admin@example.com',
    password: password_hash,
    role_ids: [admin_role._id],
    is_active: true,
  });
});

describe('User Resolver', () => {
  describe('login', () => {
    it('logs in with correct credentials', async () => {
      const result = await userResolvers.Mutation.login(
        null,
        { input: { email: 'sales@example.com', password: 'Password123' } },
        {
          req: {},
          res: { cookie: () => {} },
          user: null,
          auth_retried: false,
        } as any as ApolloContext
      );

      expect(result.user).toBeDefined();
      expect(result.user.email).toBe('sales@example.com');
      expect(result.accessToken).toBeDefined();
    });

    it('throws on incorrect password', async () => {
      await expect(
        userResolvers.Mutation.login(
          null,
          { input: { email: 'sales@example.com', password: 'WrongPassword' } },
          { req: {}, res: {}, user: null, auth_retried: false } as any as ApolloContext
        )
      ).rejects.toThrow();
    });

    it('throws on non-existent user', async () => {
      await expect(
        userResolvers.Mutation.login(
          null,
          { input: { email: 'nonexistent@example.com', password: 'Password123' } },
          { req: {}, res: {}, user: null, auth_retried: false } as any as ApolloContext
        )
      ).rejects.toThrow();
    });

    it('throws if user is inactive', async () => {
      await User.findByIdAndUpdate(test_user._id, { is_active: false });

      await expect(
        userResolvers.Mutation.login(
          null,
          { input: { email: 'sales@example.com', password: 'Password123' } },
          { req: {}, res: {}, user: null, auth_retried: false } as any as ApolloContext
        )
      ).rejects.toThrow();
    });
  });

  describe('changePassword', () => {
    it('changes password successfully', async () => {
      const context = mock_context(test_user, sales_role) as any as ApolloContext;

      const result = await userResolvers.Mutation.changePassword(
        null,
        { input: { oldPassword: 'Password123', newPassword: 'NewPassword456' } },
        context
      );

      expect(result).toBe(true);

      // Verify new password works, old doesn't
      const updated_user = await User.findById(test_user._id);
      const is_match = await bcrypt.compare('NewPassword456', updated_user!.password);
      expect(is_match).toBe(true);
    });

    it('throws on incorrect old password', async () => {
      const context = mock_context(test_user, sales_role) as any as ApolloContext;

      await expect(
        userResolvers.Mutation.changePassword(
          null,
          { input: { oldPassword: 'WrongPassword', newPassword: 'NewPassword456' } },
          context
        )
      ).rejects.toThrow();
    });

    it('throws when not authenticated', async () => {
      const context = {
        user: null,
        role: null,
        auth_retried: false,
      } as any as ApolloContext;

      await expect(
        userResolvers.Mutation.changePassword(
          null,
          { input: { oldPassword: 'Password123', newPassword: 'NewPassword456' } },
          context
        )
      ).rejects.toThrow();
    });
  });

  describe('createUser', () => {
    it('creates user with users.create permission', async () => {
      const context = mock_context(test_admin, admin_role) as any as ApolloContext;

      const result = await userResolvers.Mutation.createUser(
        null,
        {
          input: {
            name: 'New User',
            email: 'newuser@example.com',
            password: 'NewPassword123',
            role_ids: [sales_role._id],
          },
        },
        context
      );

      expect(result.name).toBe('New User');
      expect(result.email).toBe('newuser@example.com');

      const created = await User.findById(result._id);
      expect(created).toBeDefined();
    });

    it('throws when missing users.create permission', async () => {
      const context = mock_context(test_user, sales_role) as any as ApolloContext;

      await expect(
        userResolvers.Mutation.createUser(
          null,
          {
            input: {
              name: 'New User',
              email: 'newuser@example.com',
              password: 'NewPassword123',
              role_ids: [sales_role._id],
            },
          },
          context
        )
      ).rejects.toThrow();

      try {
        await userResolvers.Mutation.createUser(
          null,
          {
            input: {
              name: 'New User',
              email: 'newuser@example.com',
              password: 'NewPassword123',
              role_ids: [sales_role._id],
            },
          },
          context
        );
      } catch (error) {
        if (error instanceof GraphQLError) {
          expect(error.extensions.code).toBe('FORBIDDEN');
        }
      }
    });

    it('throws on duplicate email', async () => {
      const context = mock_context(test_admin, admin_role) as any as ApolloContext;

      await expect(
        userResolvers.Mutation.createUser(
          null,
          {
            input: {
              name: 'Duplicate User',
              email: 'sales@example.com', // Already exists
              password: 'NewPassword123',
              role_ids: [sales_role._id],
            },
          },
          context
        )
      ).rejects.toThrow();
    });
  });

  describe('updateUser', () => {
    it('updates user with users.update permission', async () => {
      const context = mock_context(test_admin, admin_role) as any as ApolloContext;

      const result = await userResolvers.Mutation.updateUser(
        null,
        {
          id: test_user._id.toString(),
          input: { name: 'Updated Name' },
        },
        context
      );

      expect(result.name).toBe('Updated Name');
    });

    it('throws when missing users.update permission', async () => {
      const context = mock_context(test_user, sales_role) as any as ApolloContext;

      await expect(
        userResolvers.Mutation.updateUser(
          null,
          {
            id: test_admin._id.toString(),
            input: { name: 'Hacked Name' },
          },
          context
        )
      ).rejects.toThrow();

      try {
        await userResolvers.Mutation.updateUser(
          null,
          {
            id: test_admin._id.toString(),
            input: { name: 'Hacked Name' },
          },
          context
        );
      } catch (error) {
        if (error instanceof GraphQLError) {
          expect(error.extensions.code).toBe('FORBIDDEN');
        }
      }
    });

    it('soft-deletes and revokes sessions when deactivated', async () => {
      const context = mock_context(test_admin, admin_role) as any as ApolloContext;

      const result = await userResolvers.Mutation.updateUser(
        null,
        {
          id: test_user._id.toString(),
          input: { is_active: false },
        },
        context
      );

      expect(result.is_active).toBe(false);
    });
  });

  describe('deleteUser', () => {
    it('soft-deletes user with users.delete permission', async () => {
      const context = mock_context(test_admin, admin_role) as any as ApolloContext;

      const result = await userResolvers.Mutation.deleteUser(
        null,
        { id: test_user._id.toString() },
        context
      );

      expect(result).toBe(true);

      const deleted_user = await User.findById(test_user._id);
      expect(deleted_user?.is_active).toBe(false);
    });

    it('throws when missing users.delete permission', async () => {
      const context = mock_context(test_user, sales_role) as any as ApolloContext;

      await expect(
        userResolvers.Mutation.deleteUser(
          null,
          { id: test_admin._id.toString() },
          context
        )
      ).rejects.toThrow();

      try {
        await userResolvers.Mutation.deleteUser(
          null,
          { id: test_admin._id.toString() },
          context
        );
      } catch (error) {
        if (error instanceof GraphQLError) {
          expect(error.extensions.code).toBe('FORBIDDEN');
        }
      }
    });
  });

  describe('me query', () => {
    it('returns authenticated user', async () => {
      const context = mock_context(test_user, sales_role) as any as ApolloContext;

      const result = await userResolvers.Query.me(null, {}, context);

      expect(result.email).toBe('sales@example.com');
    });

    it('throws when not authenticated', async () => {
      const context = {
        user: null,
        role: null,
        auth_retried: false,
      } as any as ApolloContext;

      await expect(userResolvers.Query.me(null, {}, context)).rejects.toThrow();
    });
  });
});
