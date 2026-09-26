import { Navigate } from "react-router-dom";
import type { JSX } from "react";
import { useAuth } from "../auth/auth-context";
import { ROUTES } from "./routes";
import LoadingSpinner from "../components/ui/loading-spinner";

const ProtectedRoute = ({ children }: { children: JSX.Element }) => {
  const { status } = useAuth();

  if (status === "loading") {
    return <LoadingSpinner />;
  }

  return status === "authenticated" ? children : <Navigate to={ROUTES.login} replace />;
};

export default ProtectedRoute;
