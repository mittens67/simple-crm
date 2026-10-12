import { ApolloContext } from '../context';
import { customer_service } from '../../services/customer';
import { load_by_ref } from '../loaders';
import { ICustomer } from '../../models/customer';

export default {
  Query: {
    customers: (
      _: unknown,
      args: { search?: string; limit?: number; offset?: number },
      context: ApolloContext
    ) => customer_service.list(context, args),

    customer: (_: unknown, { id }: { id: string }, context: ApolloContext) =>
      customer_service.get(context, id),
  },

  Mutation: {
    createCustomer: (_: unknown, { input }: { input: unknown }, context: ApolloContext) =>
      customer_service.create(context, input),

    updateCustomer: (
      _: unknown,
      { id, input }: { id: string; input: unknown },
      context: ApolloContext
    ) => customer_service.update(context, id, input),

    deleteCustomer: (_: unknown, { id }: { id: string }, context: ApolloContext) =>
      customer_service.remove(context, id),
  },

  Customer: {
    assigned_rep: (customer: ICustomer, _: unknown, context: ApolloContext) =>
      load_by_ref(context.loaders.user, customer.assigned_rep_id),
  },
};
