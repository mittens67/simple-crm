import { GraphQLError } from 'graphql';
import { ApolloContext } from '../graphql/context';
import { IUser } from '../models/user';
import { has_permission, Permission } from './permissions';

export const require_auth = (context: ApolloContext): IUser => {
  if (!context.user) {
    throw new GraphQLError('Not authenticated', {
      extensions: { code: 'UNAUTHENTICATED' },
    });
  }
  return context.user;
};

export const require_permission = (
  context: ApolloContext,
  permission: Permission
): IUser => {
  const user = require_auth(context);
  if (!has_permission(context.role?.permissions, permission)) {
    throw new GraphQLError(`Missing permission: ${permission}`, {
      extensions: { code: 'FORBIDDEN' },
    });
  }
  return user;
};
