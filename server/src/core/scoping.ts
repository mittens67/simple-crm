import { FilterQuery } from 'mongoose';
import { ApolloContext } from '../graphql/context';
import { has_permission, Permission, Resource } from '../auth/permissions';

/**
 * Row-level authorization.
 *
 * `leads.read` means "read the leads assigned to me". `leads.read.all` means
 * "read every lead". Reps therefore see their own book of business by default,
 * while managers and admins (who hold the `.all` scope, or a `leads.*` /  `*`
 * wildcard) see everything.
 *
 * The filter is applied in the repository query rather than by discarding rows
 * after the fact, so pagination totals stay correct.
 */
export const has_full_scope = (
  context: ApolloContext,
  resource: Resource,
  action: 'read' | 'update' | 'delete' = 'read'
): boolean => has_permission(context.permissions, `${resource}.${action}.all` as Permission);

/**
 * Returns the conditions restricting a query to records the caller owns, or an
 * empty object when they may see everything.
 *
 * `owner_field` differs per entity — leads and customers use assigned_rep_id,
 * deals use owner_id, tickets use assigned_agent.
 */
export const scope_filter_for = (
  context: ApolloContext,
  resource: Resource,
  owner_field: string,
  action: 'read' | 'update' | 'delete' = 'read'
): FilterQuery<unknown> => {
  if (has_full_scope(context, resource, action)) return {};
  if (!context.user) return { _id: null }; // matches nothing
  return { [owner_field]: context.user._id };
};
