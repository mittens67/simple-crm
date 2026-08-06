import { GraphQLError } from 'graphql';
import User from '../models/user';
import Customer from '../models/customer';
import ActivityLog from '../models/activity-log';
import { lead_repository } from '../repositories/lead';
import { ApolloContext } from '../graphql/context';
import { require_permission } from '../auth/authorize';

export class LeadService {
  async getLeads(context: ApolloContext) {
    require_permission(context, 'leads.read');
    return await lead_repository.findAll();
  }

  async getLead(id: string, context: ApolloContext) {
    require_permission(context, 'leads.read');
    const lead = await lead_repository.findById(id);
    if (!lead) {
      throw new GraphQLError('Lead not found', {
        extensions: { code: 'NOT_FOUND' },
      });
    }
    return lead;
  }

  async createLead(
    input: {
      name: string;
      email: string;
      phone: string;
      status?: string;
      assigned_rep_id?: string;
    },
    context: ApolloContext
  ) {
    const actor = require_permission(context, 'leads.create');

    if (input.assigned_rep_id) {
      const user_exists = await User.findById(input.assigned_rep_id);
      if (!user_exists) {
        throw new GraphQLError('Assigned representative not found', {
          extensions: { code: 'BAD_USER_INPUT' },
        });
      }
    }

    const lead = await lead_repository.create(input);

    await ActivityLog.create({
      user_id: actor._id,
      action: 'Lead created',
      metadata: { leadId: lead._id },
    });

    return lead;
  }

  async updateLead(
    id: string,
    input: Partial<{
      name: string;
      email: string;
      phone: string;
      status: 'Open' | 'Pending' | 'Archived' | 'Converted';
      assigned_rep_id: string;
      sales_notes: string;
      archive_notes: string;
      customer_id: any;
    }>,
    context: ApolloContext
  ) {
    const actor = require_permission(context, 'leads.update');

    const lead = await lead_repository.findById(id);
    if (!lead) {
      throw new GraphQLError('Lead not found', {
        extensions: { code: 'NOT_FOUND' },
      });
    }

    if (input.assigned_rep_id) {
      const user_exists = await User.findById(input.assigned_rep_id);
      if (!user_exists) {
        throw new GraphQLError('Assigned representative not found', {
          extensions: { code: 'BAD_USER_INPUT' },
        });
      }
    }

    // Auto-create customer when lead is converted
    if (input.status === 'Converted' && lead.status !== 'Converted') {
      const customer = new Customer({
        name: lead.name,
        email: lead.email,
        phone: lead.phone,
        ...(lead.assigned_rep_id && { assigned_rep_id: lead.assigned_rep_id }),
      });
      await customer.save();

      input.customer_id = customer._id as any;
    }

    const updated_lead = await lead_repository.update(id, input as any);
    if (!updated_lead) {
      throw new GraphQLError('Lead not found', {
        extensions: { code: 'NOT_FOUND' },
      });
    }

    await ActivityLog.create({
      user_id: actor._id,
      action: 'Lead updated',
      metadata: { leadId: updated_lead._id },
    });

    return updated_lead;
  }

  async deleteLead(id: string, context: ApolloContext) {
    const actor = require_permission(context, 'leads.delete');

    const lead = await lead_repository.findById(id);
    if (!lead) {
      throw new GraphQLError('Lead not found', {
        extensions: { code: 'NOT_FOUND' },
      });
    }

    // Soft delete: mark the lead as archived
    const archived_lead = await lead_repository.update(id, { status: 'Archived' });

    await ActivityLog.create({
      user_id: actor._id,
      action: 'Lead soft deleted',
      metadata: { leadId: lead._id },
    });

    return archived_lead;
  }
}

export const lead_service = new LeadService();
