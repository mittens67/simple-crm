import Lead from '../../models/Lead';
import User from '../../models/User';
import ActivityLog from '../../models/ActivityLog';
import { Types } from 'mongoose';
import { ApolloContext } from '../context';

export default {
  Query: {
    leads: async (_: any, __: any, context: ApolloContext) => {
      if (!context.user || !context.role || (context.role.name !== 'Admin' && context.role.name !== 'Sales')) {
        throw new Error('Unauthorized: You are not authorized to perform this action.');
      }
      return await Lead.find().populate('assigned_rep_id');
    },
    lead: async (_: any, { id }: { id: string }, context: ApolloContext) => {
      if (!context.user || !context.role || (context.role.name !== 'Admin' && context.role.name !== 'Sales')) {
        throw new Error('Unauthorized: You are not authorized to perform this action.');
      }
      const lead = await Lead.findById(id).populate('assigned_rep_id');
      if (!lead) {
        throw new Error('Lead not found');
      }
      return lead;
    },
  },
  Mutation: {
    createLead: async (_: any, { input }: any, context: ApolloContext) => {
      if (!context.user || !context.role || (context.role.name !== 'Admin' && context.role.name !== 'Sales')) {
        throw new Error('Unauthorized: You are not authorized to perform this action.');
      }
      const {
        name,
        email,
        phone,
        status = 'New', // default to "New" if not provided
        assigned_rep_id,
      } = input;

      // Optional: Validate that the user exists
      const userExists = await User.findById(assigned_rep_id);
      if (!userExists) {
        throw new Error('Assigned representative not found');
      }

      const lead = new Lead({
        name,
        email,
        phone,
        status,
        assigned_rep_id: new Types.ObjectId(assigned_rep_id),
      });

      await lead.save();

      const activity = new ActivityLog({
        user_id: assigned_rep_id,
        action: 'Lead created',
        metadata: { leadId: lead._id, userId: assigned_rep_id },
        created_at: new Date(),
      });
      await activity.save();

      return lead;
    },
    updateLead: async (_: any, { id, input }: any, context: ApolloContext) => {
      if (!context.user || !context.role || (context.role.name !== 'Admin' && context.role.name !== 'Sales')) {
        throw new Error('Unauthorized: You are not authorized to perform this action.');
      }
      const updateData: any = { ...input };

      if (input.assigned_rep_id) {
        // Validate that the assigned representative exists
        const userExists = await User.findById(input.assigned_rep_id);
        if (!userExists) {
          throw new Error('Assigned representative not found');
        }
      }

      updateData.updated_at = new Date();

      const updatedLead = await Lead.findByIdAndUpdate(id, updateData, {
        new: true,
      });

      if (!updatedLead) {
        throw new Error('Lead not found');
      }

      // Optional: Log the activity of lead update
      const activity = new ActivityLog({
        user_id: updatedLead.assigned_rep_id,
        action: 'Lead updated',
        metadata: { leadId: updatedLead._id },
        created_at: new Date(),
      });
      await activity.save();

      return updatedLead;
    },

    deleteLead: async (_: any, { id }: { id: string }, context: ApolloContext) => {
      if (!context.user || !context.role || (context.role.name !== 'Admin' && context.role.name !== 'Sales')) {
        throw new Error('Unauthorized: You are not authorized to perform this action.');
      }
      const lead = await Lead.findById(id);

      if (!lead) {
        throw new Error('Lead not found');
      }

      // Soft delete the lead (mark as deleted by updating the status)
      lead.status = 'Deleted';
      lead.updated_at = new Date();

      await lead.save();

      // Optional: Log the activity of lead deletion
      const activity = new ActivityLog({
        user_id: lead.assigned_rep_id,
        action: 'Lead soft deleted',
        metadata: { leadId: lead._id },
        created_at: new Date(),
      });
      await activity.save();

      return lead;
    },
  },
  Lead: {
    assigned_rep: async (lead: any) => {
      return await User.findById(lead.assigned_rep_id);
    },
  },
};
