import { describe, it, expect, beforeAll, beforeEach } from 'vitest';
import { GraphQLError } from 'graphql';
import bcrypt from 'bcryptjs';
import User from '../../models/user';
import Role from '../../models/role';
import Customer from '../../models/customer';
import SupportTicket from '../../models/support-ticket';
import { mock_context } from '../helpers/context';
import type { ApolloContext } from '../../graphql/context';
import supportTicketResolvers from '../../graphql/resolvers/support-ticket';

let support_role: any;
let admin_role: any;
let test_user: any;
let test_admin: any;
let test_customer: any;
let test_agent: any;

beforeAll(async () => {
  support_role = await Role.create({
    name: 'Support',
    permissions: {
      'support_tickets.read': true,
      'support_tickets.create': true,
      'support_tickets.update': true,
      'support_tickets.delete': true,
    },
  });

  admin_role = await Role.create({
    name: 'Admin',
    permissions: { '*': true },
  });

  const password_hash = await bcrypt.hash('Password123', 10);

  test_user = await User.create({
    name: 'Support User',
    email: 'support@example.com',
    password: password_hash,
    role_ids: [support_role._id],
    is_active: true,
  });

  test_admin = await User.create({
    name: 'Admin User',
    email: 'admin@example.com',
    password: password_hash,
    role_ids: [admin_role._id],
    is_active: true,
  });

  test_agent = await User.create({
    name: 'Support Agent',
    email: 'agent@example.com',
    password: password_hash,
    role_ids: [support_role._id],
    is_active: true,
  });

  test_customer = await Customer.create({
    name: 'Test Customer',
    email: 'customer@example.com',
    phone: '555-1234',
  });
});

beforeEach(async () => {
  await SupportTicket.deleteMany({});
});

