import type { Permission } from '../lib/permissions';

/**
 * Route paths in one place.
 *
 * They were previously hardcoded string literals across five files — the
 * router, the sidebar, both route guards and the login page — so renaming a
 * route meant finding every copy.
 */
export const ROUTES = {
  login: '/login',
  home: '/',
  leads: '/leads',
  lead: (id: string) => `/leads/${id}`,
  customers: '/customers',
  customer: (id: string) => `/customers/${id}`,
  deals: '/deals',
  deal: (id: string) => `/deals/${id}`,
  pipeline: '/pipeline',
  tasks: '/tasks',
  support: '/support',
  profile: '/profile',
  admin_roles: '/admin/roles',
  admin_users: '/admin/users',
} as const;

export interface NavItem {
  to: string;
  label: string;
  /** Omitted for routes that need only authentication. */
  permission?: Permission;
}

/** Drives the sidebar, so navigation and routing cannot drift apart. */
export const MAIN_NAV: NavItem[] = [
  { to: ROUTES.home, label: 'Dashboard' },
  { to: ROUTES.leads, label: 'Leads', permission: 'leads.read' },
  { to: ROUTES.pipeline, label: 'Pipeline', permission: 'deals.read' },
  { to: ROUTES.deals, label: 'Deals', permission: 'deals.read' },
  { to: ROUTES.customers, label: 'Customers', permission: 'customers.read' },
  { to: ROUTES.tasks, label: 'Tasks' },
  { to: ROUTES.support, label: 'Support', permission: 'support_tickets.read' },
];

export const ADMIN_NAV: NavItem[] = [
  { to: ROUTES.admin_roles, label: 'Roles', permission: 'roles.read' },
  { to: ROUTES.admin_users, label: 'Users', permission: 'users.read' },
];
