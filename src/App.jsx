import { lazy, Suspense } from 'react';
import { AnimatePresence } from 'framer-motion';
import { Navigate, Route, Routes, useLocation } from 'react-router-dom';
import { useAppContext } from './context/AppContext';
import AppShell from './components/layout/AppShell';
import ProtectedRoute from './components/shared/ProtectedRoute';
import PublicRoute from './components/shared/PublicRoute';

const LoginPage = lazy(() => import('./pages/LoginPage'));
const DashboardPage = lazy(() => import('./pages/DashboardPage'));
const FriendDetailPage = lazy(() => import('./pages/FriendDetailPage'));
const GroupsPage = lazy(() => import('./pages/GroupsPage'));
const AdminPage = lazy(() => import('./pages/AdminPage'));

function AppLoadingFallback() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-ink">
      <div className="h-10 w-10 animate-spin rounded-full border-2 border-electric-500/20 border-t-electric-300" />
    </div>
  );
}

export default function App() {
  const location = useLocation();
  const { isAuthenticated } = useAppContext();

  return (
    <Suspense fallback={<AppLoadingFallback />}>
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
            path="/admin"
            element={
              <ProtectedRoute>
                <AdminPage />
              </ProtectedRoute>
            }
          />

          <Route
            path="*"
            element={
              <Navigate to={isAuthenticated ? '/dashboard' : '/'} replace />
            }
          />
        </Routes>
      </AnimatePresence>
    </Suspense>
  );
}
