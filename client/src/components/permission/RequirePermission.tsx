import type { ReactNode } from 'react';
import { useAuth } from '../../auth/auth-context';

interface RequirePermissionProps {
  permission: string | string[];
  children: ReactNode;
  fallback?: ReactNode;
  requireAll?: boolean;
}

export const RequirePermission = ({
  permission,
  children,
  fallback = null,
  requireAll = false,
}: RequirePermissionProps) => {
  const { can } = useAuth();

  const hasPermission = Array.isArray(permission)
    ? requireAll
      ? permission.every((p) => can(p))
      : permission.some((p) => can(p))
    : can(permission);

  return <>{hasPermission ? children : fallback}</>;
};
