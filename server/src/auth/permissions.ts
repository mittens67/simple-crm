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

export type Resource = (typeof RESOURCES)[number];
export type Action = (typeof ACTIONS)[number];
export type Permission = `${Resource}.${Action}`;

export const PERMISSION_CATALOG: Permission[] = RESOURCES.flatMap((resource) =>
  ACTIONS.map((action) => `${resource}.${action}` as Permission)
);

/** Checks a permission map, honoring "resource.*" and "*" wildcards. */
export const has_permission = (
  permissions: Map<string, boolean> | Record<string, boolean> | undefined,
  permission: Permission
): boolean => {
  if (!permissions) return false;
  const get = (key: string): boolean =>
    permissions instanceof Map ? permissions.get(key) === true : permissions[key] === true;

  const [resource] = permission.split('.');
  return get(permission) || get(`${resource}.*`) || get('*');
};
