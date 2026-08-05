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
        let role = null;
        const roles = user.role_ids as any[];
        if (roles && roles.length > 0) {
          const requested_role_id = req.headers['x-active-role-id'];
          if (requested_role_id) {
            const requested_role = roles.find(
              (r: any) => String(r._id) === String(requested_role_id)
            );
            role = requested_role || roles[0];
          } else {
            role = roles[0];
          }
        }
        return { user, role, req, res };
      }
    } catch {
      // Invalid/expired token — treat as unauthenticated; resolvers decide access.
    }
  }

  return { req, res };
};
