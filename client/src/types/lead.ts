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
  /** Cached AI assessment; null until the lead has been scored. */
  ai_score?: number | null;
  ai_rationale?: string | null;
  ai_next_action?: string | null;
  ai_confidence?: number | null;
  ai_scored_at?: string | null;
  /** 'mock' when the deterministic stand-in produced it, so the UI can say so. */
  ai_provider?: string | null;
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

