import { GraphQLError } from 'graphql';
import bcrypt from 'bcryptjs';
import User from '../../models/user';
import Role from '../../models/role';
import ActivityLog from '../../models/activity-log';
import { ApolloContext } from '../context';
import { require_auth, require_permission } from '../../auth/authorize';
import {
  sign_access_token,
  issue_refresh_token,
  rotate_refresh_token,
  revoke_refresh_token,
  revoke_all_for_user,
} from '../../auth/tokens';

const invalid_credentials = () =>
  new GraphQLError('Invalid credentials', {
    extensions: { code: 'UNAUTHENTICATED' },
  });

export default {
  Query: {
    users: async (_: any, __: any, context: ApolloContext) => {
      require_permission(context, 'users.read');
      return await User.find();
    },
    user: async (_: any, { id }: { id: string }, context: ApolloContext) => {
      require_permission(context, 'users.read');
      return await User.findById(id);
    },
    me: async (_: any, __: any, context: ApolloContext) => {
      return require_auth(context);
    },
  },
  Mutation: {
    createUser: async (_: any, { input }: any, context: ApolloContext) => {
      require_permission(context, 'users.create');

      const { name, email, password, role_id } = input;

      const existing = await User.findOne({ email });
      if (existing) {
        throw new GraphQLError('Email already in use', {
          extensions: { code: 'BAD_USER_INPUT' },
        });
      }

      const role = await Role.findById(role_id);
      if (!role) {
        throw new GraphQLError('Role not found', {
          extensions: { code: 'BAD_USER_INPUT' },
        });
      }

      const user = new User({
        name,
        email,
        password: await bcrypt.hash(password, 10),
        role_id,
        is_active: true,
      });

      await user.save();
      return user;
    },

    updateUser: async (_: any, { id, input }: any, context: ApolloContext) => {
      require_permission(context, 'users.update');

      const update_data: any = { ...input };

      if (input.role_id) {
        const role = await Role.findById(input.role_id);
        if (!role) {
          throw new GraphQLError('Role not found', {
            extensions: { code: 'BAD_USER_INPUT' },
          });
        }
      }

      if (input.password) {
        update_data.password = await bcrypt.hash(input.password, 10);
      }

      const updated_user = await User.findByIdAndUpdate(id, update_data, {
        new: true,
      });
      if (!updated_user) throw new GraphQLError('User not found');

      // Password change or deactivation kills existing sessions
      if (input.password || input.is_active === false) {
        await revoke_all_for_user(updated_user._id as any);
      }

      return updated_user;
    },

    deleteUser: async (_: any, { id }: { id: string }, context: ApolloContext) => {
      const actor = require_permission(context, 'users.delete');

      const user = await User.findById(id);
      if (!user) throw new GraphQLError('User not found');

      // Soft delete: deactivate and revoke all sessions
      user.is_active = false;
      await user.save();
      await revoke_all_for_user(user._id as any);

      await ActivityLog.create({
        user_id: actor._id,
        action: 'User deactivated',
        metadata: { user_id: user._id },
      });

      return true;
    },

    login: async (_: any, { input }: any, context: ApolloContext) => {
      const { email, password } = input;

      const user = await User.findOne({ email });
      if (!user || !user.is_active) throw invalid_credentials();

      const is_match = await bcrypt.compare(password, user.password);
      if (!is_match) throw invalid_credentials();

      await issue_refresh_token(user._id as any, context.res);
      return { accessToken: sign_access_token(String(user._id)), user };
    },

    refreshToken: async (_: any, __: any, context: ApolloContext) => {
      const user_id = await rotate_refresh_token(context.req, context.res);
      if (!user_id) {
        throw new GraphQLError('Invalid refresh token', {
          extensions: { code: 'UNAUTHENTICATED' },
        });
      }

      const user = await User.findById(user_id);
      if (!user || !user.is_active) {
        throw new GraphQLError('Invalid refresh token', {
          extensions: { code: 'UNAUTHENTICATED' },
        });
      }

      return { accessToken: sign_access_token(String(user._id)), user };
    },

    logout: async (_: any, __: any, context: ApolloContext) => {
      await revoke_refresh_token(context.req, context.res);
      return true;
    },

    changePassword: async (_: any, { input }: any, context: ApolloContext) => {
      const user = require_auth(context);
      const { oldPassword, newPassword } = input;

      const is_match = await bcrypt.compare(oldPassword, user.password);
      if (!is_match) {
        throw new GraphQLError('Current password is incorrect', {
          extensions: { code: 'BAD_USER_INPUT' },
        });
      }

      user.password = await bcrypt.hash(newPassword, 10);
      await user.save();

      // New password invalidates every existing session
      await revoke_all_for_user(user._id as any);

      return true;
    },
  },
  User: {
    role: async (parent: any) => {
      return await Role.findById(parent.role_id);
    },
  },
};
