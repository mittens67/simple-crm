import User from '../../models/user';
import Customer from '../../models/customer';
import { ApolloContext } from '../context';
import { lead_service } from '../../services/lead';
import { create_query_resolver, create_mutation_resolver } from '../../utils/resolver-wrapper';

const query_resolvers = create_query_resolver({
  leads: async (_: any, { search, limit, offset }: any, context: ApolloContext) => {
    return await lead_service.getLeads(context, search, limit, offset);
  },
  lead: async (_: any, { id }: { id: string }, context: ApolloContext) => {
    return await lead_service.getLead(id, context);
  },
});

const mutation_resolvers = create_mutation_resolver({
  createLead: async (_: any, { input }: any, context: ApolloContext) => {
    return await lead_service.createLead(input, context);
  },

  updateLead: async (_: any, { id, input }: any, context: ApolloContext) => {
    return await lead_service.updateLead(id, input, context);
  },

  deleteLead: async (_: any, { id }: { id: string }, context: ApolloContext) => {
    return await lead_service.deleteLead(id, context);
  },
});

export default {
  Query: query_resolvers,
  Mutation: mutation_resolvers,
  Lead: {
    assigned_rep: async (lead: any) => {
      return await User.findById(lead.assigned_rep_id);
    },
    customer: async (lead: any) => {
      return await Customer.findById(lead.customer_id);
    },
  },
};
