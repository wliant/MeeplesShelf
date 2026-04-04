import { Navigate, Outlet } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";

export default function RequireAuth() {
  const { role } = useAuth();
  if (role === null) return <Navigate to="/login" replace />;
  return <Outlet />;
}
