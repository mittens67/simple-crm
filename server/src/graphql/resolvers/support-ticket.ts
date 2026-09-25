import { ApolloContext } from '../context';
import { support_ticket_service } from '../../services/support';
import { load_by_ref } from '../loaders';
import { ISupportTicket, is_sla_breached } from '../../models/support-ticket';

export default {
  Query: {
    supportTickets: (
      _: unknown,
      args: { search?: string; limit?: number; offset?: number },
      context: ApolloContext
    ) => support_ticket_service.list(context, args),

    supportTicket: (_: unknown, { id }: { id: string }, context: ApolloContext) =>
      support_ticket_service.get(context, id),
  },

  Mutation: {
    createSupportTicket: (_: unknown, { input }: { input: unknown }, context: ApolloContext) =>
      support_ticket_service.create(context, input),

    updateSupportTicket: (
      _: unknown,
      { id, input }: { id: string; input: unknown },
      context: ApolloContext
    ) => support_ticket_service.update(context, id, input),

    deleteSupportTicket: (_: unknown, { id }: { id: string }, context: ApolloContext) =>
      support_ticket_service.remove(context, id),
  },

  SupportTicket: {
    customer: (ticket: ISupportTicket, _: unknown, context: ApolloContext) =>
      load_by_ref(context.loaders.customer, ticket.customer_id),

    assigned_agent: (ticket: ISupportTicket, _: unknown, context: ApolloContext) =>
      load_by_ref(context.loaders.user, ticket.assigned_agent),

    is_sla_breached: (ticket: ISupportTicket) => is_sla_breached(ticket),
  },
};
