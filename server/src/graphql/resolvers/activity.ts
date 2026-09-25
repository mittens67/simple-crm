import { ApolloContext } from '../context';
import { activity_service, is_overdue } from '../../services/activity';
import { load_by_ref, load_activity_target } from '../loaders';
import { IActivity, ActivityTarget } from '../../models/activity';

export default {
  Query: {
    activities: (
      _: unknown,
      args: { target_type: ActivityTarget; target_id: string; limit?: number; offset?: number },
      context: ApolloContext
    ) => activity_service.list_for_target(context, args),

    tasks: (
      _: unknown,
      args: { owner_id?: string; include_completed?: boolean; limit?: number; offset?: number },
      context: ApolloContext
    ) => activity_service.list_tasks(context, args),

    activity: (_: unknown, { id }: { id: string }, context: ApolloContext) =>
      activity_service.get(context, id),
  },

  Mutation: {
    createActivity: (_: unknown, { input }: { input: unknown }, context: ApolloContext) =>
      activity_service.create(context, input),

    updateActivity: (
      _: unknown,
      { id, input }: { id: string; input: unknown },
      context: ApolloContext
    ) => activity_service.update(context, id, input),

    completeActivity: (_: unknown, { id }: { id: string }, context: ApolloContext) =>
      activity_service.set_completed(context, id, true),

    reopenActivity: (_: unknown, { id }: { id: string }, context: ApolloContext) =>
      activity_service.set_completed(context, id, false),

    deleteActivity: (_: unknown, { id }: { id: string }, context: ApolloContext) =>
      activity_service.remove(context, id),
  },

  Activity: {
    owner: (activity: IActivity, _: unknown, context: ApolloContext) =>
      load_by_ref(context.loaders.user, activity.owner_id),

    target: (activity: IActivity, _: unknown, context: ApolloContext) =>
      load_activity_target(context.loaders, activity.target_type, activity.target_id),

    is_overdue: (activity: IActivity) => is_overdue(activity),
  },

  ActivityTarget: {
    /**
     * The union member is decided by the activity's own target_type rather
     * than by sniffing the document's shape, which would be ambiguous — a Lead
     * and a Customer carry the same name/email/phone fields.
     */
    __resolveType: (target: { constructor?: { modelName?: string } }) =>
      target?.constructor?.modelName ?? null,
  },
};
