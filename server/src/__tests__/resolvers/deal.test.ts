import { describe, it, expect, beforeAll, beforeEach } from 'vitest';
import { GraphQLError } from 'graphql';
import bcrypt from 'bcryptjs';
import User from '../../models/user';
import Role from '../../models/role';
import Customer from '../../models/customer';
import Deal from '../../models/deal';
import { mock_context } from '../helpers/context';
import type { ApolloContext } from '../../graphql/context';
import dealResolvers from '../../graphql/resolvers/deal';

let sales_role: any;
let admin_role: any;
let test_user: any;
let test_customer: any;

beforeAll(async () => {
  sales_role = await Role.create({
    name: 'Sales',
    permissions: {
      'deals.read': true,
      'deals.create': true,
      'deals.update': true,
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

  test_customer = await Customer.create({
    name: 'Test Customer',
    email: 'customer@test.com',
    phone: '555-0000',
  });
});

beforeEach(async () => {
  await Deal.deleteMany({});
});

describe('Deal Resolver', () => {
  describe('deals query', () => {
    it('returns all deals with deals.read permission', async () => {
      await Deal.create({
        title: 'Deal 1',
        customer_id: test_customer._id,
        owner_id: test_user._id,
        value: 10000,
        status: 'Open',
        stage: 'Qualification',
      });
      const context = mock_context(test_user, sales_role) as any as ApolloContext;

      const result = await dealResolvers.Query.deals(null, {}, context);
      expect(result).toHaveLength(1);
      expect(result[0].title).toBe('Deal 1');
    });

    it('throws FORBIDDEN without deals.read permission', async () => {
      const no_perm_role = await Role.create({
        name: 'NoDeals',
        permissions: { 'customers.read': true },
      });
      const no_perm_user = await User.create({
        name: 'NoDealsUser',
        email: 'nodeals@example.com',
        password: 'Password123',
        role_ids: [no_perm_role._id],
        is_active: true,
      });

      const context = mock_context(no_perm_user, no_perm_role) as any as ApolloContext;

      await expect(dealResolvers.Query.deals(null, {}, context)).rejects.toThrow();
      try {
        await dealResolvers.Query.deals(null, {}, context);
      } catch (error) {
        if (error instanceof GraphQLError) {
          expect(error.extensions.code).toBe('FORBIDDEN');
        }
      }
    });
  });

  describe('deal query', () => {
    it('returns deal by id', async () => {
      const deal = await Deal.create({
        title: 'Single Deal',
        customer_id: test_customer._id,
        owner_id: test_user._id,
        value: 5000,
        status: 'Open',
        stage: 'Proposal',
      });
      const context = mock_context(test_user, sales_role) as any as ApolloContext;

      const result = await dealResolvers.Query.deal(null, { id: deal._id.toString() }, context);
      expect(result?.title).toBe('Single Deal');
    });
  });

  describe('dealsByOwner query', () => {
    it('returns deals for specific owner', async () => {
      await Deal.create({
        title: 'Owner Deal 1',
        customer_id: test_customer._id,
        owner_id: test_user._id,
        value: 15000,
        status: 'Open',
        stage: 'Needs Analysis',
      });
      await Deal.create({
        title: 'Owner Deal 2',
        customer_id: test_customer._id,
        owner_id: test_user._id,
        value: 20000,
        status: 'Open',
        stage: 'Proposal',
      });

      const context = mock_context(test_user, sales_role) as any as ApolloContext;

      const result = await dealResolvers.Query.dealsByOwner(
        null,
        { owner_id: test_user._id.toString() },
        context
      );
      expect(result).toHaveLength(2);
    });
  });

  describe('createDeal mutation', () => {
    it('creates deal with deals.create permission', async () => {
      const context = mock_context(test_user, sales_role) as any as ApolloContext;

      const result = await dealResolvers.Mutation.createDeal(
        null,
        {
          input: {
            title: 'New Deal',
            customer_id: test_customer._id.toString(),
            owner_id: test_user._id.toString(),
            value: 25000,
            stage: 'Qualification',
          },
        },
        context
      );

      expect(result.title).toBe('New Deal');
      expect(result.value).toBe(25000);
      expect(result.status).toBe('Open'); // Default status
    });

    it('creates deal with owner_id', async () => {
      const context = mock_context(test_user, sales_role) as any as ApolloContext;

      const result = await dealResolvers.Mutation.createDeal(
        null,
        {
          input: {
            title: 'Owned Deal',
            customer_id: test_customer._id.toString(),
            owner_id: test_user._id.toString(),
            value: 30000,
            stage: 'Proposal',
          },
        },
        context
      );

      expect(result.owner_id).toEqual(test_user._id);
    });

    it('throws FORBIDDEN without deals.create permission', async () => {
      const no_perm_role = await Role.create({
        name: 'ReadOnlyDeals',
        permissions: { 'deals.read': true },
      });
      const no_perm_user = await User.create({
        name: 'ReadOnlyDeals',
        email: 'readonlydeals@example.com',
        password: 'Password123',
        role_ids: [no_perm_role._id],
        is_active: true,
      });

      const context = mock_context(no_perm_user, no_perm_role) as any as ApolloContext;

      await expect(
        dealResolvers.Mutation.createDeal(
          null,
          {
            input: {
              title: 'Hacked Deal',
              customer_id: test_customer._id.toString(),
              value: 999999,
              stage: 'Hacked',
            },
          },
          context
        )
      ).rejects.toThrow();
    });

    it('throws on non-existent customer', async () => {
      const context = mock_context(test_user, sales_role) as any as ApolloContext;
      const fake_id = '000000000000000000000000';

      await expect(
        dealResolvers.Mutation.createDeal(
          null,
          {
            input: {
              title: 'Bad Deal',
              customer_id: fake_id,
              value: 10000,
              stage: 'Qualification',
            },
          },
          context
        )
      ).rejects.toThrow();
    });

    it('throws on non-existent owner_id', async () => {
      const context = mock_context(test_user, sales_role) as any as ApolloContext;
      const fake_id = '000000000000000000000000';

      await expect(
        dealResolvers.Mutation.createDeal(
          null,
          {
            input: {
              title: 'Bad Owner Deal',
              customer_id: test_customer._id.toString(),
              owner_id: fake_id,
              value: 10000,
              stage: 'Qualification',
            },
          },
          context
        )
      ).rejects.toThrow();
    });
  });

  describe('updateDeal mutation', () => {
    it('updates deal with deals.update permission', async () => {
      const deal = await Deal.create({
        title: 'Original Deal',
        customer_id: test_customer._id,
        owner_id: test_user._id,
        value: 10000,
        status: 'Open',
        stage: 'Qualification',
      });
      const context = mock_context(test_user, sales_role) as any as ApolloContext;

      const result = await dealResolvers.Mutation.updateDeal(
        null,
        {
          id: deal._id.toString(),
          input: { title: 'Updated Deal', value: 15000 },
        },
        context
      );

      expect(result.title).toBe('Updated Deal');
      expect(result.value).toBe(15000);
    });

    it('throws FORBIDDEN without deals.update permission', async () => {
      const deal = await Deal.create({
        title: 'Protected Deal',
        customer_id: test_customer._id,
        owner_id: test_user._id,
        value: 10000,
        status: 'Open',
        stage: 'Qualification',
      });

      const no_perm_role = await Role.create({
        name: 'ReadOnlyDeals2',
        permissions: { 'deals.read': true },
      });
      const no_perm_user = await User.create({
        name: 'ReadOnlyDeals2',
        email: 'readonlydeals2@example.com',
        password: 'Password123',
        role_ids: [no_perm_role._id],
        is_active: true,
      });

      const context = mock_context(no_perm_user, no_perm_role) as any as ApolloContext;

      await expect(
        dealResolvers.Mutation.updateDeal(
          null,
          {
            id: deal._id.toString(),
            input: { title: 'Hacked Deal' },
          },
          context
        )
      ).rejects.toThrow();
    });

    it('throws on non-existent customer_id during update', async () => {
      const deal = await Deal.create({
        title: 'Deal',
        customer_id: test_customer._id,
        owner_id: test_user._id,
        value: 10000,
        status: 'Open',
        stage: 'Qualification',
      });
      const context = mock_context(test_user, sales_role) as any as ApolloContext;
      const fake_id = '000000000000000000000000';

      await expect(
        dealResolvers.Mutation.updateDeal(
          null,
          {
            id: deal._id.toString(),
            input: { customer_id: fake_id },
          },
          context
        )
      ).rejects.toThrow();
    });
  });

  describe('deleteDeal mutation', () => {
    it('deletes deal with deals.delete permission', async () => {
      const deal = await Deal.create({
        title: 'To Delete',
        customer_id: test_customer._id,
        owner_id: test_user._id,
        value: 10000,
        status: 'Open',
        stage: 'Qualification',
      });
      const admin_role_full = await Role.create({
        name: 'AdminFull',
        permissions: { '*': true },
      });
      const admin_user = await User.create({
        name: 'Admin',
        email: 'admin3@example.com',
        password: 'Password123',
        role_ids: [admin_role_full._id],
        is_active: true,
      });

      const context = mock_context(admin_user, admin_role_full) as any as ApolloContext;

      const result = await dealResolvers.Mutation.deleteDeal(
        null,
        { id: deal._id.toString() },
        context
      );

      expect(result).toBe(true);

      const deleted = await Deal.findById(deal._id);
      expect(deleted).toBeNull();
    });

    it('throws FORBIDDEN without deals.delete permission', async () => {
      const deal = await Deal.create({
        title: 'Protected Delete',
        customer_id: test_customer._id,
        owner_id: test_user._id,
        value: 10000,
        status: 'Open',
        stage: 'Qualification',
      });

      const context = mock_context(test_user, sales_role) as any as ApolloContext;

      await expect(
        dealResolvers.Mutation.deleteDeal(
          null,
          { id: deal._id.toString() },
          context
        )
      ).rejects.toThrow();
    });
  });
});
