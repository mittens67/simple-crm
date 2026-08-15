import { describe, it, expect, beforeAll, beforeEach } from 'vitest';
import { GraphQLError } from 'graphql';
import bcrypt from 'bcryptjs';
import User from '../../models/user';
import Role from '../../models/role';
import ActivityLog from '../../models/activity-log';
import { mock_context } from '../helpers/context';
import type { ApolloContext } from '../../graphql/context';
import activityLogResolvers from '../../graphql/resolvers/activity-log';

let activity_role: any;
let admin_role: any;
let test_user: any;
let test_user_2: any;
let test_admin: any;

beforeAll(async () => {
  activity_role = await Role.create({
    name: 'ActivityLogger',
    permissions: {
      'activity_logs.read': true,
      'activity_logs.create': true,
    },
  });

  admin_role = await Role.create({
    name: 'Admin',
    permissions: { '*': true },
  });

  const password_hash = await bcrypt.hash('Password123', 10);

  test_user = await User.create({
    name: 'Activity User 1',
    email: 'activity1@example.com',
    password: password_hash,
    role_ids: [activity_role._id],
    is_active: true,
  });

  test_user_2 = await User.create({
    name: 'Activity User 2',
    email: 'activity2@example.com',
    password: password_hash,
    role_ids: [activity_role._id],
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

beforeEach(async () => {
  await ActivityLog.deleteMany({});
});

describe('Activity Log Resolver', () => {
  describe('activityLogs query', () => {
    it('returns all activity logs with activity_logs.read permission', async () => {
      await ActivityLog.create({
        user_id: test_user._id,
        action: 'viewed_customer',
        metadata: { customer_id: '123' },
      });
      await ActivityLog.create({
        user_id: test_user_2._id,
        action: 'created_deal',
        metadata: { deal_id: '456' },
      });

      const context = mock_context(test_user, activity_role) as any as ApolloContext;
      const result = await activityLogResolvers.Query.activityLogs(null, {}, context);

      expect(result).toHaveLength(2);
      expect(result[0].action).toBe('created_deal'); // Most recent first due to sort
      expect(result[1].action).toBe('viewed_customer');
    });

    it('filters activity logs by user_id if provided', async () => {
      await ActivityLog.create({
        user_id: test_user._id,
        action: 'viewed_customer',
        metadata: { customer_id: '123' },
      });
      await ActivityLog.create({
        user_id: test_user_2._id,
        action: 'created_deal',
        metadata: { deal_id: '456' },
      });
      await ActivityLog.create({
        user_id: test_user._id,
        action: 'updated_lead',
        metadata: { lead_id: '789' },
      });

      const context = mock_context(test_user, activity_role) as any as ApolloContext;
      const result = await activityLogResolvers.Query.activityLogs(null, {
        user_id: test_user._id.toString(),
      }, context);

      expect(result).toHaveLength(2);
      // user_id is populated, so it's a full user object; check the _id field
      expect(result[0].user_id._id.toString()).toBe(test_user._id.toString());
      expect(result[1].user_id._id.toString()).toBe(test_user._id.toString());
    });

    it('returns empty array when filtering by user with no logs', async () => {
      await ActivityLog.create({
        user_id: test_user._id,
        action: 'test_action',
        metadata: {},
      });

      const context = mock_context(test_user, activity_role) as any as ApolloContext;
      const result = await activityLogResolvers.Query.activityLogs(null, {
        user_id: test_user_2._id.toString(),
      }, context);

      expect(result).toHaveLength(0);
    });

    it('throws FORBIDDEN without activity_logs.read permission', async () => {
      const no_perm_role = await Role.create({
        name: 'NoActivityRead',
        permissions: { 'customers.read': true },
      });
      const no_perm_user = await User.create({
        name: 'Limited User',
        email: 'limited@example.com',
        password: 'Password123',
        role_ids: [no_perm_role._id],
        is_active: true,
      });

      const context = mock_context(no_perm_user, no_perm_role) as any as ApolloContext;

      await expect(
        activityLogResolvers.Query.activityLogs(null, {}, context)
      ).rejects.toThrow();

      try {
        await activityLogResolvers.Query.activityLogs(null, {}, context);
      } catch (error) {
        if (error instanceof GraphQLError) {
          expect(error.extensions.code).toBe('FORBIDDEN');
        }
      }
    });
  });

  describe('logActivity mutation', () => {
    it('creates activity log and self-attributes user_id to authenticated user', async () => {
      const context = mock_context(test_user, activity_role) as any as ApolloContext;

      const result = await activityLogResolvers.Mutation.logActivity(null, {
        input: {
          action: 'viewed_dashboard',
          metadata: { page: 'dashboard' },
        },
      }, context);

      expect(result).toBeDefined();
      expect(result.action).toBe('viewed_dashboard');
      expect(result.user_id.toString()).toBe(test_user._id.toString());
      expect(result.metadata).toEqual({ page: 'dashboard' });
    });

    it('self-attributes user_id even if different user_id is in input', async () => {
      const context = mock_context(test_user, activity_role) as any as ApolloContext;

      const result = await activityLogResolvers.Mutation.logActivity(null, {
        input: {
          action: 'test_action',
          metadata: {},
          user_id: test_user_2._id.toString(), // Should be ignored
        },
      }, context);

      expect(result.user_id.toString()).toBe(test_user._id.toString());
    });

    it('logs activity with empty metadata', async () => {
      const context = mock_context(test_user, activity_role) as any as ApolloContext;

      const result = await activityLogResolvers.Mutation.logActivity(null, {
        input: {
          action: 'simple_action',
        },
      }, context);

      expect(result.action).toBe('simple_action');
      expect(result.metadata).toEqual({});
    });

    it('logs activity with complex metadata', async () => {
      const context = mock_context(test_user, activity_role) as any as ApolloContext;
      const complex_metadata = {
        entity_type: 'customer',
        entity_id: '123456',
        changes: {
          name: 'Old Name',
          new_name: 'New Name',
        },
        timestamp: '2026-08-15T10:30:00Z',
      };

      const result = await activityLogResolvers.Mutation.logActivity(null, {
        input: {
          action: 'updated_customer',
          metadata: complex_metadata,
        },
      }, context);

      expect(result.metadata).toEqual(complex_metadata);
    });

    it('throws FORBIDDEN without activity_logs.create permission', async () => {
      const no_perm_role = await Role.create({
        name: 'NoActivityCreate',
        permissions: { 'activity_logs.read': true },
      });
      const no_perm_user = await User.create({
        name: 'CreateLimited',
        email: 'createlimit@example.com',
        password: 'Password123',
        role_ids: [no_perm_role._id],
        is_active: true,
      });

      const context = mock_context(no_perm_user, no_perm_role) as any as ApolloContext;

      await expect(
        activityLogResolvers.Mutation.logActivity(null, {
          input: {
            action: 'unauthorized_action',
            metadata: {},
          },
        }, context)
      ).rejects.toThrow();

      try {
        await activityLogResolvers.Mutation.logActivity(null, {
          input: {
            action: 'unauthorized_action',
            metadata: {},
          },
        }, context);
      } catch (error) {
        if (error instanceof GraphQLError) {
          expect(error.extensions.code).toBe('FORBIDDEN');
        }
      }
    });
  });

  describe('field resolvers', () => {
    it('ActivityLog.user resolves user', async () => {
      const log: any = await ActivityLog.create({
        user_id: test_user._id,
        action: 'test_action',
        metadata: {},
      });

      const result = await activityLogResolvers.ActivityLog.user(log);
      expect(result).toBeDefined();
      expect(result?.name).toBe('Activity User 1');
      expect(result?.email).toBe('activity1@example.com');
    });

    it('ActivityLog.user resolves correctly for different users', async () => {
      const log1 = await ActivityLog.create({
        user_id: test_user._id,
        action: 'action_by_user1',
        metadata: {},
      });

      const log2 = await ActivityLog.create({
        user_id: test_user_2._id,
        action: 'action_by_user2',
        metadata: {},
      });

      const result1 = await activityLogResolvers.ActivityLog.user(log1);
      const result2 = await activityLogResolvers.ActivityLog.user(log2);

      expect(result1?.name).toBe('Activity User 1');
      expect(result2?.name).toBe('Activity User 2');
    });
  });

  describe('JSON scalar export', () => {
    it('exports GraphQLJSONObject as JSON scalar', async () => {
      expect(activityLogResolvers.JSON).toBeDefined();
    });
  });
});
