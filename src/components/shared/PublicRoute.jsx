import { Navigate } from 'react-router-dom';
import { useAppContext } from '../../context/AppContext';

export default function PublicRoute({ children }) {
  const { isAuthenticated } = useAppContext();

  if (isAuthenticated) {
    return <Navigate to="/dashboard" replace />;
  }

  return children;
}
