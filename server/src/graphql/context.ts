import { Request, Response } from 'express';
import User, { IUser } from '../models/user';
import Role, { IRole } from '../models/role';
import { verify_access_token } from '../auth/tokens';

export interface ApolloContext {
  user?: IUser | null;
  role?: IRole | null;
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
  const auth = req.headers.authorization || '';
  const token = auth.startsWith('Bearer ') ? auth.slice('Bearer '.length) : '';

  if (token) {
    try {
      const payload = verify_access_token(token);
      const user = await User.findById(payload.sub).populate('role_ids');
      if (user && user.is_active) {
        // Use the first role for permission checks; client will implement role switching
        const role = (user.role_ids && user.role_ids.length > 0)
          ? (user.role_ids[0] as any)
          : null;
        return { user, role, req, res };
      }
    } catch {
      // Invalid/expired token — treat as unauthenticated; resolvers decide access.
    }
  }

  return { req, res };
};
