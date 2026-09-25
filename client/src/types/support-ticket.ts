import type { TicketStatus } from './common';

interface TicketParty {
  id: string;
  name: string;
  email: string;
}

export type TicketPriority = 'Low' | 'Medium' | 'High' | 'Urgent';

export const TICKET_PRIORITIES: readonly TicketPriority[] = ['Low', 'Medium', 'High', 'Urgent'];

export type TicketCategory =
  | 'Billing'
  | 'Bug'
  | 'Feature_Request'
  | 'Onboarding'
  | 'Account'
  | 'Other';

export const TICKET_CATEGORIES: readonly TicketCategory[] = [
  'Billing',
  'Bug',
  'Feature_Request',
  'Onboarding',
  'Account',
  'Other',
];

/** Enum values use underscores because GraphQL forbids spaces. */
export const TICKET_CATEGORY_LABELS: Record<TicketCategory, string> = {
  Billing: 'Billing',
  Bug: 'Bug',
  Feature_Request: 'Feature Request',
  Onboarding: 'Onboarding',
  Account: 'Account',
  Other: 'Other',
};

export interface SupportTicket {
  id: string;
  customer_id?: string;
  customer?: TicketParty;
  assigned_agent?: TicketParty;
  status: TicketStatus;
  issue_summary: string;
  internal_notes?: string;
  priority: TicketPriority;
  category: TicketCategory;
  sla_due_at: string;
  first_response_at?: string | null;
  resolved_at?: string | null;
  is_sla_breached: boolean;
  created_at: string;
  updated_at: string;
}

export interface SupportTicketInput {
  customer_id: string;
  assigned_agent?: string | null;
  issue_summary: string;
  status?: TicketStatus;
  internal_notes?: string;
  priority?: TicketPriority;
  category?: TicketCategory;
}
