import type { ApolloContext } from '../../graphql/context';
import type { IRole } from '../../models/role';
import type { IUser } from '../../models/user';
import { merge_permissions } from '../../auth/permissions';
import { create_loaders } from '../../graphql/loaders';

/**
 * Builds a request context for tests.
 *
 * Accepts one role or several: authorization now uses the union of every role
 * the user holds, so the variadic form is how multi-role behaviour is tested.
 * Fresh loaders per call, exactly as a real request gets.
 */
export const mock_context = (
  user: IUser | null,
  ...roles: Array<IRole | null | undefined>
): ApolloContext => {
  const held = roles.filter((role): role is IRole => Boolean(role));
  return {
    user,
    roles: held,
    permissions: merge_permissions(held.map((role) => role.permissions)),
    loaders: create_loaders(),
    req: {} as ApolloContext['req'],
    res: {} as ApolloContext['res'],
  };
};

/** A context with explicit permissions, for testing a specific grant. */
export const mock_context_with = (
  user: IUser | null,
  permissions: Record<string, boolean>
): ApolloContext => ({
  user,
  roles: [],
  permissions,
  loaders: create_loaders(),
  req: {} as ApolloContext['req'],
  res: {} as ApolloContext['res'],
});
