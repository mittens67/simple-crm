import ActivityLog from '../../models/ActivityLog';
import User from '../../models/User';
import { Types } from 'mongoose';
import { GraphQLJSONObject } from 'graphql-type-json';

export default {
  JSON: GraphQLJSONObject,

  Query: {
    activityLogs: async (_: any, { user_id }: { user_id?: string }) => {
      const filter = user_id ? { user_id: new Types.ObjectId(user_id) } : {};
      return await ActivityLog.find(filter)
        .sort({ created_at: -1 })
        .populate('user_id');
    },
  },

  Mutation: {
    logActivity: async (_: any, { input }: any) => {
      const { user_id, action, metadata } = input;
      const log = new ActivityLog({
        user_id: new Types.ObjectId(user_id),
        action,
        metadata,
      });
      await log.save();
      return log;
    },
  },

  ActivityLog: {
    user: async (log: any) => await User.findById(log.user_id),
  },
};
