import type { LeadStatus } from './common';

export interface Lead {
  id: string;
  name: string;
  email: string;
  phone: string;
  status: LeadStatus;
  assigned_rep_id?: string;
  assigned_rep?: {
    id: string;
    name: string;
    email: string;
  };
  customer_id?: string;
  customer?: {
    id: string;
    name: string;
  };
  sales_notes?: string;
  archive_notes?: string;
  created_at: string;
  updated_at: string;
}

export interface LeadInput {
  name: string;
  email: string;
  phone: string;
  status?: LeadStatus;
  assigned_rep_id?: string | null;
  sales_notes?: string;
  archive_notes?: string;
}

export interface LeadsResponse {
  leads: {
    data: Lead[];
    total: number;
  };
}
