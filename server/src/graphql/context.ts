import { Request, Response } from 'express';
import User, { IUser } from '../models/user';
import { IRole } from '../models/role';
import { verify_access_token } from '../auth/tokens';
import { merge_permissions } from '../auth/permissions';
import { create_loaders, Loaders } from './loaders';

export interface ApolloContext {
  user?: IUser | null;
  /** Every role the user holds. */
  roles: IRole[];
  /** Union of the permissions of all roles held — the basis for authorization. */
  permissions: Record<string, boolean>;
  /** Per-request batching for relation fields. Never share across requests. */
  loaders: Loaders;
  req: Request;
  res: Response;
}

export const context = async ({
  req,
  res,
}: {
  req: Request;
  res: Response;
}): Promise<ApolloContext> => {
  const base = { roles: [], permissions: {}, loaders: create_loaders(), req, res };

  const auth = req.headers.authorization || '';
  const token = auth.startsWith('Bearer ') ? auth.slice('Bearer '.length) : '';
  if (!token) return base;

  try {
    const payload = verify_access_token(token);
    const user = await User.findById(payload.sub).populate('role_ids');
    if (!user || !user.is_active) return base;

    const roles = (user.role_ids as unknown as IRole[]) ?? [];
    return {
      ...base,
      user,
      roles,
      permissions: merge_permissions(roles.map((role) => role.permissions)),
    };
  } catch {
    // Invalid/expired token — treat as unauthenticated; resolvers decide access.
    return base;
  }
};
