export interface ApiError {
  message: string;
  code?: string;
  details?: Record<string, any>;
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

export type LeadStatus = 'Open' | 'Pending' | 'Archived' | 'Converted';
export type DealStatus = 'Open' | 'Won' | 'Lost' | 'Closed';
export type TicketStatus = 'Open' | 'In Progress' | 'Closed' | 'On Hold';

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
