import { Navigate } from 'react-router-dom';
import type { JSX } from 'react';
import { useAuth } from '../auth/auth-context';
import LoadingSpinner from '../components/ui/loading-spinner';
import type { Permission } from '../lib/permissions';
import { ROUTES } from './routes';

interface PermissionProtectedRouteProps {
  children: JSX.Element;
  permission: Permission | Permission[];
  /** All of the listed permissions, rather than any one of them. */
  requireAll?: boolean;
}

/**
 * The only permission gate in the app now.
 *
 * `RequirePermission` used to duplicate this array/requireAll logic verbatim
 * while never being imported anywhere; it has been deleted. Conditional
 * rendering inside a page uses `can()` from useAuth directly, so there is no
 * third mechanism.
 *
 * `permission` is typed rather than a bare string: a typo previously evaluated
 * to false and silently hid a route.
 */
const PermissionProtectedRoute = ({
  children,
  permission,
  requireAll = false,
}: PermissionProtectedRouteProps) => {
  const { status, can } = useAuth();

  if (status === 'loading') {
    return <LoadingSpinner />;
  }

  if (status === 'unauthenticated') {
    return <Navigate to={ROUTES.login} replace />;
  }

  const permissions = Array.isArray(permission) ? permission : [permission];
  const allowed = requireAll ? permissions.every(can) : permissions.some(can);

  if (!allowed) {
    return <Navigate to={ROUTES.home} replace />;
  }

  return children;
};

export default PermissionProtectedRoute;
