import mongoose, { Schema, Document, Types } from 'mongoose';
import { BASE_SCHEMA_OPTIONS, add_indexes } from '../core/schema-defaults';

export const TICKET_PRIORITIES = ['Low', 'Medium', 'High', 'Urgent'] as const;
export type TicketPriority = (typeof TICKET_PRIORITIES)[number];

// Values match the TicketCategory GraphQL enum names exactly — GraphQL enum
// values cannot contain spaces, and a mismatch fails at serialization time.
export const TICKET_CATEGORIES = [
  'Billing',
  'Bug',
  'Feature_Request',
  'Onboarding',
  'Account',
  'Other',
] as const;

/**
 * Hours until a first response is due, by priority. A real helpdesk would make
 * these configurable per contract; a fixed table is enough to demonstrate the
 * mechanic and keeps the breach calculation honest.
 */
export const SLA_RESPONSE_HOURS: Record<TicketPriority, number> = {
  Urgent: 1,
  High: 4,
  Medium: 24,
  Low: 72,
};

export interface ISupportTicket extends Document {
  customer_id: Types.ObjectId; // Ref to Customer
  assigned_agent: Types.ObjectId; // Ref to User
  // Stored values match the SupportStatus GraphQL enum names exactly so that
  // nothing has to translate between the database and the API. "In Progress"
  // is a display label only — see TICKET_STATUS_LABELS on the client.
  status: 'Open' | 'InProgress' | 'Resolved' | 'Closed';
  issue_summary: string;
  internal_notes?: string;
  priority: TicketPriority;
  category: string;
  /** Deadline for the first response, derived from priority at creation. */
  sla_due_at: Date;
  first_response_at?: Date;
  resolved_at?: Date;
  created_at: Date;
  updated_at: Date;
}

const SupportTicketSchema = new Schema<ISupportTicket>(
  {
    customer_id: {
      type: Schema.Types.ObjectId,
      ref: 'Customer',
      required: true,
    },
    assigned_agent: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    status: {
      type: String,
      enum: ['Open', 'InProgress', 'Resolved', 'Closed'],
      default: 'Open',
    },
    issue_summary: { type: String, required: true },
    internal_notes: { type: String }, // Optional field
    priority: { type: String, enum: TICKET_PRIORITIES, default: 'Medium' },
    category: { type: String, enum: TICKET_CATEGORIES, default: 'Other' },
    sla_due_at: { type: Date, required: true },
    first_response_at: { type: Date },
    resolved_at: { type: Date },
  },
  BASE_SCHEMA_OPTIONS
);

add_indexes(SupportTicketSchema, {
  owner_fields: ['assigned_agent'],
  searchable: ['customer_id', 'status', 'priority', 'sla_due_at'],
});

/** True when the first response is still outstanding past its deadline. */
export const is_sla_breached = (ticket: ISupportTicket, now = new Date()): boolean => {
  if (ticket.first_response_at) return ticket.first_response_at > ticket.sla_due_at;
  return now > ticket.sla_due_at;
};

export const sla_due_from = (priority: TicketPriority, from = new Date()): Date =>
  new Date(from.getTime() + SLA_RESPONSE_HOURS[priority] * 60 * 60 * 1000);

export default mongoose.model<ISupportTicket>('SupportTicket', SupportTicketSchema);
