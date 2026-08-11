import type { TicketStatus } from './common';

export interface SupportTicket {
  id: string;
  title: string;
  description: string;
  customer_id?: string;
  customer?: {
    id: string;
    name: string;
    email: string;
  };
  status: TicketStatus;
  priority: 'Low' | 'Medium' | 'High' | 'Urgent';
  assigned_rep_id?: string;
  assigned_rep?: {
    id: string;
    name: string;
    email: string;
  };
  resolution?: string;
  created_at: string;
  updated_at: string;
}

export interface SupportTicketInput {
  title: string;
  description: string;
  customer_id?: string;
  status?: TicketStatus;
  priority?: 'Low' | 'Medium' | 'High' | 'Urgent';
  assigned_rep_id?: string | null;
  resolution?: string;
}

export interface SupportTicketsResponse {
  supportTickets: {
    data: SupportTicket[];
    total: number;
  };
}
