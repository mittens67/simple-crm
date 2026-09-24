import { ApolloContext } from '../context';
import { deal_service } from '../../services/deal';
import { load_by_ref } from '../loaders';
import { IDeal } from '../../models/deal';

export default {
  Query: {
    deals: (
      _: unknown,
      args: { search?: string; limit?: number; offset?: number },
      context: ApolloContext
    ) => deal_service.list(context, args),

    deal: (_: unknown, { id }: { id: string }, context: ApolloContext) =>
      deal_service.get(context, id),

    dealsByOwner: (_: unknown, { owner_id }: { owner_id: string }, context: ApolloContext) =>
      deal_service.list_by_owner(context, owner_id),
  },

  Mutation: {
    createDeal: (_: unknown, { input }: { input: unknown }, context: ApolloContext) =>
      deal_service.create(context, input),

    updateDeal: (_: unknown, { id, input }: { id: string; input: unknown }, context: ApolloContext) =>
      deal_service.update(context, id, input),

    deleteDeal: (_: unknown, { id }: { id: string }, context: ApolloContext) =>
      deal_service.remove(context, id),
  },

  Deal: {
    // Batched via DataLoader. Previously each of these re-queried per row,
    // on top of a .populate() that had already fetched the same documents.
    customer: (deal: IDeal, _: unknown, context: ApolloContext) =>
      load_by_ref(context.loaders.customer, deal.customer_id),

    owner: (deal: IDeal, _: unknown, context: ApolloContext) =>
      load_by_ref(context.loaders.user, deal.owner_id),
  },
};
