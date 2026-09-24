import { Types } from 'mongoose';
import Customer from '../models/customer';
import User from '../models/user';
import { ISupportTicket } from '../models/support-ticket';
import { ISupportNote } from '../models/support-note';
import { support_ticket_repository, support_note_repository } from '../repositories/support';
import { ApolloContext } from '../graphql/context';
import { require_permission } from '../auth/authorize';
import {
  create_ticket_schema,
  update_ticket_schema,
  create_note_schema,
  update_note_schema,
} from '../schemas/support';
import { Page } from '../core/base-repository';
import { scope_filter_for } from '../core/scoping';
import { assert_exists, assert_found, audit, parse_or_throw, pick_fields } from '../core/service-helpers';

const TICKET_UPDATABLE = [
  'customer_id',
  'assigned_agent',
  'issue_summary',
  'status',
  'internal_notes',
] as const;

export class SupportTicketService {
  private scope(context: ApolloContext, action: 'read' | 'update' | 'delete' = 'read') {
    // Agents work their own queue; `.all` sees the whole queue.
    return scope_filter_for(context, 'support_tickets', 'assigned_agent', action);
  }

  async list(
    context: ApolloContext,
    args: { search?: string; limit?: number; offset?: number }
  ): Promise<Page<ISupportTicket>> {
    require_permission(context, 'support_tickets.read');
    return support_ticket_repository.find_page({ ...args, filter: this.scope(context) });
  }

  async get(context: ApolloContext, id: string): Promise<ISupportTicket> {
    require_permission(context, 'support_tickets.read');
    return assert_found(
      await support_ticket_repository.find_by_id(id, this.scope(context)),
      'Support ticket'
    );
  }

  async create(context: ApolloContext, input: unknown): Promise<ISupportTicket> {
    const actor = require_permission(context, 'support_tickets.create');
    const data = parse_or_throw(create_ticket_schema, input);

    await assert_exists(Customer, data.customer_id, 'Customer');
    await assert_exists(User, data.assigned_agent, 'Assigned agent');

    const ticket = await support_ticket_repository.create({
      customer_id: new Types.ObjectId(data.customer_id),
      assigned_agent: new Types.ObjectId(data.assigned_agent),
      issue_summary: data.issue_summary,
      status: data.status,
      internal_notes: data.internal_notes,
    });

    await audit(actor, 'Support ticket created', { ticket_id: String(ticket._id) });
    return ticket;
  }

  async update(context: ApolloContext, id: string, input: unknown): Promise<ISupportTicket> {
    const actor = require_permission(context, 'support_tickets.update');
    const data = parse_or_throw(update_ticket_schema, input);

    const existing = assert_found(
      await support_ticket_repository.find_by_id(id, this.scope(context, 'update')),
      'Support ticket'
    );

    await assert_exists(Customer, data.customer_id, 'Customer');
    await assert_exists(User, data.assigned_agent, 'Assigned agent');

    const updated = assert_found(
      await support_ticket_repository.update(id, pick_fields(data, TICKET_UPDATABLE)),
      'Support ticket'
    );

    await audit(actor, 'Support ticket updated', {
      ticket_id: String(updated._id),
      ...(data.status && data.status !== existing.status && {
        status_from: existing.status,
        status_to: data.status,
      }),
    });
    return updated;
  }

  async remove(context: ApolloContext, id: string): Promise<boolean> {
    const actor = require_permission(context, 'support_tickets.delete');

    assert_found(
      await support_ticket_repository.find_by_id(id, this.scope(context, 'delete')),
      'Support ticket'
    );
    const deleted = await support_ticket_repository.delete(id);

    await audit(actor, 'Support ticket deleted', { ticket_id: id });
    return deleted;
  }
}

export class SupportNoteService {
  async list_for_customer(context: ApolloContext, customer_id: string): Promise<ISupportNote[]> {
    require_permission(context, 'support_notes.read');
    return support_note_repository.find_all({ customer_id: new Types.ObjectId(customer_id) });
  }

  async get(context: ApolloContext, id: string): Promise<ISupportNote> {
    require_permission(context, 'support_notes.read');
    return assert_found(await support_note_repository.find_by_id(id), 'Support note');
  }

  async create(context: ApolloContext, input: unknown): Promise<ISupportNote> {
    const actor = require_permission(context, 'support_notes.create');
    const data = parse_or_throw(create_note_schema, input);

    await assert_exists(Customer, data.customer_id, 'Customer');

    const note = await support_note_repository.create({
      customer_id: new Types.ObjectId(data.customer_id),
      // The author is always the acting user, never client-supplied.
      author_id: actor._id as Types.ObjectId,
      content: data.content,
    });

    await audit(actor, 'Support note created', { note_id: String(note._id) });
    return note;
  }

  async update(context: ApolloContext, id: string, input: unknown): Promise<ISupportNote> {
    const actor = require_permission(context, 'support_notes.update');
    const data = parse_or_throw(update_note_schema, input);

    const note = assert_found(await support_note_repository.find_by_id(id), 'Support note');

    // Notes are attributable statements, so only their author may edit them
    // unless the caller holds the wider scope.
    const is_author = String(note.author_id) === String(actor._id);
    if (!is_author) {
      require_permission(context, 'support_notes.update.all');
    }

    const updated = assert_found(
      await support_note_repository.update(id, { content: data.content }),
      'Support note'
    );

    await audit(actor, 'Support note updated', { note_id: String(updated._id) });
    return updated;
  }

  async remove(context: ApolloContext, id: string): Promise<boolean> {
    const actor = require_permission(context, 'support_notes.delete');

    const note = assert_found(await support_note_repository.find_by_id(id), 'Support note');
    if (String(note.author_id) !== String(actor._id)) {
      require_permission(context, 'support_notes.delete.all');
    }

    const deleted = await support_note_repository.delete(id);
    await audit(actor, 'Support note deleted', { note_id: id });
    return deleted;
  }
}

export const support_ticket_service = new SupportTicketService();
export const support_note_service = new SupportNoteService();
