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
  login: (email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  can: (permission: string) => boolean;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const client = useApolloClient();
  const [user, set_user] = useState<AuthUser | null>(null);
  const [status, set_status] = useState<Status>('loading');

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
      set_status('authenticated');
    },
    [client]
  );

  const logout = useCallback(async () => {
    try {
      await client.mutate({ mutation: LOGOUT });
    } finally {
      set_access_token(null);
      set_user(null);
      set_status('unauthenticated');
      await client.clearStore();
    }
  }, [client]);

  const can = useCallback(
    (permission: string) => has_permission(user?.role?.permissions, permission),
    [user]
  );

  return (
    <AuthContext.Provider value={{ user, status, login, logout, can }}>
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
