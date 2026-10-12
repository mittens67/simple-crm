import { ApolloContext } from '../graphql/context';
import { IUser } from '../models/user';
import { has_permission, Permission } from './permissions';
import { UnauthenticatedError, ForbiddenError } from '../utils/errors';

export const require_auth = (context: ApolloContext): IUser => {
  if (!context.user) {
    throw new UnauthenticatedError();
  }
  return context.user;
};

/**
 * Authorization is checked against the union of every role the user holds
 * (`context.permissions`), not a single client-selected role.
 */
export const require_permission = (
  context: ApolloContext,
  permission: Permission
): IUser => {
  const user = require_auth(context);
  if (!has_permission(context.permissions, permission)) {
    throw new ForbiddenError(`Missing permission: ${permission}`);
  }
  return user;
};

/** Non-throwing variant, for deciding how wide a query should be. */
export const can = (context: ApolloContext, permission: Permission): boolean =>
  has_permission(context.permissions, permission);
