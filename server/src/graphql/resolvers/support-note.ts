import { ApolloContext } from '../context';
import { support_note_service } from '../../services/support';
import { load_by_ref } from '../loaders';
import { ISupportNote } from '../../models/support-note';

export default {
  Query: {
    supportNotes: (
      _: unknown,
      { customer_id }: { customer_id: string },
      context: ApolloContext
    ) => support_note_service.list_for_customer(context, customer_id),

    supportNote: (_: unknown, { id }: { id: string }, context: ApolloContext) =>
      support_note_service.get(context, id),
  },

  Mutation: {
    createSupportNote: (_: unknown, { input }: { input: unknown }, context: ApolloContext) =>
      support_note_service.create(context, input),

    updateSupportNote: (
      _: unknown,
      { id, input }: { id: string; input: unknown },
      context: ApolloContext
    ) => support_note_service.update(context, id, input),

    deleteSupportNote: (_: unknown, { id }: { id: string }, context: ApolloContext) =>
      support_note_service.remove(context, id),
  },

  SupportNote: {
    customer: (note: ISupportNote, _: unknown, context: ApolloContext) =>
      load_by_ref(context.loaders.customer, note.customer_id),

    author: (note: ISupportNote, _: unknown, context: ApolloContext) =>
      load_by_ref(context.loaders.user, note.author_id),
  },
};
