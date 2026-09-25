import AuditLog from '../../models/audit-log';
import User from '../../models/user';
import { Types } from 'mongoose';
import { GraphQLJSONObject } from 'graphql-type-json';
import { ApolloContext } from '../context';
import { require_permission } from '../../auth/authorize';

export default {
  JSON: GraphQLJSONObject,

  Query: {
    auditLogs: async (_: any, { user_id }: { user_id?: string }, context: ApolloContext) => {
      require_permission(context, 'audit_logs.read');
      const filter = user_id ? { user_id: new Types.ObjectId(user_id) } : {};
      return await AuditLog.find(filter)
        .sort({ created_at: -1 })
        .populate('user_id');
    },
  },

  Mutation: {
    logAudit: async (_: any, { input }: any, context: ApolloContext) => {
      const actor = require_permission(context, 'audit_logs.create');
      const { action, metadata } = input;

      // Logs are always attributed to the logged-in user
      const log = new AuditLog({
        user_id: actor._id,
        action,
        metadata,
      });
      await log.save();
      return log;
    },
  },

  AuditLog: {
    user: async (log: any) => await User.findById(log.user_id),
  },
};
