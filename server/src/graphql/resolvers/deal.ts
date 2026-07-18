import { GraphQLError } from 'graphql';
import Deal from '../../models/deal';
import User from '../../models/user';
import Customer from '../../models/customer';
import { ApolloContext } from '../context';
import { require_permission } from '../../auth/authorize';

export default {
  Query: {
    deals: async (_: any, __: any, context: ApolloContext) => {
      require_permission(context, 'deals.read');
      return await Deal.find().populate('customer_id').populate('owner_id');
    },
    deal: async (_: any, { id }: any, context: ApolloContext) => {
      require_permission(context, 'deals.read');
      return await Deal.findById(id).populate('customer_id').populate('owner_id');
    },
    dealsByOwner: async (_: any, { owner_id }: any, context: ApolloContext) => {
      require_permission(context, 'deals.read');
      return await Deal.find({ owner_id }).populate('customer_id').populate('owner_id');
    },
  },

  Mutation: {
    createDeal: async (_: any, { input }: any, context: ApolloContext) => {
      require_permission(context, 'deals.create');
      const { title, customer_id, owner_id, value, status = 'Open', stage } = input;

      const customer = await Customer.findById(customer_id);
      if (!customer) {
        throw new GraphQLError('Customer not found', {
          extensions: { code: 'BAD_USER_INPUT' },
        });
      }

      if (owner_id) {
        const owner = await User.findById(owner_id);
        if (!owner) {
          throw new GraphQLError('Deal owner not found', {
            extensions: { code: 'BAD_USER_INPUT' },
          });
        }
      }

      const deal = new Deal({
        title,
        customer_id,
        ...(owner_id && { owner_id }),
        value,
        status,
        stage,
      });
      await deal.save();
      return deal;
    },

    updateDeal: async (_: any, { id, input }: any, context: ApolloContext) => {
      require_permission(context, 'deals.update');

      const deal = await Deal.findById(id);
      if (!deal) throw new GraphQLError('Deal not found');

      if (input.customer_id) {
        const customer = await Customer.findById(input.customer_id);
        if (!customer) {
          throw new GraphQLError('Customer not found', {
            extensions: { code: 'BAD_USER_INPUT' },
          });
        }
      }

      if (input.owner_id) {
        const owner = await User.findById(input.owner_id);
        if (!owner) {
          throw new GraphQLError('Owner not found', {
            extensions: { code: 'BAD_USER_INPUT' },
          });
        }
      }

      Object.assign(deal, input);
      await deal.save();
      return deal;
    },

    deleteDeal: async (_: any, { id }: any, context: ApolloContext) => {
      require_permission(context, 'deals.delete');
      const result = await Deal.findByIdAndDelete(id);
      return !!result;
    },
  },

  Deal: {
    customer: async (parent: any) => {
      return await Customer.findById(parent.customer_id);
    },
    owner: async (parent: any) => {
      return await User.findById(parent.owner_id);
    },
  },
};
