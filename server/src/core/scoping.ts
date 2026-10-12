import { FilterQuery } from 'mongoose';
import { ApolloContext } from '../graphql/context';
import { has_permission, Permission, Resource } from '../auth/permissions';

/**
 * Row-level authorization.
 *
 * `leads.read` means "read the leads assigned to me". `leads.read.all` means
 * "read every lead". Reps therefore see their own book of business by default,
 * while managers and admins (who hold the `.all` scope, or a `leads.*` / `*`
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

interface ScopeOptions {
  action?: 'read' | 'update' | 'delete';
  /**
   * Also match records with no owner.
   *
   * Leads have an unclaimed pool: a lead with no rep is `Open`, and attaching a
   * rep moves it to `Pending`. Without this, a rep could not see the pool at
   * all — and a lead they created themselves without picking a rep vanished
   * from their list the moment it was saved.
   *
   * Customers, deals and tickets are always owned, so they do not set it.
   */
  include_unassigned?: boolean;
}

/**
 * Returns the conditions restricting a query to records the caller may act on,
 * or an empty object when they may see everything.
 *
 * `owner_field` differs per entity — leads and customers use assigned_rep_id,
 * deals use owner_id, tickets use assigned_agent.
 */
export const scope_filter_for = (
  context: ApolloContext,
  resource: Resource,
  owner_field: string,
  options: ScopeOptions | 'read' | 'update' | 'delete' = {}
): FilterQuery<unknown> => {
  // The third argument used to be a bare action string; both forms are accepted
  // so call sites that only need an action stay terse.
  const { action = 'read', include_unassigned = false } =
    typeof options === 'string' ? { action: options } : options;

  if (has_full_scope(context, resource, action)) return {};
  if (!context.user) return { _id: null }; // matches nothing

  if (!include_unassigned) {
    return { [owner_field]: context.user._id };
  }

  return {
    $or: [{ [owner_field]: context.user._id }, { [owner_field]: null }],
  };
};
