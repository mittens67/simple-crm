export interface ApiError {
  message: string;
  code?: string;
  details?: Record<string, string | number | boolean | object>;
}

export interface PaginationParams {
  limit: number;
  offset: number;
}

export interface PaginatedResponse<T> {
  data: T[];
  total: number;
}

export interface AsyncState<T> {
  data: T | null;
  loading: boolean;
  error: ApiError | null;
}

// These mirror the GraphQL enums exactly. The stored values, the GraphQL enum
// names and these unions are all kept identical so nothing has to translate
// between them — see server/src/graphql/schemas/*.ts.
export type LeadStatus = 'Open' | 'Pending' | 'Archived' | 'Converted';
export type DealStatus = 'Open' | 'Won' | 'Lost' | 'Pending';
export type TicketStatus = 'Open' | 'InProgress' | 'Resolved' | 'Closed';

export const LEAD_STATUSES: readonly LeadStatus[] = ['Open', 'Pending', 'Archived', 'Converted'];
export const DEAL_STATUSES: readonly DealStatus[] = ['Open', 'Won', 'Lost', 'Pending'];
export const TICKET_STATUSES: readonly TicketStatus[] = ['Open', 'InProgress', 'Resolved', 'Closed'];

// `Deal.stage` is a free-form string server-side. These are the interim values
// the UI offers until Phase 2 replaces them with a real Pipeline/Stage entity.
export const DEAL_STAGES = [
  'Prospecting',
  'Qualification',
  'Proposal',
  'Negotiation',
  'Closing',
] as const;

/** InProgress is the only status whose label differs from its value. */
export const TICKET_STATUS_LABELS: Record<TicketStatus, string> = {
  Open: 'Open',
  InProgress: 'In Progress',
  Resolved: 'Resolved',
  Closed: 'Closed',
};

export interface User {
  id: string;
  name: string;
  email: string;
  is_active: boolean;
  role_ids: string[];
  theme_preference?: 'light' | 'dark';
  created_at: string;
  updated_at: string;
}
