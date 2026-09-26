/**
 * The permission vocabulary, typed.
 *
 * Permission strings were bare literals in around thirty places across the
 * router, the sidebar and every page. A typo silently evaluated to `false`, so
 * `can('leads.raed')` hid a button rather than failing loudly.
 *
 * Kept in step with server/src/auth/permissions.ts. The server remains the
 * authority — this exists so the client cannot misspell a key it sends.
 */
export const RESOURCES = [
  'users',
  'roles',
  'leads',
  'customers',
  'deals',
  'support_tickets',
  'support_notes',
  'audit_logs',
] as const;

export const ACTIONS = ['read', 'create', 'update', 'delete'] as const;

/**
 * Scope actions grant visibility beyond the records you own. Without one, a
 * `read` means "the records assigned to me".
 */
export const SCOPE_ACTIONS = ['read.all', 'update.all', 'delete.all'] as const;

export type Resource = (typeof RESOURCES)[number];
export type Action = (typeof ACTIONS)[number];
export type ScopeAction = (typeof SCOPE_ACTIONS)[number];

export type Permission = `${Resource}.${Action}` | `${Resource}.${ScopeAction}`;
