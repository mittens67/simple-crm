import { describe, it, expect, beforeAll, beforeEach } from 'vitest';
import { Types } from 'mongoose';
import { support_ticket_service, support_note_service } from '../../services/support';
import SupportTicket from '../../models/support-ticket';
import SupportNote from '../../models/support-note';
import Customer from '../../models/customer';
import User from '../../models/user';
import Role from '../../models/role';
import ActivityLog from '../../models/activity-log';
import type { IUser } from '../../models/user';
import type { IRole } from '../../models/role';
import type { ICustomer } from '../../models/customer';
import {
  ValidationError,
  NotFoundError,
  ForbiddenError,
  BadUserInputError,
} from '../../utils/errors';
import { mock_context, mock_context_with } from '../helpers/context';

let agent: IUser;
let other_agent: IUser;
let lead_agent: IUser;
let support_role: IRole;
let lead_role: IRole;
let customer: ICustomer;

beforeAll(async () => {
  support_role = await Role.create({
    name: 'SupportAgent',
    permissions: {
      'support_tickets.read': true,
      'support_tickets.create': true,
      'support_tickets.update': true,
      'support_tickets.delete': true,
      'support_notes.read': true,
      'support_notes.create': true,
      'support_notes.update': true,
      'support_notes.delete': true,
    },
  });

  lead_role = await Role.create({
    name: 'SupportLead',
    permissions: { 'support_tickets.*': true, 'support_notes.*': true },
  });

  agent = await User.create({
    name: 'Agent',
    email: 'agent-svc@example.com',
    password: 'password123',
    role_ids: [support_role._id],
  });

  other_agent = await User.create({
    name: 'Other Agent',
    email: 'otheragent-svc@example.com',
    password: 'password123',
    role_ids: [support_role._id],
  });

  lead_agent = await User.create({
    name: 'Support Lead',
    email: 'supportlead@example.com',
    password: 'password123',
    role_ids: [lead_role._id],
  });

  customer = await Customer.create({
    name: 'Ticket Customer',
    email: 'ticketcustomer@example.com',
    phone: '555-7777',
  });
});

beforeEach(async () => {
  await SupportTicket.deleteMany({});
  await SupportNote.deleteMany({});
  await ActivityLog.deleteMany({});
});

const as_agent = () => mock_context(agent, support_role);
const as_other_agent = () => mock_context(other_agent, support_role);
const as_lead = () => mock_context(lead_agent, lead_role);

const ticket_input = (overrides: Record<string, unknown> = {}) => ({
  customer_id: String(customer._id),
  assigned_agent: String(agent._id),
  issue_summary: 'Cannot log in',
  ...overrides,
});

