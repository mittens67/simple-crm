import { Navigate } from "react-router-dom";
import type { JSX } from "react";
import { useAuth } from "../auth/auth-context";

const ProtectedRoute = ({ children }: { children: JSX.Element }) => {
  const { status } = useAuth();

  if (status === "loading") {
    return <div className="route-loading">Loading…</div>;
  }

  return status === "authenticated" ? children : <Navigate to="/login" replace />;
};

export default ProtectedRoute;
