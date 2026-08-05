// In-memory access token + session helpers shared by the Apollo links and
// AuthContext. The access token is deliberately never persisted; the httpOnly
// refresh cookie is what survives reloads.

export interface AuthRole {
  id: string;
  name: string;
  permissions: Record<string, boolean>;
}

export interface AuthUser {
  id: string;
  name: string;
  email: string;
  roles: AuthRole[];
}

let access_token: string | null = null;
let current_role_id: string | null = null;

export const get_access_token = () => access_token;
export const set_access_token = (token: string | null) => {
  access_token = token;
};

export const get_current_role_id = () => current_role_id;
export const set_current_role_id = (role_id: string | null) => {
  current_role_id = role_id;
};

let session_expired_handler: (() => void) | null = null;
export const set_session_expired_handler = (handler: (() => void) | null) => {
  session_expired_handler = handler;
};

export const USER_FIELDS = `
  id
  name
  email
  roles {
    id
    name
    permissions
  }
`;

const REFRESH_MUTATION = `
  mutation RefreshToken {
    refreshToken {
      accessToken
      user { ${USER_FIELDS} }
    }
  }
`;

/**
 * Exchanges the refresh cookie for a new access token. Uses raw fetch (not the
 * Apollo client) so the error link can call it without recursion. Returns the
 * user on success, null otherwise.
 */
export const refresh_session = async (): Promise<AuthUser | null> => {
  try {
    const res = await fetch('/graphql', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'same-origin',
      body: JSON.stringify({ query: REFRESH_MUTATION }),
    });
    const json = await res.json();
    const payload = json?.data?.refreshToken;
    if (!payload?.accessToken) {
      set_access_token(null);
      session_expired_handler?.();
      return null;
    }
    set_access_token(payload.accessToken);
    return payload.user as AuthUser;
  } catch {
    set_access_token(null);
    session_expired_handler?.();
    return null;
  }
};

/** Mirrors the server's wildcard logic: exact key, "resource.*", then "*". */
export const has_permission = (
  permissions: Record<string, boolean> | undefined,
  permission: string
): boolean => {
  if (!permissions) return false;
  const [resource] = permission.split('.');
  return (
    permissions[permission] === true ||
    permissions[`${resource}.*`] === true ||
    permissions['*'] === true
  );
};