describe('SupportTicketService', () => {
  it('creates a ticket defaulting to Open', async () => {
    const ticket = await support_ticket_service.create(as_agent(), ticket_input());

    expect(ticket.issue_summary).toBe('Cannot log in');
    expect(ticket.status).toBe('Open');
  });

  it('strips HTML from the issue summary', async () => {
    const ticket = await support_ticket_service.create(
      as_agent(),
      ticket_input({ issue_summary: '<script>alert(1)</script>Broken export' })
    );

    expect(ticket.issue_summary).not.toContain('<script>');
    expect(ticket.issue_summary).toContain('Broken export');
  });

  it('rejects an empty issue summary', async () => {
    await expect(
      support_ticket_service.create(as_agent(), ticket_input({ issue_summary: '' }))
    ).rejects.toThrow(ValidationError);
  });

  it('rejects a customer that does not exist', async () => {
    await expect(
      support_ticket_service.create(
        as_agent(),
        ticket_input({ customer_id: new Types.ObjectId().toString() })
      )
    ).rejects.toThrow(BadUserInputError);
  });

  it('rejects an agent that does not exist', async () => {
    await expect(
      support_ticket_service.create(
        as_agent(),
        ticket_input({ assigned_agent: new Types.ObjectId().toString() })
      )
    ).rejects.toThrow(BadUserInputError);
  });

  it('accepts InProgress, the value the database stores', async () => {
    const ticket = await support_ticket_service.create(
      as_agent(),
      ticket_input({ status: 'InProgress' })
    );
    expect(ticket.status).toBe('InProgress');
  });

  it('requires support_tickets.create', async () => {
    const no_perm = mock_context_with(agent, {});
    await expect(support_ticket_service.create(no_perm, ticket_input())).rejects.toThrow(
      ForbiddenError
    );
  });

  it('records status transitions in the audit log', async () => {
    const ticket = await support_ticket_service.create(as_agent(), ticket_input());

    await support_ticket_service.update(as_agent(), String(ticket._id), { status: 'Resolved' });

    const log = await ActivityLog.findOne({ action: 'Support ticket updated' });
    expect(log?.metadata).toMatchObject({ status_from: 'Open', status_to: 'Resolved' });
  });

  it('scopes the queue to the assigned agent', async () => {
    await support_ticket_service.create(as_agent(), ticket_input());
    await support_ticket_service.create(
      as_lead(),
      ticket_input({ assigned_agent: String(other_agent._id) })
    );

    expect((await support_ticket_service.list(as_agent(), {})).total).toBe(1);
    expect((await support_ticket_service.list(as_other_agent(), {})).total).toBe(1);
    expect((await support_ticket_service.list(as_lead(), {})).total).toBe(2);
  });

  it("refuses to read another agent's ticket", async () => {
    const ticket = await support_ticket_service.create(
      as_lead(),
      ticket_input({ assigned_agent: String(other_agent._id) })
    );

    await expect(support_ticket_service.get(as_agent(), String(ticket._id))).rejects.toThrow(
      NotFoundError
    );
  });

  it('deletes a ticket in scope', async () => {
    const ticket = await support_ticket_service.create(as_agent(), ticket_input());

    expect(await support_ticket_service.remove(as_agent(), String(ticket._id))).toBe(true);
    expect(await SupportTicket.countDocuments()).toBe(0);
  });
});

describe('SupportNoteService', () => {
  const note_input = () => ({
    customer_id: String(customer._id),
    content: 'Spoke to the customer about renewal.',
  });

  it('attributes the note to the acting user, not the client', async () => {
    const note = await support_note_service.create(as_agent(), note_input());

    expect(String(note.author_id)).toBe(String(agent._id));
  });

  it('rejects a customer that does not exist', async () => {
    await expect(
      support_note_service.create(as_agent(), {
        customer_id: new Types.ObjectId().toString(),
        content: 'x',
      })
    ).rejects.toThrow(BadUserInputError);
  });

  it('lists the notes for a customer', async () => {
    await support_note_service.create(as_agent(), note_input());
    await support_note_service.create(as_agent(), note_input());

    const notes = await support_note_service.list_for_customer(as_agent(), String(customer._id));
    expect(notes).toHaveLength(2);
  });

  it('lets the author edit their own note', async () => {
    const note = await support_note_service.create(as_agent(), note_input());

    const updated = await support_note_service.update(as_agent(), String(note._id), {
      content: 'Updated note',
    });
    expect(updated.content).toBe('Updated note');
  });

  it("refuses to let another agent edit someone else's note", async () => {
    const note = await support_note_service.create(as_agent(), note_input());

    await expect(
      support_note_service.update(as_other_agent(), String(note._id), { content: 'Tampered' })
    ).rejects.toThrow(ForbiddenError);
  });

  it('lets a lead with the wider scope edit any note', async () => {
    const note = await support_note_service.create(as_agent(), note_input());

    const updated = await support_note_service.update(as_lead(), String(note._id), {
      content: 'Corrected by lead',
    });
    expect(updated.content).toBe('Corrected by lead');
  });

  it('throws NotFoundError for a note that does not exist', async () => {
    await expect(
      support_note_service.get(as_agent(), new Types.ObjectId().toString())
    ).rejects.toThrow(NotFoundError);
  });
});
