import type { DealStatus } from './common';

export interface Deal {
  id: string;
  title: string;
  description?: string;
  customer_id: string;
  customer?: {
    id: string;
    name: string;
    email: string;
  };
  amount: number;
  status: DealStatus;
  assigned_rep_id?: string;
  assigned_rep?: {
    id: string;
    name: string;
    email: string;
  };
  expected_close_date?: string;
  close_date?: string;
  notes?: string;
  created_at: string;
  updated_at: string;
}

export interface DealInput {
  title: string;
  description?: string;
  customer_id: string;
  amount: number;
  status?: DealStatus;
  assigned_rep_id?: string | null;
  expected_close_date?: string;
  close_date?: string;
  notes?: string;
}

export interface DealsResponse {
  deals: {
    data: Deal[];
    total: number;
  };
}
