import Deal from '../../models/Deal';
import User from '../../models/User';
import Customer from '../../models/Customer';
import { ApolloContext } from '../context';

export default {
  Query: {
    deals: async (_: any, __: any, context: ApolloContext) => {
      if (!context.user || !context.role || (context.role.name !== 'Admin' && context.role.name !== 'Sales')) {
        throw new Error('Unauthorized: You are not authorized to perform this action.');
      }
      return await Deal.find().populate('customer_id').populate('owner_id');
    },
    deal: async (_: any, { id }: any, context: ApolloContext) => {
      if (!context.user || !context.role || (context.role.name !== 'Admin' && context.role.name !== 'Sales')) {
        throw new Error('Unauthorized: You are not authorized to perform this action.');
      }
      return await Deal.findById(id).populate('customer_id').populate('owner_id');
    },
    dealsByOwner: async (_: any, { owner_id }: any, context: ApolloContext) => {
      if (!context.user || !context.role || (context.role.name !== 'Admin' && context.role.name !== 'Sales')) {
        throw new Error('Unauthorized: You are not authorized to perform this action.');
      }
      return await Deal.find({ owner_id }).populate('customer_id').populate('owner_id');
    },
  },

  Mutation: {
    createDeal: async (_: any, { input }: any, context: ApolloContext) => {
      if (!context.user || !context.role || (context.role.name !== 'Admin' && context.role.name !== 'Sales')) {
        throw new Error('Unauthorized: You are not authorized to perform this action.');
      }
      const { title, customer_id, owner_id, value, status = 'Open', stage } = input;

      const customer = await Customer.findById(customer_id);
      if (!customer) throw new Error('Customer not found');

      const owner = await User.findById(owner_id);
      if (!owner) throw new Error('Deal owner not found');

      const deal = new Deal({
        title,
        customer_id,
        owner_id,
        value,
        status,
        stage,
      });

      await deal.save();
      return deal;
    },

    updateDeal: async (_: any, { id, input }: any, context: ApolloContext) => {
      if (!context.user || !context.role || (context.role.name !== 'Admin' && context.role.name !== 'Sales')) {
        throw new Error('Unauthorized: You are not authorized to perform this action.');
      }
      const deal = await Deal.findById(id);
      if (!deal) throw new Error('Deal not found');

      if (input.customer_id) {
        const customer = await Customer.findById(input.customer_id);
        if (!customer) throw new Error('Customer not found');
      }

      if (input.owner_id) {
        const owner = await User.findById(input.owner_id);
        if (!owner) throw new Error('Owner not found');
      }

      Object.assign(deal, input);
      await deal.save();
      return deal;
    },

    deleteDeal: async (_: any, { id }: any, context: ApolloContext) => {
      if (!context.user || !context.role || (context.role.name !== 'Admin' && context.role.name !== 'Sales')) {
        throw new Error('Unauthorized: You are not authorized to perform this action.');
      }
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
