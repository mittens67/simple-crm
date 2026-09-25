import { ApolloContext } from '../context';
import { deal_service, days_between, weighted_value } from '../../services/deal';
import { load_by_ref } from '../loaders';
import { IDeal } from '../../models/deal';
import { IPipeline } from '../../models/pipeline';

/** Resolves the deal's pipeline through the loader, so stage lookups batch. */
const pipeline_for = (deal: IDeal, context: ApolloContext) =>
  load_by_ref<IPipeline>(context.loaders.pipeline, deal.pipeline_id);

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

    pipelineBoard: (
      _: unknown,
      { pipeline_id }: { pipeline_id?: string },
      context: ApolloContext
    ) => deal_service.board(context, pipeline_id),
  },

  Mutation: {
    createDeal: (_: unknown, { input }: { input: unknown }, context: ApolloContext) =>
      deal_service.create(context, input),

    updateDeal: (_: unknown, { id, input }: { id: string; input: unknown }, context: ApolloContext) =>
      deal_service.update(context, id, input),

    moveDealToStage: (
      _: unknown,
      { id, stage_id }: { id: string; stage_id: string },
      context: ApolloContext
    ) => deal_service.move_to_stage(context, id, stage_id),

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

    pipeline: (deal: IDeal, _: unknown, context: ApolloContext) => pipeline_for(deal, context),

    stage: async (deal: IDeal, _: unknown, context: ApolloContext) => {
      const pipeline = await pipeline_for(deal, context);
      return pipeline?.stages.id(deal.stage_id) ?? null;
    },

    weighted_value: async (deal: IDeal, _: unknown, context: ApolloContext) =>
      weighted_value(deal, await pipeline_for(deal, context)),

    days_in_stage: (deal: IDeal) => days_between(deal.stage_entered_at, new Date()),
  },

  PipelineBoardColumn: {
    // Board columns carry their stage subdocument directly.
    stage: (column: { stage: unknown }) => column.stage,
  },
};
