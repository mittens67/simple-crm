import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
} from 'react';
import type { ReactNode } from 'react';
import { gql, useApolloClient } from '@apollo/client';
import type { AuthUser } from '../lib/auth';
import {
  USER_FIELDS,
  has_permission,
  refresh_session,
  set_access_token,
  set_current_role_id,
  set_session_expired_handler,
} from '../lib/auth';

const LOGIN = gql`
  mutation Login($input: LoginInput!) {
    login(input: $input) {
      accessToken
      user { ${USER_FIELDS} }
    }
  }
`;

const LOGOUT = gql`
  mutation Logout {
    logout
  }
`;

type Status = 'loading' | 'authenticated' | 'unauthenticated';

interface AuthContextValue {
  user: AuthUser | null;
  status: Status;
  current_role_index: number;
  login: (email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  switch_role: (role_index: number) => void;
  can: (permission: string) => boolean;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const client = useApolloClient();
  const [user, set_user] = useState<AuthUser | null>(null);
  const [status, set_status] = useState<Status>('loading');
  const [current_role_index, set_current_role_index] = useState(0);

  // Silent refresh on mount so a page reload keeps the session.
  useEffect(() => {
    let cancelled = false;
    refresh_session().then((session_user) => {
      if (cancelled) return;
      set_user(session_user);
      set_status(session_user ? 'authenticated' : 'unauthenticated');
    });
    return () => {
      cancelled = true;
    };
  }, []);

  // If a background refresh fails (session revoked/expired), drop to login.
  useEffect(() => {
    set_session_expired_handler(() => {
      set_user(null);
      set_status('unauthenticated');
    });
    return () => set_session_expired_handler(null);
  }, []);

  const login = useCallback(
    async (email: string, password: string) => {
      const { data } = await client.mutate({
        variables: { input: { email, password } },
        mutation: LOGIN,
      });
      const payload = data.login;
      set_access_token(payload.accessToken);
      set_user(payload.user);
      set_current_role_index(0);
      if (payload.user?.roles?.[0]?.id) {
        set_current_role_id(payload.user.roles[0].id);
      }
      set_status('authenticated');
    },
    [client]
  );

  const logout = useCallback(async () => {
    try {
      await client.mutate({ mutation: LOGOUT });
    } finally {
      set_access_token(null);
      set_current_role_id(null);
      set_user(null);
      set_current_role_index(0);
      set_status('unauthenticated');
      await client.clearStore();
    }
  }, [client]);

  const switch_role = useCallback((role_index: number) => {
    if (user && role_index >= 0 && role_index < user.roles.length) {
      set_current_role_index(role_index);
      set_current_role_id(user.roles[role_index].id);
    }
  }, [user]);

  const can = useCallback(
    (permission: string) => {
      if (!user || user.roles.length === 0) return false;
      const current_role = user.roles[current_role_index];
      return has_permission(current_role?.permissions, permission);
    },
    [user, current_role_index]
  );

  return (
    <AuthContext.Provider value={{ user, status, current_role_index, login, logout, switch_role, can }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = (): AuthContextValue => {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used inside <AuthProvider>');
  return ctx;
};

export const useCan = (permission: string): boolean => {
  const { can } = useAuth();
  return can(permission);
};
