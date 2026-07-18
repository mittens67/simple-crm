import { GraphQLError } from 'graphql';
import SupportTicket from '../../models/support-ticket';
import Customer from '../../models/customer';
import User from '../../models/user';
import { Types } from 'mongoose';
import { ApolloContext } from '../context';
import { require_permission } from '../../auth/authorize';

export default {
  Query: {
    supportTickets: async (_: any, __: any, context: ApolloContext) => {
      require_permission(context, 'support_tickets.read');
      return await SupportTicket.find()
        .populate('customer_id')
        .populate('assigned_agent');
    },
    supportTicket: async (_: any, { id }: { id: string }, context: ApolloContext) => {
      require_permission(context, 'support_tickets.read');
      return await SupportTicket.findById(id)
        .populate('customer_id')
        .populate('assigned_agent');
    },
  },
  Mutation: {
    createSupportTicket: async (_: any, { input }: any, context: ApolloContext) => {
      require_permission(context, 'support_tickets.create');
      const {
        customer_id,
        assigned_agent,
        issue_summary,
        status = 'Open',
        internal_notes,
      } = input;

      const customer_exists = await Customer.findById(customer_id);
      if (!customer_exists) {
        throw new GraphQLError('Customer not found', {
          extensions: { code: 'BAD_USER_INPUT' },
        });
      }

      if (assigned_agent) {
        const agent_exists = await User.findById(assigned_agent);
        if (!agent_exists) {
          throw new GraphQLError('Assigned agent not found', {
            extensions: { code: 'BAD_USER_INPUT' },
          });
        }
      }

      const ticket = new SupportTicket({
        customer_id: new Types.ObjectId(customer_id),
        ...(assigned_agent && { assigned_agent: new Types.ObjectId(assigned_agent) }),
        issue_summary,
        status,
        internal_notes,
      });

      await ticket.save();
      return ticket;
    },

    updateSupportTicket: async (_: any, { id, input }: any, context: ApolloContext) => {
      require_permission(context, 'support_tickets.update');

      const ticket = await SupportTicket.findById(id);
      if (!ticket) {
        throw new GraphQLError('Support ticket not found');
      }

      if (input.assigned_agent) {
        const agent_exists = await User.findById(input.assigned_agent);
        if (!agent_exists) {
          throw new GraphQLError('Assigned agent not found', {
            extensions: { code: 'BAD_USER_INPUT' },
          });
        }
        ticket.assigned_agent = new Types.ObjectId(input.assigned_agent);
      }

      if (input.status) ticket.status = input.status;
      if (input.internal_notes !== undefined)
        ticket.internal_notes = input.internal_notes;

      await ticket.save();
      return ticket;
    },

    deleteSupportTicket: async (_: any, { id }: { id: string }, context: ApolloContext) => {
      require_permission(context, 'support_tickets.delete');
      const deleted = await SupportTicket.findByIdAndDelete(id);
      if (!deleted) {
        throw new GraphQLError('Support ticket not found or already deleted');
      }
      return true;
    },
  },
  SupportTicket: {
    customer: async (ticket: any) => await Customer.findById(ticket.customer_id),
    assigned_agent: async (ticket: any) => await User.findById(ticket.assigned_agent),
  },
};
