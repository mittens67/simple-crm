import SupportTicket from "../../models/SupportTicket";
import Customer from "../../models/Customer";
import User from "../../models/User";
import { Types } from "mongoose";
import { ApolloContext } from '../context';

export default {
  Query: {
    supportTickets: async (_: any, __: any, context: ApolloContext) => {
      if (!context.user || !context.role || (context.role.name !== 'Admin' && context.role.name !== 'Support')) {
        throw new Error('Unauthorized: You are not authorized to perform this action.');
      }
      return await SupportTicket.find()
        .populate("customer_id")
        .populate("assigned_agent");
    },
    supportTicket: async (_: any, { id }: { id: string }, context: ApolloContext) => {
      if (!context.user || !context.role || (context.role.name !== 'Admin' && context.role.name !== 'Support')) {
        throw new Error('Unauthorized: You are not authorized to perform this action.');
      }
      return await SupportTicket.findById(id)
        .populate("customer_id")
        .populate("assigned_agent");
    },
  },
  Mutation: {
    createSupportTicket: async (_: any, { input }: any, context: ApolloContext) => {
      if (!context.user || !context.role || (context.role.name !== 'Admin' && context.role.name !== 'Support')) {
        throw new Error('Unauthorized: You are not authorized to perform this action.');
      }
      const {
        customer_id,
        assigned_agent,
        issue_summary,
        status = "Open",
        internal_notes,
      } = input;

      const customerExists = await Customer.findById(customer_id);
      if (!customerExists) {
        throw new Error("Customer not found");
      }

      const agentExists = await User.findById(assigned_agent);
      if (!agentExists) {
        throw new Error("Assigned agent not found");
      }

      const ticket = new SupportTicket({
        customer_id: new Types.ObjectId(customer_id),
        assigned_agent: new Types.ObjectId(assigned_agent),
        issue_summary,
        status,
        internal_notes,
      });

      await ticket.save();
      return ticket;
    },

    updateSupportTicket: async (_: any, { id, input }: any, context: ApolloContext) => {
      if (!context.user || !context.role || (context.role.name !== 'Admin' && context.role.name !== 'Support')) {
        throw new Error('Unauthorized: You are not authorized to perform this action.');
      }
      const ticket = await SupportTicket.findById(id);
      if (!ticket) {
        throw new Error("Support ticket not found");
      }

      if (input.status) ticket.status = input.status;
      if (input.internal_notes !== undefined)
        ticket.internal_notes = input.internal_notes;

      await ticket.save();
      return ticket;
    },
    deleteSupportTicket: async (_: any, { id }: { id: string }, context: ApolloContext) => {
      if (!context.user || !context.role || (context.role.name !== 'Admin' && context.role.name !== 'Support')) {
        throw new Error('Unauthorized: You are not authorized to perform this action.');
      }
      const deleted = await SupportTicket.findByIdAndDelete(id);
      if (!deleted) {
        throw new Error("Support ticket not found or already deleted");
      }
      return true;
    },
  },
  SupportTicket: {
    customer: async (ticket: any) =>
      await Customer.findById(ticket.customer_id),
    assigned_agent: async (ticket: any) =>
      await User.findById(ticket.assigned_agent),
  },
};
