import { useAuth } from "../context/AuthContext";
import { Navigate, Outlet, useLocation } from "react-router-dom";

export default function ProtectedRoute() {
    const { user, loading } = useAuth();
    const location = useLocation();

    if (loading) {
        return <div className="p-8 text-center">Loading...</div>;
    }

    return user ? <Outlet /> : <Navigate to="/login" state={{ from: location.pathname }} replace />;
}