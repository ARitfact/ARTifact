import { Navigate } from "react-router-dom";
import useAuth from "../hooks/useAuth";

export default function PublicRoute({
  children,
}) {
  const {
    isAuthenticated,
    loading,
  } = useAuth();

  if (loading) {
    return (
      <div className="route-loader">
        Loading ARTifact...
      </div>
    );
  }

 if (isAuthenticated) {
  return <Navigate to="/dashboard" replace />;
}
  return children;
}