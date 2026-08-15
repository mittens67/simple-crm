import type { Types } from 'mongoose';
import type { ApolloContext } from '../../graphql/context';

export interface MockContext extends Omit<ApolloContext, 'req' | 'res'> {
  user: any;
  user_id: Types.ObjectId;
  role: any;
  auth_retried?: boolean;
  req?: any;
  res?: any;
}

export const mock_context = (user: any, role: any = null): ApolloContext => ({
  user,
  role,
  req: {} as any,
  res: {} as any,
});
