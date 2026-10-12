import { ApolloContext } from '../context';
import { pipeline_service } from '../../services/pipeline';
import { IStage } from '../../models/pipeline';

export default {
  Query: {
    pipelines: (_: unknown, __: unknown, context: ApolloContext) => pipeline_service.list(context),

    pipeline: (_: unknown, { id }: { id: string }, context: ApolloContext) =>
      pipeline_service.get(context, id),

    defaultPipeline: (_: unknown, __: unknown, context: ApolloContext) =>
      pipeline_service.get_default(context),
  },

  Mutation: {
    createPipeline: (_: unknown, { input }: { input: unknown }, context: ApolloContext) =>
      pipeline_service.create(context, input),

    updatePipeline: (
      _: unknown,
      { id, input }: { id: string; input: unknown },
      context: ApolloContext
    ) => pipeline_service.update(context, id, input),

    deletePipeline: (_: unknown, { id }: { id: string }, context: ApolloContext) =>
      pipeline_service.remove(context, id),
  },

  Pipeline: {
    // Stages are stored as an unordered subdocument array; the API always
    // presents them in pipeline order.
    stages: (pipeline: { stages: IStage[] }) =>
      [...pipeline.stages].sort((a, b) => a.display_order - b.display_order),
  },

  Stage: {
    id: (stage: IStage) => String(stage._id),
  },
};
