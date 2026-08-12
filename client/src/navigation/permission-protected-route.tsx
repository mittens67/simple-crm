import { Navigate } from "react-router-dom";
import type { JSX } from "react";
import { useAuth } from "../auth/auth-context";
import LoadingSpinner from "../components/ui/loading-spinner";

interface PermissionProtectedRouteProps {
  children: JSX.Element;
  permission: string | string[];
  requireAll?: boolean;
}

const PermissionProtectedRoute = ({
  children,
  permission,
  requireAll = false,
}: PermissionProtectedRouteProps) => {
  const { status, can } = useAuth();

  if (status === "loading") {
    return <LoadingSpinner />;
  }

  if (status === "unauthenticated") {
    return <Navigate to="/login" replace />;
  }

  const has_permission = Array.isArray(permission)
    ? requireAll
      ? permission.every((p) => can(p))
      : permission.some((p) => can(p))
    : can(permission);

  if (!has_permission) {
    return <Navigate to="/" replace />;
  }

  return children;
};

export default PermissionProtectedRoute;
