import { AnimatePresence } from 'framer-motion';
import { Navigate, Route, Routes, useLocation } from 'react-router-dom';
import { useAppContext } from './context/AppContext';
import AppShell from './components/layout/AppShell';
import ProtectedRoute from './components/shared/ProtectedRoute';
import PublicRoute from './components/shared/PublicRoute';
import LoginPage from './pages/LoginPage';
import DashboardPage from './pages/DashboardPage';
import FriendDetailPage from './pages/FriendDetailPage';
import GroupsPage from './pages/GroupsPage';

export default function App() {
  const location = useLocation();
  const { isAuthenticated } = useAppContext();

  return (
    <AnimatePresence mode="wait">
      <Routes location={location} key={location.pathname}>
        <Route
          path="/"
          element={
            <PublicRoute>
              <LoginPage />
            </PublicRoute>
          }
        />

        <Route
          element={
            <ProtectedRoute>
              <AppShell />
            </ProtectedRoute>
          }
        >
          <Route path="/dashboard" element={<DashboardPage />} />
          <Route path="/friend/:id" element={<FriendDetailPage />} />
          <Route path="/groups" element={<GroupsPage />} />
        </Route>

        <Route
          path="*"
          element={
            <Navigate to={isAuthenticated ? '/dashboard' : '/'} replace />
          }
        />
      </Routes>
    </AnimatePresence>
  );
}
