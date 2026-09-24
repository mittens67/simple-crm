import type { DealStatus } from './common';

interface DealParty {
  id: string;
  name: string;
  email: string;
}

export interface Deal {
  id: string;
  title: string;
  customer_id: string;
  customer?: DealParty;
  owner_id?: string;
  owner?: DealParty;
  value: number;
  status: DealStatus;
  stage: string;
  created_at: string;
  updated_at: string;
}

export interface DealInput {
  title: string;
  customer_id: string;
  owner_id?: string | null;
  value: number;
  status?: DealStatus;
  stage: string;
}
