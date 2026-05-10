import { Navigate, useLocation } from 'react-router-dom';
import { useAppContext } from '../../context/AppContext';

export default function ProtectedRoute({ children }) {
  const { isAuthenticated, isAuthLoading } = useAppContext();
  const location = useLocation();

  if (isAuthLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-ink">
        <div className="h-10 w-10 animate-spin rounded-full border-2 border-electric-500/20 border-t-electric-300" />
      </div>
    );
  }

  if (!isAuthenticated) {
    return <Navigate to="/" replace state={{ from: location }} />;
  }

  return children;
}
