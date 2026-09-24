import type { TicketStatus } from './common';

interface TicketParty {
  id: string;
  name: string;
  email: string;
}

export interface SupportTicket {
  id: string;
  customer_id?: string;
  customer?: TicketParty;
  assigned_agent?: TicketParty;
  status: TicketStatus;
  issue_summary: string;
  internal_notes?: string;
  created_at: string;
  updated_at: string;
}

export interface SupportTicketInput {
  customer_id: string;
  assigned_agent?: string | null;
  issue_summary: string;
  status?: TicketStatus;
  internal_notes?: string;
}
