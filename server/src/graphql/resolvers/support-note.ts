import { GraphQLError } from 'graphql';
import SupportNote from '../../models/support-note';
import Customer from '../../models/customer';
import User from '../../models/user';
import { Types } from 'mongoose';
import { ApolloContext } from '../context';
import { require_permission } from '../../auth/authorize';

export default {
  Query: {
    supportNotes: async (_: any, { customer_id }: { customer_id: string }, context: ApolloContext) => {
      require_permission(context, 'support_notes.read');
      return await SupportNote.find({
        customer_id: new Types.ObjectId(customer_id),
      })
        .sort({ created_at: -1 })
        .populate('customer_id')
        .populate('author_id');
    },
    supportNote: async (_: any, { id }: { id: string }, context: ApolloContext) => {
      require_permission(context, 'support_notes.read');
      return await SupportNote.findById(id)
        .populate('customer_id')
        .populate('author_id');
    },
  },

  Mutation: {
    createSupportNote: async (_: any, { input }: any, context: ApolloContext) => {
      const actor = require_permission(context, 'support_notes.create');
      const { customer_id, content } = input;

      const customer = await Customer.findById(customer_id);
      if (!customer) {
        throw new GraphQLError('Customer not found', {
          extensions: { code: 'BAD_USER_INPUT' },
        });
      }

      // Notes are always authored by the logged-in user
      const note = new SupportNote({
        customer_id: new Types.ObjectId(customer_id),
        author_id: actor._id,
        content,
      });

      await note.save();
      return note;
    },

    updateSupportNote: async (_: any, { id, input }: any, context: ApolloContext) => {
      require_permission(context, 'support_notes.update');

      const note = await SupportNote.findById(id);
      if (!note) throw new GraphQLError('Support note not found');

      note.content = input.content;
      await note.save();
      return note;
    },

    deleteSupportNote: async (_: any, { id }: any, context: ApolloContext) => {
      require_permission(context, 'support_notes.delete');
      const deleted = await SupportNote.findByIdAndDelete(id);
      if (!deleted) {
        throw new GraphQLError('Support note not found or already deleted');
      }
      return true;
    },
  },

  SupportNote: {
    customer: async (note: any) => await Customer.findById(note.customer_id),
    author: async (note: any) => await User.findById(note.author_id),
  },
};
