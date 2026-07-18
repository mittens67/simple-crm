import { GraphQLError } from 'graphql';
import Lead from '../../models/lead';
import User from '../../models/user';
import ActivityLog from '../../models/activity-log';
import { Types } from 'mongoose';
import { ApolloContext } from '../context';
import { require_permission } from '../../auth/authorize';

export default {
  Query: {
    leads: async (_: any, __: any, context: ApolloContext) => {
      require_permission(context, 'leads.read');
      return await Lead.find().populate('assigned_rep_id');
    },
    lead: async (_: any, { id }: { id: string }, context: ApolloContext) => {
      require_permission(context, 'leads.read');
      const lead = await Lead.findById(id).populate('assigned_rep_id');
      if (!lead) {
        throw new GraphQLError('Lead not found');
      }
      return lead;
    },
  },
  Mutation: {
    createLead: async (_: any, { input }: any, context: ApolloContext) => {
      const actor = require_permission(context, 'leads.create');
      const { name, email, phone, status = 'New', assigned_rep_id } = input;

      const user_exists = await User.findById(assigned_rep_id);
      if (!user_exists) {
        throw new GraphQLError('Assigned representative not found', {
          extensions: { code: 'BAD_USER_INPUT' },
        });
      }

      const lead = new Lead({
        name,
        email,
        phone,
        status,
        assigned_rep_id: new Types.ObjectId(assigned_rep_id),
      });

      await lead.save();

      await ActivityLog.create({
        user_id: actor._id,
        action: 'Lead created',
        metadata: { leadId: lead._id },
      });

      return lead;
    },

    updateLead: async (_: any, { id, input }: any, context: ApolloContext) => {
      const actor = require_permission(context, 'leads.update');

      if (input.assigned_rep_id) {
        const user_exists = await User.findById(input.assigned_rep_id);
        if (!user_exists) {
          throw new GraphQLError('Assigned representative not found', {
            extensions: { code: 'BAD_USER_INPUT' },
          });
        }
      }

      const updated_lead = await Lead.findByIdAndUpdate(id, { ...input }, {
        new: true,
      });

      if (!updated_lead) {
        throw new GraphQLError('Lead not found');
      }

      await ActivityLog.create({
        user_id: actor._id,
        action: 'Lead updated',
        metadata: { leadId: updated_lead._id },
      });

      return updated_lead;
    },

    deleteLead: async (_: any, { id }: { id: string }, context: ApolloContext) => {
      const actor = require_permission(context, 'leads.delete');

      const lead = await Lead.findById(id);
      if (!lead) {
        throw new GraphQLError('Lead not found');
      }

      // Soft delete: mark the lead as deleted via status
      lead.status = 'Deleted';
      await lead.save();

      await ActivityLog.create({
        user_id: actor._id,
        action: 'Lead soft deleted',
        metadata: { leadId: lead._id },
      });

      return lead;
    },
  },
  Lead: {
    assigned_rep: async (lead: any) => {
      return await User.findById(lead.assigned_rep_id);
    },
  },
};
