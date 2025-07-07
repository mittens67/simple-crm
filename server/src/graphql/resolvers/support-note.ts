import SupportNote from "../../models/SupportNote";
import Customer from "../../models/Customer";
import User from "../../models/User";
import { Types } from "mongoose";
import { ApolloContext } from '../context';

export default {
  Query: {
    supportNotes: async (_: any, { customer_id }: { customer_id: string }, context: ApolloContext) => {
      if (!context.user || !context.role || (context.role.name !== 'Admin' && context.role.name !== 'Support')) {
        throw new Error('Unauthorized: You are not authorized to perform this action.');
      }
      return await SupportNote.find({
        customer_id: new Types.ObjectId(customer_id),
      })
        .sort({ created_at: -1 })
        .populate("customer_id")
        .populate("author_id");
    },
    supportNote: async (_: any, { id }: { id: string }, context: ApolloContext) => {
      if (!context.user || !context.role || (context.role.name !== 'Admin' && context.role.name !== 'Support')) {
        throw new Error('Unauthorized: You are not authorized to perform this action.');
      }
      return await SupportNote.findById(id)
        .populate("customer_id")
        .populate("author_id");
    },
  },

  Mutation: {
    createSupportNote: async (_: any, { input }: any, context: ApolloContext) => {
      if (!context.user || !context.role || (context.role.name !== 'Admin' && context.role.name !== 'Support')) {
        throw new Error('Unauthorized: You are not authorized to perform this action.');
      }
      const { customer_id, author_id, content } = input;

      const customer = await Customer.findById(customer_id);
      if (!customer) {
        throw new Error("Customer not found");
      }

      const author = await User.findById(author_id);
      if (!author) {
        throw new Error("Author (support agent) not found");
      }

      const note = new SupportNote({
        customer_id: new Types.ObjectId(customer_id),
        author_id: new Types.ObjectId(author_id),
        content,
      });

      await note.save();
      return note;
    },
    updateSupportNote: async (_: any, { id, input }: any, context: ApolloContext) => {
      if (!context.user || !context.role || (context.role.name !== 'Admin' && context.role.name !== 'Support')) {
        throw new Error('Unauthorized: You are not authorized to perform this action.');
      }
      const note = await SupportNote.findById(id);
      if (!note) throw new Error("Support note not found");

      note.content = input.content;
      await note.save();
      return note;
    },

    deleteSupportNote: async (_: any, { id }: any, context: ApolloContext) => {
      if (!context.user || !context.role || (context.role.name !== 'Admin' && context.role.name !== 'Support')) {
        throw new Error('Unauthorized: You are not authorized to perform this action.');
      }
      const deleted = await SupportNote.findByIdAndDelete(id);
      if (!deleted)
        throw new Error("Support note not found or already deleted");
      return true;
    },
  },

  SupportNote: {
    customer: async (note: any) => await Customer.findById(note.customer_id),
    author: async (note: any) => await User.findById(note.author_id),
  },
};
