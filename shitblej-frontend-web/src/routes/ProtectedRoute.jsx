import { useAuth } from "../context/AuthContext";
import { Navigate, Outlet, useLocation } from "react-router-dom";
import Loading from "../components/Loading";

export default function ProtectedRoute() {
    const { user, loading } = useAuth();
    const location = useLocation();

    // Only wait when there is genuinely nothing to go on. With a hydrated
    // profile the answer is already known, so revalidating in the background
    // must not put a spinner over a page we can render right now.
    if (loading && !user) {
        return <Loading />;
    }

    return user ? <Outlet /> : <Navigate to="/login" state={{ from: location.pathname }} replace />;
}
