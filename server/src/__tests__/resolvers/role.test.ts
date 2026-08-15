import { describe, it, expect, beforeAll, beforeEach } from 'vitest';
import { GraphQLError } from 'graphql';
import bcrypt from 'bcryptjs';
import User from '../../models/user';
import Role from '../../models/role';
import { mock_context } from '../helpers/context';
import type { ApolloContext } from '../../graphql/context';
import roleResolvers from '../../graphql/resolvers/role';
import { PERMISSION_CATALOG } from '../../auth/permissions';

let admin_role: any;
let admin_user: any;

beforeAll(async () => {
  admin_role = await Role.create({
    name: 'Admin',
    permissions: { '*': true },
  });

  const password_hash = await bcrypt.hash('Password123', 10);

  admin_user = await User.create({
    name: 'Admin User',
    email: 'admin@example.com',
    password: password_hash,
    role_ids: [admin_role._id],
    is_active: true,
  });
});

beforeEach(async () => {
  // Clear test roles (keep the Admin role for testing)
  await Role.deleteMany({ name: { $nin: ['Admin'] } });
});

describe('Role Resolver', () => {
  describe('roles query', () => {
    it('returns all roles with roles.read permission', async () => {
      const context = mock_context(admin_user, admin_role) as any as ApolloContext;

      const result = await roleResolvers.Query.roles(null, {}, context);
      expect(result.length).toBeGreaterThan(0);
      expect(result.some((r: any) => r.name === 'Admin')).toBe(true);
    });

    it('throws FORBIDDEN without roles.read permission', async () => {
      const no_perm_role = await Role.create({
        name: 'NoRolePermission',
        permissions: { 'users.read': true },
      });
      const no_perm_user = await User.create({
        name: 'No Role Perm',
        email: 'noroleperm@example.com',
        password: 'Password123',
        role_ids: [no_perm_role._id],
        is_active: true,
      });

      const context = mock_context(no_perm_user, no_perm_role) as any as ApolloContext;

      await expect(roleResolvers.Query.roles(null, {}, context)).rejects.toThrow();
      try {
        await roleResolvers.Query.roles(null, {}, context);
      } catch (error) {
        if (error instanceof GraphQLError) {
          expect(error.extensions.code).toBe('FORBIDDEN');
        }
      }
    });
  });

  describe('role query', () => {
    it('returns role by id', async () => {
      const context = mock_context(admin_user, admin_role) as any as ApolloContext;

      const result = await roleResolvers.Query.role(null, { id: admin_role._id.toString() }, context);
      expect(result?.name).toBe('Admin');
    });
  });

  describe('permissionCatalog query', () => {
    it('returns the permission catalog', () => {
      const result = roleResolvers.Query.permissionCatalog();
      expect(result).toBe(PERMISSION_CATALOG);
      expect(result.length).toBeGreaterThan(0);
      expect(result).toContain('leads.read');
      expect(result).toContain('users.create');
    });
  });

  describe('createRole mutation', () => {
    it('creates role with roles.create permission', async () => {
      const context = mock_context(admin_user, admin_role) as any as ApolloContext;

      const result = await roleResolvers.Mutation.createRole(
        null,
        {
          input: {
            name: 'Sales Manager',
            permissions: [
              { key: 'leads.read', value: true },
              { key: 'leads.update', value: true },
              { key: 'customers.read', value: true },
            ],
          },
        },
        context
      );

      expect(result.name).toBe('Sales Manager');
      expect(result.permissions['leads.read']).toBe(true);
      expect(result.permissions['leads.update']).toBe(true);
      expect(result.permissions['customers.read']).toBe(true);
    });

    it('throws FORBIDDEN without roles.create permission', async () => {
      const no_perm_role = await Role.create({
        name: 'NoCreateRole',
        permissions: { 'roles.read': true },
      });
      const no_perm_user = await User.create({
        name: 'No Create Role',
        email: 'nocreaterole@example.com',
        password: 'Password123',
        role_ids: [no_perm_role._id],
        is_active: true,
      });

      const context = mock_context(no_perm_user, no_perm_role) as any as ApolloContext;

      await expect(
        roleResolvers.Mutation.createRole(
          null,
          {
            input: {
              name: 'Hacked Role',
              permissions: [{ key: '*', value: true }],
            },
          },
          context
        )
      ).rejects.toThrow();
    });

    it('throws on duplicate role name', async () => {
      const context = mock_context(admin_user, admin_role) as any as ApolloContext;

      // Try to create with a name that already exists (Admin)
      await expect(
        roleResolvers.Mutation.createRole(
          null,
          {
            input: {
              name: 'Admin',
              permissions: [{ key: 'leads.read', value: true }],
            },
          },
          context
        )
      ).rejects.toThrow();

      try {
        await roleResolvers.Mutation.createRole(
          null,
          {
            input: {
              name: 'Admin',
              permissions: [{ key: 'leads.read', value: true }],
            },
          },
          context
        );
      } catch (error) {
        if (error instanceof GraphQLError) {
          expect(error.extensions.code).toBe('BAD_USER_INPUT');
        }
      }
    });
  });

  describe('updateRole mutation', () => {
    it('updates role with roles.update permission', async () => {
      const test_role: any = await Role.create({
        name: 'UpdateableRole',
        permissions: { 'leads.read': true },
      });
      const context = mock_context(admin_user, admin_role) as any as ApolloContext;

      const result = await roleResolvers.Mutation.updateRole(
        null,
        {
          id: test_role._id.toString(),
          input: {
            name: 'Updated Role',
            permissions: [
              { key: 'leads.read', value: true },
              { key: 'leads.create', value: true },
              { key: 'leads.delete', value: false },
            ],
          },
        },
        context
      );

      expect(result.name).toBe('Updated Role');
      expect(result.permissions['leads.create']).toBe(true);
    });

    it('throws FORBIDDEN without roles.update permission', async () => {
      const test_role: any = await Role.create({
        name: 'ProtectedRole',
        permissions: { 'leads.read': true },
      });

      const no_perm_role = await Role.create({
        name: 'NoUpdateRole',
        permissions: { 'roles.read': true },
      });
      const no_perm_user = await User.create({
        name: 'No Update Role',
        email: 'noupdaterole@example.com',
        password: 'Password123',
        role_ids: [no_perm_role._id],
        is_active: true,
      });

      const context = mock_context(no_perm_user, no_perm_role) as any as ApolloContext;

      await expect(
        roleResolvers.Mutation.updateRole(
          null,
          {
            id: test_role._id.toString(),
            input: {
              permissions: [{ key: '*', value: true }],
            },
          },
          context
        )
      ).rejects.toThrow();
    });

    it('throws on non-existent role', async () => {
      const context = mock_context(admin_user, admin_role) as any as ApolloContext;
      const fake_id = '000000000000000000000000';

      await expect(
        roleResolvers.Mutation.updateRole(
          null,
          {
            id: fake_id,
            input: { name: 'Ghost Role' },
          },
          context
        )
      ).rejects.toThrow();
    });
  });

  describe('deleteRole mutation', () => {
    it('deletes role with roles.delete permission', async () => {
      const test_role: any = await Role.create({
        name: 'DeletableRole',
        permissions: { 'leads.read': true },
      });
      const context = mock_context(admin_user, admin_role) as any as ApolloContext;

      const result = await roleResolvers.Mutation.deleteRole(
        null,
        { id: test_role._id.toString() },
        context
      );

      expect(result).toBe(true);

      const deleted = await Role.findById(test_role._id);
      expect(deleted).toBeNull();
    });

    it('throws FORBIDDEN without roles.delete permission', async () => {
      const test_role: any = await Role.create({
        name: 'ProtectedDeleteRole',
        permissions: { 'leads.read': true },
      });

      const no_perm_role = await Role.create({
        name: 'NoDeleteRole',
        permissions: { 'roles.read': true },
      });
      const no_perm_user = await User.create({
        name: 'No Delete Role',
        email: 'nodeleterole@example.com',
        password: 'Password123',
        role_ids: [no_perm_role._id],
        is_active: true,
      });

      const context = mock_context(no_perm_user, no_perm_role) as any as ApolloContext;

      await expect(
        roleResolvers.Mutation.deleteRole(
          null,
          { id: test_role._id.toString() },
          context
        )
      ).rejects.toThrow();
    });

    it('throws when role has assigned users', async () => {
      const test_role: any = await Role.create({
        name: 'AssignedRole',
        permissions: { 'leads.read': true },
      });

      // Create a user assigned to this role
      await User.create({
        name: 'Assigned User',
        email: 'assigneduser@example.com',
        password: 'Password123',
        role_ids: [test_role._id],
        is_active: true,
      });

      const context = mock_context(admin_user, admin_role) as any as ApolloContext;

      await expect(
        roleResolvers.Mutation.deleteRole(
          null,
          { id: test_role._id.toString() },
          context
        )
      ).rejects.toThrow();

      try {
        await roleResolvers.Mutation.deleteRole(
          null,
          { id: test_role._id.toString() },
          context
        );
      } catch (error) {
        if (error instanceof GraphQLError) {
          expect(error.message).toContain('Cannot delete role');
          expect(error.extensions.code).toBe('BAD_USER_INPUT');
        }
      }
    });
  });
});
