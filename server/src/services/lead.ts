import { Types } from 'mongoose';
import User from '../models/user';
import Customer from '../models/customer';
import Lead, { ILead } from '../models/lead';
import { lead_repository } from '../repositories/lead';
import { ApolloContext } from '../graphql/context';
import { require_permission } from '../auth/authorize';
import { create_lead_schema, update_lead_schema } from '../schemas/lead';
import { Page } from '../core/base-repository';
import { scope_filter_for } from '../core/scoping';
import { with_transaction } from '../core/transaction';
import {
  assert_exists,
  assert_found,
  audit,
  parse_or_throw,
  pick_fields,
} from '../core/service-helpers';

/** Fields a client may set on update. Everything else is ignored. */
const UPDATABLE_FIELDS = [
  'name',
  'email',
  'phone',
  'status',
  'assigned_rep_id',
  'sales_notes',
  'archive_notes',
] as const;

export class LeadService {
  private scope(context: ApolloContext, action: 'read' | 'update' | 'delete' = 'read') {
    // Reps see the leads assigned to them plus the unclaimed pool, so they can
    // pick up an Open lead — and so a lead they just created without choosing a
    // rep does not vanish from their own list. `leads.read.all` sees every lead.
    return scope_filter_for(context, 'leads', 'assigned_rep_id', {
      action,
      include_unassigned: true,
    });
  }

  async list(
    context: ApolloContext,
    args: { search?: string; limit?: number; offset?: number }
  ): Promise<Page<ILead>> {
    require_permission(context, 'leads.read');
    return lead_repository.find_page({ ...args, filter: this.scope(context) });
  }

  async get(context: ApolloContext, id: string): Promise<ILead> {
    require_permission(context, 'leads.read');
    return assert_found(await lead_repository.find_by_id(id, this.scope(context)), 'Lead');
  }

  async create(context: ApolloContext, input: unknown): Promise<ILead> {
    const actor = require_permission(context, 'leads.create');
    const data = parse_or_throw(create_lead_schema, input);

    await assert_exists(User, data.assigned_rep_id, 'Assigned representative');

    const { assigned_rep_id, ...rest } = data;
    const lead = await lead_repository.create({
      ...rest,
      ...(assigned_rep_id && {
        assigned_rep_id: new Types.ObjectId(assigned_rep_id),
        // Attaching a rep moves the lead out of the unclaimed pool.
        status: 'Pending' as const,
      }),
    });

    await audit(actor, 'Lead created', { lead_id: String(lead._id) });
    return lead;
  }

  async update(context: ApolloContext, id: string, input: unknown): Promise<ILead> {
    const actor = require_permission(context, 'leads.update');
    const data = parse_or_throw(update_lead_schema, input);

    const lead = assert_found(
      await lead_repository.find_by_id(id, this.scope(context, 'update')),
      'Lead'
    );

    const changes: Record<string, unknown> = pick_fields(data, UPDATABLE_FIELDS);

    // Assignment drives status: attaching a rep starts work, detaching returns
    // the lead to the unclaimed pool.
    //
    // An explicitly chosen status always wins, though. The edit form sends
    // assigned_rep_id on every save, so deriving unconditionally meant
    // converting an *unassigned* lead silently reset it to Open — the customer
    // was created and the lead stayed Open.
    const status_was_chosen = data.status !== undefined && data.status !== lead.status;

    if ('assigned_rep_id' in data) {
      if (data.assigned_rep_id) {
        await assert_exists(User, data.assigned_rep_id, 'Assigned representative');
        if (!status_was_chosen) changes.status = 'Pending';
      } else if (!status_was_chosen) {
        changes.status = 'Open';
      }
    }

    const is_converting = data.status === 'Converted' && lead.status !== 'Converted';
    if (!is_converting) {
      const updated = assert_found(await lead_repository.update(id, changes), 'Lead');
      await audit(actor, 'Lead updated', { lead_id: String(updated._id) });
      return updated;
    }

    // Conversion writes two documents. Without a transaction a failure between
    // them leaves an orphaned Customer and an unconverted Lead.
    const updated = await with_transaction(async (session) => {
      const [customer] = await Customer.create(
        [
          {
            name: lead.name,
            email: lead.email,
            phone: lead.phone,
            ...(lead.assigned_rep_id && { assigned_rep_id: lead.assigned_rep_id }),
          },
        ],
        session ? { session } : {}
      );

      const result = await Lead.findByIdAndUpdate(
        id,
        { ...changes, customer_id: customer._id },
        { new: true, runValidators: true, ...(session && { session }) }
      );
      return assert_found(result, 'Lead');
    });

    await audit(actor, 'Lead converted', {
      lead_id: String(updated._id),
      customer_id: String(updated.customer_id),
    });
    return updated;
  }

  async archive(context: ApolloContext, id: string): Promise<ILead> {
    const actor = require_permission(context, 'leads.delete');

    assert_found(await lead_repository.find_by_id(id, this.scope(context, 'delete')), 'Lead');

    // Soft delete: leads are archived rather than removed, so the history
    // stays auditable.
    const archived = assert_found(await lead_repository.update(id, { status: 'Archived' }), 'Lead');

    await audit(actor, 'Lead archived', { lead_id: String(archived._id) });
    return archived;
  }
}

export const lead_service = new LeadService();