describe('Support Ticket Resolver', () => {
  describe('supportTickets query', () => {
    it('returns all tickets with support_tickets.read permission', async () => {
      await SupportTicket.create({
        customer_id: test_customer._id,
        assigned_agent: test_agent._id,
        issue_summary: 'Test Issue 1',
        status: 'Open',
      });
      await SupportTicket.create({
        customer_id: test_customer._id,
        assigned_agent: test_agent._id,
        issue_summary: 'Test Issue 2',
        status: 'In Progress',
      });

      const context = mock_context(test_user, support_role) as any as ApolloContext;
      const result = await supportTicketResolvers.Query.supportTickets(null, {}, context);

      expect(result).toHaveLength(2);
      expect(result[0].issue_summary).toBe('Test Issue 1');
    });

    it('throws FORBIDDEN without support_tickets.read permission', async () => {
      const no_perm_role = await Role.create({
        name: 'NoTickets',
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

      await expect(supportTicketResolvers.Query.supportTickets(null, {}, context)).rejects.toThrow();
      try {
        await supportTicketResolvers.Query.supportTickets(null, {}, context);
      } catch (error) {
        if (error instanceof GraphQLError) {
          expect(error.extensions.code).toBe('FORBIDDEN');
        }
      }
    });
  });

  describe('supportTicket query', () => {
    it('returns ticket by id', async () => {
      const ticket = await SupportTicket.create({
        customer_id: test_customer._id,
        assigned_agent: test_agent._id,
        issue_summary: 'Specific Issue',
        status: 'Resolved',
      });

      const context = mock_context(test_user, support_role) as any as ApolloContext;
      const result = await supportTicketResolvers.Query.supportTicket(null, { id: ticket._id.toString() }, context);

      expect(result).toBeDefined();
      expect(result.issue_summary).toBe('Specific Issue');
      expect(result.status).toBe('Resolved');
    });

    it('returns null for nonexistent ticket', async () => {
      const context = mock_context(test_user, support_role) as any as ApolloContext;
      const result = await supportTicketResolvers.Query.supportTicket(null, { id: '000000000000000000000000' }, context);
      expect(result).toBeNull();
    });

    it('throws FORBIDDEN without support_tickets.read permission', async () => {
      const no_perm_role = await Role.create({
        name: 'NoTicketsRead',
        permissions: { 'customers.read': true },
      });
      const no_perm_user = await User.create({
        name: 'ReadLimited',
        email: 'readlimit@example.com',
        password: 'Password123',
        role_ids: [no_perm_role._id],
        is_active: true,
      });

      const context = mock_context(no_perm_user, no_perm_role) as any as ApolloContext;

      await expect(
        supportTicketResolvers.Query.supportTicket(null, { id: '000000000000000000000000' }, context)
      ).rejects.toThrow();
    });
  });

  describe('createSupportTicket mutation', () => {
    it('creates ticket with support_tickets.create permission', async () => {
      const context = mock_context(test_user, support_role) as any as ApolloContext;

      const result = await supportTicketResolvers.Mutation.createSupportTicket(null, {
        input: {
          customer_id: test_customer._id.toString(),
          assigned_agent: test_agent._id.toString(),
          issue_summary: 'New Ticket',
          status: 'Open',
          internal_notes: 'Internal note here',
        },
      }, context);

      expect(result).toBeDefined();
      expect(result.issue_summary).toBe('New Ticket');
      expect(result.status).toBe('Open');
      expect(result.internal_notes).toBe('Internal note here');
    });

    it('sets default status to Open if not provided', async () => {
      const context = mock_context(test_user, support_role) as any as ApolloContext;

      const result = await supportTicketResolvers.Mutation.createSupportTicket(null, {
        input: {
          customer_id: test_customer._id.toString(),
          assigned_agent: test_agent._id.toString(),
          issue_summary: 'Default Status Ticket',
        },
      }, context);

      expect(result.status).toBe('Open');
    });

    it('throws BAD_USER_INPUT for nonexistent customer', async () => {
      const context = mock_context(test_user, support_role) as any as ApolloContext;

      await expect(
        supportTicketResolvers.Mutation.createSupportTicket(null, {
          input: {
            customer_id: '000000000000000000000000',
            assigned_agent: test_agent._id.toString(),
            issue_summary: 'Bad Customer',
          },
        }, context)
      ).rejects.toThrow();

      try {
        await supportTicketResolvers.Mutation.createSupportTicket(null, {
          input: {
            customer_id: '000000000000000000000000',
            assigned_agent: test_agent._id.toString(),
            issue_summary: 'Bad Customer',
          },
        }, context);
      } catch (error) {
        if (error instanceof GraphQLError) {
          expect(error.extensions.code).toBe('BAD_USER_INPUT');
        }
      }
    });

    it('throws BAD_USER_INPUT for nonexistent assigned_agent', async () => {
      const context = mock_context(test_user, support_role) as any as ApolloContext;

      await expect(
        supportTicketResolvers.Mutation.createSupportTicket(null, {
          input: {
            customer_id: test_customer._id.toString(),
            assigned_agent: '000000000000000000000000',
            issue_summary: 'Bad Agent',
          },
        }, context)
      ).rejects.toThrow();

      try {
        await supportTicketResolvers.Mutation.createSupportTicket(null, {
          input: {
            customer_id: test_customer._id.toString(),
            assigned_agent: '000000000000000000000000',
            issue_summary: 'Bad Agent',
          },
        }, context);
      } catch (error) {
        if (error instanceof GraphQLError) {
          expect(error.extensions.code).toBe('BAD_USER_INPUT');
        }
      }
    });

    it('throws FORBIDDEN without support_tickets.create permission', async () => {
      const no_perm_role = await Role.create({
        name: 'NoTicketsCreate',
        permissions: { 'support_tickets.read': true },
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
        supportTicketResolvers.Mutation.createSupportTicket(null, {
          input: {
            customer_id: test_customer._id.toString(),
            assigned_agent: test_agent._id.toString(),
            issue_summary: 'Unauthorized',
          },
        }, context)
      ).rejects.toThrow();
    });
  });

  describe('updateSupportTicket mutation', () => {
    it('updates ticket with support_tickets.update permission', async () => {
      const ticket = await SupportTicket.create({
        customer_id: test_customer._id,
        assigned_agent: test_agent._id,
        issue_summary: 'Original',
        status: 'Open',
      });

      const context = mock_context(test_user, support_role) as any as ApolloContext;
      const result = await supportTicketResolvers.Mutation.updateSupportTicket(null, {
        id: ticket._id.toString(),
        input: {
          status: 'Resolved',
          internal_notes: 'Updated notes',
        },
      }, context);

      expect(result.status).toBe('Resolved');
      expect(result.internal_notes).toBe('Updated notes');
      expect(result.issue_summary).toBe('Original');
    });

    it('throws error for nonexistent ticket', async () => {
      const context = mock_context(test_user, support_role) as any as ApolloContext;

      await expect(
        supportTicketResolvers.Mutation.updateSupportTicket(null, {
          id: '000000000000000000000000',
          input: { status: 'Closed' },
        }, context)
      ).rejects.toThrow();
    });

    it('throws FORBIDDEN without support_tickets.update permission', async () => {
      const ticket = await SupportTicket.create({
        customer_id: test_customer._id,
        assigned_agent: test_agent._id,
        issue_summary: 'To Update',
        status: 'Open',
      });

      const no_perm_role = await Role.create({
        name: 'NoTicketsUpdate',
        permissions: { 'support_tickets.read': true },
      });
      const no_perm_user = await User.create({
        name: 'UpdateLimited',
        email: 'updatelimit@example.com',
        password: 'Password123',
        role_ids: [no_perm_role._id],
        is_active: true,
      });

      const context = mock_context(no_perm_user, no_perm_role) as any as ApolloContext;

      await expect(
        supportTicketResolvers.Mutation.updateSupportTicket(null, {
          id: ticket._id.toString(),
          input: { status: 'Closed' },
        }, context)
      ).rejects.toThrow();
    });
  });

  describe('deleteSupportTicket mutation', () => {
    it('deletes ticket with support_tickets.delete permission', async () => {
      const ticket = await SupportTicket.create({
        customer_id: test_customer._id,
        assigned_agent: test_agent._id,
        issue_summary: 'To Delete',
        status: 'Open',
      });

      const context = mock_context(test_user, support_role) as any as ApolloContext;
      const result = await supportTicketResolvers.Mutation.deleteSupportTicket(null, {
        id: ticket._id.toString(),
      }, context);

      expect(result).toBe(true);

      const deleted = await SupportTicket.findById(ticket._id);
      expect(deleted).toBeNull();
    });

    it('throws error for nonexistent ticket', async () => {
      const context = mock_context(test_user, support_role) as any as ApolloContext;

      await expect(
        supportTicketResolvers.Mutation.deleteSupportTicket(null, {
          id: '000000000000000000000000',
        }, context)
      ).rejects.toThrow();
    });

    it('throws FORBIDDEN without support_tickets.delete permission', async () => {
      const ticket = await SupportTicket.create({
        customer_id: test_customer._id,
        assigned_agent: test_agent._id,
        issue_summary: 'To Delete',
        status: 'Open',
      });

      const no_perm_role = await Role.create({
        name: 'NoTicketsDelete',
        permissions: { 'support_tickets.read': true },
      });
      const no_perm_user = await User.create({
        name: 'DeleteLimited',
        email: 'deletelimit@example.com',
        password: 'Password123',
        role_ids: [no_perm_role._id],
        is_active: true,
      });

      const context = mock_context(no_perm_user, no_perm_role) as any as ApolloContext;

      await expect(
        supportTicketResolvers.Mutation.deleteSupportTicket(null, {
          id: ticket._id.toString(),
        }, context)
      ).rejects.toThrow();
    });
  });

  describe('field resolvers', () => {
    it('SupportTicket.customer resolves customer', async () => {
      const ticket = await SupportTicket.create({
        customer_id: test_customer._id,
        assigned_agent: test_agent._id,
        issue_summary: 'Test',
        status: 'Open',
      });

      const result = await supportTicketResolvers.SupportTicket.customer(ticket);
      expect(result).toBeDefined();
      expect(result.name).toBe('Test Customer');
    });

    it('SupportTicket.assigned_agent resolves user', async () => {
      const ticket = await SupportTicket.create({
        customer_id: test_customer._id,
        assigned_agent: test_agent._id,
        issue_summary: 'Test',
        status: 'Open',
      });

      const result = await supportTicketResolvers.SupportTicket.assigned_agent(ticket);
      expect(result).toBeDefined();
      expect(result.name).toBe('Support Agent');
    });
  });
});
