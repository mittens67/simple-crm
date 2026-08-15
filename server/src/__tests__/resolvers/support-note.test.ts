import { describe, it, expect, beforeAll, beforeEach } from 'vitest';
import { GraphQLError } from 'graphql';
import bcrypt from 'bcryptjs';
import User from '../../models/user';
import Role from '../../models/role';
import Customer from '../../models/customer';
import SupportNote from '../../models/support-note';
import { mock_context } from '../helpers/context';
import type { ApolloContext } from '../../graphql/context';
import supportNoteResolvers from '../../graphql/resolvers/support-note';

let support_role: any;
let admin_role: any;
let test_user: any;
let test_admin: any;
let test_customer: any;
let test_customer_2: any;

beforeAll(async () => {
  support_role = await Role.create({
    name: 'Support',
    permissions: {
      'support_notes.read': true,
      'support_notes.create': true,
      'support_notes.update': true,
      'support_notes.delete': true,
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

  test_customer = await Customer.create({
    name: 'Test Customer 1',
    email: 'customer1@example.com',
    phone: '555-1234',
  });

  test_customer_2 = await Customer.create({
    name: 'Test Customer 2',
    email: 'customer2@example.com',
    phone: '555-5678',
  });
});

beforeEach(async () => {
  await SupportNote.deleteMany({});
});

describe('Support Note Resolver', () => {
  describe('supportNotes query', () => {
    it('returns notes for a customer with support_notes.read permission', async () => {
      await SupportNote.create({
        customer_id: test_customer._id,
        author_id: test_user._id,
        content: 'Note 1',
      });
      await SupportNote.create({
        customer_id: test_customer._id,
        author_id: test_user._id,
        content: 'Note 2',
      });
      await SupportNote.create({
        customer_id: test_customer_2._id,
        author_id: test_user._id,
        content: 'Note for other customer',
      });

      const context = mock_context(test_user, support_role) as any as ApolloContext;
      const result = await supportNoteResolvers.Query.supportNotes(null, {
        customer_id: test_customer._id.toString(),
      }, context);

      expect(result).toHaveLength(2);
      expect(result[0].content).toBe('Note 2'); // Most recent first due to sort
      expect(result[1].content).toBe('Note 1');
    });

    it('filters notes by customer_id correctly', async () => {
      await SupportNote.create({
        customer_id: test_customer._id,
        author_id: test_user._id,
        content: 'For customer 1',
      });
      await SupportNote.create({
        customer_id: test_customer_2._id,
        author_id: test_user._id,
        content: 'For customer 2',
      });

      const context = mock_context(test_user, support_role) as any as ApolloContext;
      const result = await supportNoteResolvers.Query.supportNotes(null, {
        customer_id: test_customer_2._id.toString(),
      }, context);

      expect(result).toHaveLength(1);
      expect(result[0].content).toBe('For customer 2');
    });

    it('throws FORBIDDEN without support_notes.read permission', async () => {
      const no_perm_role = await Role.create({
        name: 'NoNotes',
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
        supportNoteResolvers.Query.supportNotes(null, { customer_id: test_customer._id.toString() }, context)
      ).rejects.toThrow();
    });
  });

  describe('supportNote query', () => {
    it('returns note by id', async () => {
      const note = await SupportNote.create({
        customer_id: test_customer._id,
        author_id: test_user._id,
        content: 'Specific note',
      });

      const context = mock_context(test_user, support_role) as any as ApolloContext;
      const result = await supportNoteResolvers.Query.supportNote(null, { id: note._id.toString() }, context);

      expect(result).toBeDefined();
      expect(result.content).toBe('Specific note');
    });

    it('returns null for nonexistent note', async () => {
      const context = mock_context(test_user, support_role) as any as ApolloContext;
      const result = await supportNoteResolvers.Query.supportNote(null, { id: '000000000000000000000000' }, context);
      expect(result).toBeNull();
    });

    it('throws FORBIDDEN without support_notes.read permission', async () => {
      const note = await SupportNote.create({
        customer_id: test_customer._id,
        author_id: test_user._id,
        content: 'Test',
      });

      const no_perm_role = await Role.create({
        name: 'NoNotesRead',
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
        supportNoteResolvers.Query.supportNote(null, { id: note._id.toString() }, context)
      ).rejects.toThrow();
    });
  });

  describe('createSupportNote mutation', () => {
    it('creates note and self-attributes author_id to authenticated user', async () => {
      const context = mock_context(test_user, support_role) as any as ApolloContext;

      const result = await supportNoteResolvers.Mutation.createSupportNote(null, {
        input: {
          customer_id: test_customer._id.toString(),
          content: 'New note from test_user',
        },
      }, context);

      expect(result).toBeDefined();
      expect(result.content).toBe('New note from test_user');
      expect(result.author_id.toString()).toBe(test_user._id.toString());
    });

    it('self-attributes author_id even if different user_id is in input', async () => {
      const context = mock_context(test_user, support_role) as any as ApolloContext;

      const result = await supportNoteResolvers.Mutation.createSupportNote(null, {
        input: {
          customer_id: test_customer._id.toString(),
          content: 'Note with different author attempt',
          author_id: test_admin._id.toString(), // Should be ignored
        },
      }, context);

      expect(result.author_id.toString()).toBe(test_user._id.toString());
    });

    it('throws BAD_USER_INPUT for nonexistent customer', async () => {
      const context = mock_context(test_user, support_role) as any as ApolloContext;

      await expect(
        supportNoteResolvers.Mutation.createSupportNote(null, {
          input: {
            customer_id: '000000000000000000000000',
            content: 'Bad customer',
          },
        }, context)
      ).rejects.toThrow();

      try {
        await supportNoteResolvers.Mutation.createSupportNote(null, {
          input: {
            customer_id: '000000000000000000000000',
            content: 'Bad customer',
          },
        }, context);
      } catch (error) {
        if (error instanceof GraphQLError) {
          expect(error.extensions.code).toBe('BAD_USER_INPUT');
        }
      }
    });

    it('throws FORBIDDEN without support_notes.create permission', async () => {
      const no_perm_role = await Role.create({
        name: 'NoNotesCreate',
        permissions: { 'support_notes.read': true },
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
        supportNoteResolvers.Mutation.createSupportNote(null, {
          input: {
            customer_id: test_customer._id.toString(),
            content: 'Unauthorized',
          },
        }, context)
      ).rejects.toThrow();
    });
  });

  describe('updateSupportNote mutation', () => {
    it('updates note with support_notes.update permission', async () => {
      const note = await SupportNote.create({
        customer_id: test_customer._id,
        author_id: test_user._id,
        content: 'Original content',
      });

      const context = mock_context(test_user, support_role) as any as ApolloContext;
      const result = await supportNoteResolvers.Mutation.updateSupportNote(null, {
        id: note._id.toString(),
        input: {
          content: 'Updated content',
        },
      }, context);

      expect(result.content).toBe('Updated content');
      expect(result.author_id.toString()).toBe(test_user._id.toString());
    });

    it('throws error for nonexistent note', async () => {
      const context = mock_context(test_user, support_role) as any as ApolloContext;

      await expect(
        supportNoteResolvers.Mutation.updateSupportNote(null, {
          id: '000000000000000000000000',
          input: { content: 'New' },
        }, context)
      ).rejects.toThrow();
    });

    it('throws FORBIDDEN without support_notes.update permission', async () => {
      const note = await SupportNote.create({
        customer_id: test_customer._id,
        author_id: test_user._id,
        content: 'To update',
      });

      const no_perm_role = await Role.create({
        name: 'NoNotesUpdate',
        permissions: { 'support_notes.read': true },
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
        supportNoteResolvers.Mutation.updateSupportNote(null, {
          id: note._id.toString(),
          input: { content: 'Updated' },
        }, context)
      ).rejects.toThrow();
    });
  });

  describe('deleteSupportNote mutation', () => {
    it('deletes note with support_notes.delete permission', async () => {
      const note = await SupportNote.create({
        customer_id: test_customer._id,
        author_id: test_user._id,
        content: 'To delete',
      });

      const context = mock_context(test_user, support_role) as any as ApolloContext;
      const result = await supportNoteResolvers.Mutation.deleteSupportNote(null, {
        id: note._id.toString(),
      }, context);

      expect(result).toBe(true);

      const deleted = await SupportNote.findById(note._id);
      expect(deleted).toBeNull();
    });

    it('throws error for nonexistent note', async () => {
      const context = mock_context(test_user, support_role) as any as ApolloContext;

      await expect(
        supportNoteResolvers.Mutation.deleteSupportNote(null, {
          id: '000000000000000000000000',
        }, context)
      ).rejects.toThrow();
    });

    it('throws FORBIDDEN without support_notes.delete permission', async () => {
      const note = await SupportNote.create({
        customer_id: test_customer._id,
        author_id: test_user._id,
        content: 'To delete',
      });

      const no_perm_role = await Role.create({
        name: 'NoNotesDelete',
        permissions: { 'support_notes.read': true },
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
        supportNoteResolvers.Mutation.deleteSupportNote(null, {
          id: note._id.toString(),
        }, context)
      ).rejects.toThrow();
    });
  });

  describe('field resolvers', () => {
    it('SupportNote.customer resolves customer', async () => {
      const note = await SupportNote.create({
        customer_id: test_customer._id,
        author_id: test_user._id,
        content: 'Test',
      });

      const result = await supportNoteResolvers.SupportNote.customer(note);
      expect(result).toBeDefined();
      expect(result.name).toBe('Test Customer 1');
    });

    it('SupportNote.author resolves user', async () => {
      const note = await SupportNote.create({
        customer_id: test_customer._id,
        author_id: test_user._id,
        content: 'Test',
      });

      const result = await supportNoteResolvers.SupportNote.author(note);
      expect(result).toBeDefined();
      expect(result.name).toBe('Support User');
    });
  });
});
