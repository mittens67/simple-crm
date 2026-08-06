import User from '../../models/user';
import Customer from '../../models/customer';
import { ApolloContext } from '../context';
import { lead_service } from '../../services/lead';

export default {
  Query: {
    leads: async (_: any, __: any, context: ApolloContext) => {
      return await lead_service.getLeads(context);
    },
    lead: async (_: any, { id }: { id: string }, context: ApolloContext) => {
      return await lead_service.getLead(id, context);
    },
  },
  Mutation: {
    createLead: async (_: any, { input }: any, context: ApolloContext) => {
      return await lead_service.createLead(input, context);
    },

    updateLead: async (_: any, { id, input }: any, context: ApolloContext) => {
      return await lead_service.updateLead(id, input, context);
    },

    deleteLead: async (_: any, { id }: { id: string }, context: ApolloContext) => {
      return await lead_service.deleteLead(id, context);
    },
  },
  Lead: {
    assigned_rep: async (lead: any) => {
      return await User.findById(lead.assigned_rep_id);
    },
    customer: async (lead: any) => {
      return await Customer.findById(lead.customer_id);
    },
  },
};
