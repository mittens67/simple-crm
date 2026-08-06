import User from '../models/user';
import Customer from '../models/customer';
import ActivityLog from '../models/activity-log';
import { lead_repository } from '../repositories/lead';
import { ApolloContext } from '../graphql/context';
import { require_permission } from '../auth/authorize';
import { create_lead_schema, update_lead_schema } from '../schemas/lead';
import { ValidationError, NotFoundError } from '../utils/errors';

export class LeadService {
  async getLeads(context: ApolloContext) {
    require_permission(context, 'leads.read');
    return await lead_repository.findAll();
  }

  async getLead(id: string, context: ApolloContext) {
    require_permission(context, 'leads.read');
    const lead = await lead_repository.findById(id);
    if (!lead) {
      throw new NotFoundError('Lead not found');
    }
    return lead;
  }

  async createLead(
    input: any,
    context: ApolloContext
  ) {
    const actor = require_permission(context, 'leads.create');

    // Validate input
    const validation = create_lead_schema.safeParse(input);
    if (!validation.success) {
      const errors = validation.error.issues.map(issue => issue.message).join(', ');
      throw new ValidationError(errors);
    }

    const validated_input = validation.data;

    if (validated_input.assigned_rep_id) {
      const user_exists = await User.findById(validated_input.assigned_rep_id);
      if (!user_exists) {
        throw new NotFoundError('Assigned representative not found');
      }
      (validated_input as any).status = 'Pending';
    }

    const lead = await lead_repository.create(validated_input);

    await ActivityLog.create({
      user_id: actor._id,
      action: 'Lead created',
      metadata: { leadId: lead._id },
    });

    return lead;
  }

  async updateLead(
    id: string,
    input: any,
    context: ApolloContext
  ) {
    const actor = require_permission(context, 'leads.update');

    // Validate input
    const validation = update_lead_schema.safeParse(input);
    if (!validation.success) {
      const errors = validation.error.issues.map(issue => issue.message).join(', ');
      throw new ValidationError(errors);
    }

    const validated_input = validation.data;

    const lead = await lead_repository.findById(id);
    if (!lead) {
      throw new NotFoundError('Lead not found');
    }

    if (validated_input.assigned_rep_id) {
      const user_exists = await User.findById(validated_input.assigned_rep_id);
      if (!user_exists) {
        throw new NotFoundError('Assigned representative not found');
      }
      // Auto-set to Pending when assigning a rep
      validated_input.status = 'Pending';
    } else if ('assigned_rep_id' in input && !input.assigned_rep_id) {
      // Auto-set to Open when removing assigned rep
      validated_input.status = 'Open';
    }

    // Auto-create customer when lead is converted
    if (validated_input.status === 'Converted' && lead.status !== 'Converted') {
      const customer = new Customer({
        name: lead.name,
        email: lead.email,
        phone: lead.phone,
        ...(lead.assigned_rep_id && { assigned_rep_id: lead.assigned_rep_id }),
      });
      await customer.save();

      validated_input.customer_id = customer._id as any;
    }

    const updated_lead = await lead_repository.update(id, validated_input as any);
    if (!updated_lead) {
      throw new NotFoundError('Lead not found');
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
      throw new NotFoundError('Lead not found');
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
