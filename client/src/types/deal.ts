import type { DealStatus } from './common';

interface DealParty {
  id: string;
  name: string;
  email: string;
}

export interface Stage {
  id: string;
  name: string;
  display_order: number;
  /** Win probability 0-100, used for weighted pipeline value. */
  probability: number;
  outcome: 'open' | 'won' | 'lost';
}

export interface Pipeline {
  id: string;
  name: string;
  is_default: boolean;
  stages: Stage[];
}

export type LostReason =
  | 'Price'
  | 'Lost_to_competitor'
  | 'No_budget'
  | 'No_decision'
  | 'Bad_timing'
  | 'Missing_features'
  | 'Other';

export const LOST_REASONS: readonly LostReason[] = [
  'Price',
  'Lost_to_competitor',
  'No_budget',
  'No_decision',
  'Bad_timing',
  'Missing_features',
  'Other',
];

/** Enum values use underscores because GraphQL forbids spaces. */
export const LOST_REASON_LABELS: Record<LostReason, string> = {
  Price: 'Price',
  Lost_to_competitor: 'Lost to competitor',
  No_budget: 'No budget',
  No_decision: 'No decision',
  Bad_timing: 'Bad timing',
  Missing_features: 'Missing features',
  Other: 'Other',
};

export interface Deal {
  id: string;
  title: string;
  customer_id: string;
  customer?: DealParty;
  owner_id?: string;
  owner?: DealParty;
  value: number;
  status: DealStatus;
  pipeline?: Pipeline;
  /** Null only if the pipeline was edited out from under the deal. */
  stage?: Stage | null;
  stage_entered_at: string;
  days_in_stage: number;
  expected_close_date?: string | null;
  closed_at?: string | null;
  lost_reason?: LostReason | null;
  weighted_value: number;
  created_at: string;
  updated_at: string;
}

export interface DealInput {
  title: string;
  customer_id: string;
  owner_id?: string | null;
  value: number;
  status?: DealStatus;
  pipeline_id?: string | null;
  stage_id?: string | null;
  expected_close_date?: string | null;
  lost_reason?: LostReason | null;
}

export interface BoardColumn {
  stage: Stage;
  deals: Deal[];
  total_value: number;
  deal_count: number;
}
