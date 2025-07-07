import Customer from '../../models/Customer';
import User from '../../models/User';
import { ApolloContext } from '../context';

export default {
  Query: {
    customers: async (_: any, __: any, context: ApolloContext) => {
      if (!context.user || !context.role || (context.role.name !== 'Admin' && context.role.name !== 'Sales')) {
        throw new Error('Unauthorized: You are not authorized to perform this action.');
      }
      return await Customer.find().populate('assigned_rep_id');
    },
    customer: async (_: any, { id }: any, context: ApolloContext) => {
      if (!context.user || !context.role || (context.role.name !== 'Admin' && context.role.name !== 'Sales')) {
        throw new Error('Unauthorized: You are not authorized to perform this action.');
      }
      return await Customer.findById(id).populate('assigned_rep_id');
    },
  },

  Mutation: {
    createCustomer: async (_: any, { input }: any, context: ApolloContext) => {
      if (!context.user || !context.role || (context.role.name !== 'Admin' && context.role.name !== 'Sales')) {
        throw new Error('Unauthorized: You are not authorized to perform this action.');
      }
      const { name, email, phone, assigned_rep_id } = input;

      const rep = await User.findById(assigned_rep_id);
      if (!rep) throw new Error('Assigned sales rep not found');

      const customer = new Customer({
        name,
        email,
        phone,
        assigned_rep_id,
      });

      await customer.save();
      return customer;
    },

    updateCustomer: async (_: any, { id, input }: any, context: ApolloContext) => {
      if (!context.user || !context.role || (context.role.name !== 'Admin' && context.role.name !== 'Sales')) {
        throw new Error('Unauthorized: You are not authorized to perform this action.');
      }
      const customer = await Customer.findById(id);
      if (!customer) throw new Error('Customer not found');

      if (input.assigned_rep_id) {
        const repExists = await User.findById(input.assigned_rep_id);
        if (!repExists) throw new Error('Assigned sales rep not found');
      }

      Object.assign(customer, input);
      await customer.save();
      return customer;
    },

    deleteCustomer: async (_: any, { id }: any, context: ApolloContext) => {
      if (!context.user || !context.role || (context.role.name !== 'Admin' && context.role.name !== 'Sales')) {
        throw new Error('Unauthorized: You are not authorized to perform this action.');
      }
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
