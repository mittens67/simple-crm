export interface Role {
  id: string;
  name: string;
  permissions: Record<string, boolean>;
  created_at: string;
  updated_at: string;
}

export interface UserProfile {
  id: string;
  name: string;
  email: string;
  is_active: boolean;
  role_ids: string[];
  roles: Role[];
  theme_preference?: 'light' | 'dark';
  created_at: string;
  updated_at: string;
}

export interface UsersResponse {
  users: {
    data: UserProfile[];
    total: number;
  };
}
