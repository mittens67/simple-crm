import type { Types } from 'mongoose';

export interface MockContext {
  user: any;
  user_id: Types.ObjectId;
  role: any;
  auth_retried: boolean;
}

export const mock_context = (user: any, role: any = null): MockContext => ({
  user,
  user_id: user._id,
  role,
  auth_retried: false,
});
