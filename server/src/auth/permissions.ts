// Single source of truth for every permission key the system understands.
// The role-editor UI renders this catalog as toggles; roles store the chosen
// keys as a boolean map, optionally using wildcards ("leads.*", "*").

export const RESOURCES = [
  'users',
  'roles',
  'leads',
  'customers',
  'deals',
  'support_tickets',
  'support_notes',
  'activity_logs',
] as const;

export const ACTIONS = ['read', 'create', 'update', 'delete'] as const;

/**
 * Scope actions grant visibility beyond the records you own. Without one, a
 * `read` is implicitly "read the records assigned to me" — see
 * `scope_filter_for` in core/scoping.ts. Managers and admins get `.all`.
 */
export const SCOPE_ACTIONS = ['read.all', 'update.all', 'delete.all'] as const;

export type Resource = (typeof RESOURCES)[number];
export type Action = (typeof ACTIONS)[number];
export type ScopeAction = (typeof SCOPE_ACTIONS)[number];
export type Permission = `${Resource}.${Action}` | `${Resource}.${ScopeAction}`;

export const PERMISSION_CATALOG: Permission[] = RESOURCES.flatMap((resource) => [
  ...ACTIONS.map((action) => `${resource}.${action}` as Permission),
  ...SCOPE_ACTIONS.map((action) => `${resource}.${action}` as Permission),
]);

export type PermissionMap = Map<string, boolean> | Record<string, boolean>;

const read_flag = (permissions: PermissionMap, key: string): boolean =>
  permissions instanceof Map ? permissions.get(key) === true : permissions[key] === true;

/**
 * Checks a permission map, honouring "resource.*" and "*" wildcards.
 *
 * Note that a scope permission like "leads.read.all" has three segments, so the
 * resource is always the first segment rather than everything before the dot.
 */
export const has_permission = (
  permissions: PermissionMap | undefined,
  permission: Permission
): boolean => {
  if (!permissions) return false;
  const [resource] = permission.split('.');
  return (
    read_flag(permissions, permission) ||
    read_flag(permissions, `${resource}.*`) ||
    read_flag(permissions, '*')
  );
};

/**
 * Users hold several roles at once. Their effective permissions are the union
 * of every role they hold, so adding a role can only ever grant access.
 *
 * Previously a single "active role" was selected per request from a client
 * header, which meant switching roles could silently *remove* access and an
 * unrecognised header quietly fell back to the first role. Role switching is
 * now a UI-level "view as" preview and never changes what the server allows.
 */
export const merge_permissions = (
  role_permissions: Array<PermissionMap | undefined>
): Record<string, boolean> => {
  const merged: Record<string, boolean> = {};
  for (const permissions of role_permissions) {
    if (!permissions) continue;
    const entries =
      permissions instanceof Map ? permissions.entries() : Object.entries(permissions);
    for (const [key, value] of entries) {
      if (value === true) merged[key] = true;
    }
  }
  return merged;
};
