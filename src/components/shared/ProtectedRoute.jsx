import { Navigate, useLocation } from 'react-router-dom';
import { useAppContext } from '../../context/AppContext';

export default function ProtectedRoute({ children }) {
  const { isAuthenticated } = useAppContext();
  const location = useLocation();

  if (!isAuthenticated) {
    return <Navigate to="/" replace state={{ from: location }} />;
  }

  return children;
}
