export interface Customer {
  id: string;
  name: string;
  email: string;
  phone: string;
  assigned_rep_id?: string;
  assigned_rep?: {
    id: string;
    name: string;
    email: string;
  };
  company?: string;
  industry?: string;
  notes?: string;
  created_at: string;
  updated_at: string;
}

export interface CustomerInput {
  name: string;
  email: string;
  phone: string;
  assigned_rep_id?: string | null;
  company?: string;
  industry?: string;
  notes?: string;
}

export interface CustomersResponse {
  customers: {
    data: Customer[];
    total: number;
  };
}
