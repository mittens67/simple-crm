import { describe, it, expect, beforeAll, beforeEach } from 'vitest';
import { GraphQLError } from 'graphql';
import bcrypt from 'bcryptjs';
import User from '../../models/user';
import Role from '../../models/role';
import Customer from '../../models/customer';
import { mock_context } from '../helpers/context';
import type { ApolloContext } from '../../graphql/context';
import customerResolvers from '../../graphql/resolvers/customer';

let sales_role: any;
let admin_role: any;
let test_user: any;
let test_admin: any;

beforeAll(async () => {
  // Create roles
  sales_role = await Role.create({
    name: 'Sales',
    permissions: {
      'customers.read': true,
      'customers.create': true,
      'customers.update': true,
    },
  });

  admin_role = await Role.create({
    name: 'Admin',
    permissions: { '*': true },
  });

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

beforeEach(async () => {
  await Customer.deleteMany({});
});

describe('Customer Resolver', () => {
  describe('customers query', () => {
    it('returns customers with customers.read permission', async () => {
      await Customer.create({ name: 'Acme Corp', email: 'contact@acme.com', phone: '555-0001' });
      const context = mock_context(test_user, sales_role) as any as ApolloContext;

      const result = await customerResolvers.Query.customers(null, {}, context);
      expect(result).toHaveLength(1);
      expect(result[0].name).toBe('Acme Corp');
    });

    it('throws FORBIDDEN without customers.read permission', async () => {
      const no_perm_role = await Role.create({
        name: 'NoCustomers',
        permissions: { 'leads.read': true },
      });
      const no_perm_user = await User.create({
        name: 'Limited User',
        email: 'limited@example.com',
        password: 'Password123',
        role_ids: [no_perm_role._id],
        is_active: true,
      });

      const context = mock_context(no_perm_user, no_perm_role) as any as ApolloContext;

      await expect(customerResolvers.Query.customers(null, {}, context)).rejects.toThrow();
      try {
        await customerResolvers.Query.customers(null, {}, context);
      } catch (error) {
        if (error instanceof GraphQLError) {
          expect(error.extensions.code).toBe('FORBIDDEN');
        }
      }
    });
  });

  describe('customer query', () => {
    it('returns customer by id', async () => {
      const customer: any = await Customer.create({
        name: 'Test Corp',
        email: 'test@corp.com',
        phone: '555-1234',
      });
      const context = mock_context(test_user, sales_role) as any as ApolloContext;

      const result = await customerResolvers.Query.customer(null, { id: customer._id.toString() }, context);
      expect(result?.name).toBe('Test Corp');
    });
  });

  describe('createCustomer mutation', () => {
    it('creates customer with customers.create permission', async () => {
      const context = mock_context(test_user, sales_role) as any as ApolloContext;

      const result = await customerResolvers.Mutation.createCustomer(
        null,
        {
          input: {
            name: 'New Customer',
            email: 'new@customer.com',
            phone: '555-9999',
          },
        },
        context
      );

      expect(result.name).toBe('New Customer');
      expect(result.email).toBe('new@customer.com');
    });

    it('throws FORBIDDEN without customers.create permission', async () => {
      const no_perm_role = await Role.create({
        name: 'ReadOnly',
        permissions: { 'customers.read': true },
      });
      const no_perm_user = await User.create({
        name: 'ReadOnly User',
        email: 'readonly@example.com',
        password: 'Password123',
        role_ids: [no_perm_role._id],
        is_active: true,
      });

      const context = mock_context(no_perm_user, no_perm_role) as any as ApolloContext;

      await expect(
        customerResolvers.Mutation.createCustomer(
          null,
          { input: { name: 'Hacked', email: 'hacked@example.com', phone: '555-0000' } },
          context
        )
      ).rejects.toThrow();

      try {
        await customerResolvers.Mutation.createCustomer(
          null,
          { input: { name: 'Hacked', email: 'hacked@example.com', phone: '555-0000' } },
          context
        );
      } catch (error) {
        if (error instanceof GraphQLError) {
          expect(error.extensions.code).toBe('FORBIDDEN');
        }
      }
    });

    it('creates customer with assigned sales rep', async () => {
      const context = mock_context(test_user, sales_role) as any as ApolloContext;

      const result = await customerResolvers.Mutation.createCustomer(
        null,
        {
          input: {
            name: 'Rep Customer',
            email: 'rep@customer.com',
            phone: '555-1111',
            assigned_rep_id: test_user._id.toString(),
          },
        },
        context
      );

      expect(result.assigned_rep_id).toEqual(test_user._id);
    });

    it('throws on invalid assigned_rep_id', async () => {
      const context = mock_context(test_user, sales_role) as any as ApolloContext;
      const fake_id = '000000000000000000000000';

      await expect(
        customerResolvers.Mutation.createCustomer(
          null,
          {
            input: {
              name: 'Bad Rep Customer',
              email: 'badrep@customer.com',
              phone: '555-2222',
              assigned_rep_id: fake_id,
            },
          },
          context
        )
      ).rejects.toThrow();
    });
  });

  describe('updateCustomer mutation', () => {
    it('updates customer with customers.update permission', async () => {
      const customer: any = await Customer.create({
        name: 'Original Name',
        email: 'original@test.com',
        phone: '555-0000',
      });
      const context = mock_context(test_user, sales_role) as any as ApolloContext;

      const result = await customerResolvers.Mutation.updateCustomer(
        null,
        {
          id: customer._id.toString(),
          input: { name: 'Updated Name' },
        },
        context
      );

      expect(result.name).toBe('Updated Name');
    });

    it('throws FORBIDDEN without customers.update permission', async () => {
      const customer: any = await Customer.create({
        name: 'Protected Customer',
        email: 'protected@test.com',
        phone: '555-5555',
      });

      const no_perm_role = await Role.create({
        name: 'ReadOnlyRole',
        permissions: { 'customers.read': true },
      });
      const no_perm_user = await User.create({
        name: 'ReadOnly',
        email: 'readonly2@example.com',
        password: 'Password123',
        role_ids: [no_perm_role._id],
        is_active: true,
      });

      const context = mock_context(no_perm_user, no_perm_role) as any as ApolloContext;

      await expect(
        customerResolvers.Mutation.updateCustomer(
          null,
          {
            id: customer._id.toString(),
            input: { name: 'Hacked' },
          },
          context
        )
      ).rejects.toThrow();
    });

    it('throws on non-existent customer', async () => {
      const context = mock_context(test_user, sales_role) as any as ApolloContext;
      const fake_id = '000000000000000000000000';

      await expect(
        customerResolvers.Mutation.updateCustomer(
          null,
          { id: fake_id, input: { name: 'Ghost' } },
          context
        )
      ).rejects.toThrow();
    });
  });

  describe('deleteCustomer mutation', () => {
    it('deletes customer with customers.delete permission', async () => {
      const customer: any = await Customer.create({
        name: 'To Delete',
        email: 'delete@test.com',
        phone: '555-7777',
      });
      const admin_role_full = await Role.create({
        name: 'AdminFull',
        permissions: { '*': true },
      });
      const admin_user = await User.create({
        name: 'Admin',
        email: 'admin2@example.com',
        password: 'Password123',
        role_ids: [admin_role_full._id],
        is_active: true,
      });

      const context = mock_context(admin_user, admin_role_full) as any as ApolloContext;

      const result = await customerResolvers.Mutation.deleteCustomer(
        null,
        { id: customer._id.toString() },
        context
      );

      expect(result).toBe(true);

      const deleted = await Customer.findById(customer._id);
      expect(deleted).toBeNull();
    });

    it('throws FORBIDDEN without customers.delete permission', async () => {
      const customer: any = await Customer.create({
        name: 'Protected Delete',
        email: 'protecteddelete@test.com',
        phone: '555-8888',
      });

      const context = mock_context(test_user, sales_role) as any as ApolloContext;

      await expect(
        customerResolvers.Mutation.deleteCustomer(
          null,
          { id: customer._id.toString() },
          context
        )
      ).rejects.toThrow();
    });
  });
});
