import { ApolloContext } from '../context';
import { lead_service } from '../../services/lead';
import { load_by_ref } from '../loaders';
import { ILead } from '../../models/lead';

/**
 * Resolvers stay thin adapters: translate arguments, delegate, return.
 *
 * Errors no longer need wrapping here — Apollo's `formatError` maps the shared
 * AppError hierarchy for every resolver in the schema (see index.ts), which is
 * what utils/resolver-wrapper.ts used to do for leads alone.
 */
export default {
  Query: {
    leads: (
      _: unknown,
      args: { search?: string; limit?: number; offset?: number },
      context: ApolloContext
    ) => lead_service.list(context, args),

    lead: (_: unknown, { id }: { id: string }, context: ApolloContext) =>
      lead_service.get(context, id),
  },

  Mutation: {
    createLead: (_: unknown, { input }: { input: unknown }, context: ApolloContext) =>
      lead_service.create(context, input),

    updateLead: (
      _: unknown,
      { id, input }: { id: string; input: unknown },
      context: ApolloContext
    ) => lead_service.update(context, id, input),

    deleteLead: (_: unknown, { id }: { id: string }, context: ApolloContext) =>
      lead_service.archive(context, id),
  },

  Lead: {
    assigned_rep: (lead: ILead, _: unknown, context: ApolloContext) =>
      load_by_ref(context.loaders.user, lead.assigned_rep_id),

    customer: (lead: ILead, _: unknown, context: ApolloContext) =>
      load_by_ref(context.loaders.customer, lead.customer_id),
  },
};
