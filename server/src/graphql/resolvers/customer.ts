import { GraphQLError } from 'graphql';
import Customer from '../../models/customer';
import User from '../../models/user';
import { ApolloContext } from '../context';
import { require_permission } from '../../auth/authorize';

export default {
  Query: {
    customers: async (_: any, __: any, context: ApolloContext) => {
      require_permission(context, 'customers.read');
      return await Customer.find().populate('assigned_rep_id');
    },
    customer: async (_: any, { id }: any, context: ApolloContext) => {
      require_permission(context, 'customers.read');
      return await Customer.findById(id).populate('assigned_rep_id');
    },
  },

  Mutation: {
    createCustomer: async (_: any, { input }: any, context: ApolloContext) => {
      require_permission(context, 'customers.create');
      const { name, email, phone, assigned_rep_id } = input;

      const rep = await User.findById(assigned_rep_id);
      if (!rep) {
        throw new GraphQLError('Assigned sales rep not found', {
          extensions: { code: 'BAD_USER_INPUT' },
        });
      }

      const customer = new Customer({ name, email, phone, assigned_rep_id });
      await customer.save();
      return customer;
    },

    updateCustomer: async (_: any, { id, input }: any, context: ApolloContext) => {
      require_permission(context, 'customers.update');

      const customer = await Customer.findById(id);
      if (!customer) throw new GraphQLError('Customer not found');

      if (input.assigned_rep_id) {
        const rep_exists = await User.findById(input.assigned_rep_id);
        if (!rep_exists) {
          throw new GraphQLError('Assigned sales rep not found', {
            extensions: { code: 'BAD_USER_INPUT' },
          });
        }
      }

      Object.assign(customer, input);
      await customer.save();
      return customer;
    },

    deleteCustomer: async (_: any, { id }: any, context: ApolloContext) => {
      require_permission(context, 'customers.delete');
      const res = await Customer.findByIdAndDelete(id);
      return !!res;
    },
  },

  Customer: {
    assigned_rep: async (parent: any) => {
      return await User.findById(parent.assigned_rep_id);
    },
  },
};
