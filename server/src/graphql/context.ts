import jwt from 'jsonwebtoken';
import User, {IUser} from '../models/User'; 
import Role, { IRole } from '../models/Role';
import { Request } from 'express';

const SECRET_KEY = process.env.JWT_SECRET || 'yoursecret';

export interface ApolloContext {
    user?: IUser | null; 
    role?: IRole | null;
}

export const context = async ({ req }: { req: Request }): Promise<ApolloContext> => {
  const auth = req.headers.authorization || '';
  const token = auth.replace('Bearer ', '');

  if (token) {
    try {
      const payload: any = jwt.verify(token, SECRET_KEY);
      const user = await User.findById(payload.id);
      if (!user) return {};

      const role = await Role.findById(user.role_id);
      return { user, role };
    } catch (err) {
      console.error('Auth error:', err);
    }
  }

  return {};
};
