import React, { Suspense, lazy } from 'react';
import { BrowserRouter, Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import { ThemeProvider } from './context/ThemeContext';
import { ToastProvider } from './context/ToastContext';
import Layout from './components/Layout';
import LoadingSkeleton from './components/LoadingSkeleton';

// React.lazy and Suspense code splitting as specified in requirement #13
const Login = lazy(() => import('./pages/Login'));
const Register = lazy(() => import('./pages/Register'));
const Overview = lazy(() => import('./pages/Overview'));
const Transactions = lazy(() => import('./pages/Transactions'));
const Analytics = lazy(() => import('./pages/Analytics'));
const Categories = lazy(() => import('./pages/Categories'));
const Budgets = lazy(() => import('./pages/Budgets'));
const Settings = lazy(() => import('./pages/Settings'));
const AdminUsers = lazy(() => import('./pages/AdminUsers'));
const AdminActivityLogs = lazy(() => import('./pages/AdminActivityLogs'));
const NotFound = lazy(() => import('./pages/NotFound'));

// Protected Route Component
function ProtectedRoute({ children, adminOnly = false }) {
  const { isAuthenticated, loading, isAdmin } = useAuth();
  const location = useLocation();

  if (loading) {
    return (
      <div style={{ padding: '40px', maxWidth: '800px', margin: '0 auto' }}>
        <LoadingSkeleton rows={4} type="card" />
      </div>
    );
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  if (adminOnly && !isAdmin) {
    return <Navigate to="/overview" replace />;
  }

  return children;
}

// Page title mapping helper
function RouteWithLayout({ component: Component, title }) {
  return (
    <Layout title={title}>
      <Component />
    </Layout>
  );
}

export default function App() {
  return (
    <ThemeProvider>
      <ToastProvider>
        <AuthProvider>
          <BrowserRouter>
            <Suspense
              fallback={
                <div style={{ padding: '40px', maxWidth: '1000px', margin: '0 auto' }}>
                  <LoadingSkeleton rows={6} type="card" />
                </div>
              }
            >
              <Routes>
                {/* Public Auth Routes */}
                <Route path="/login" element={<Login />} />
                <Route path="/register" element={<Register />} />

                {/* Protected Application Routes */}
                <Route
                  path="/overview"
                  element={
                    <ProtectedRoute>
                      <RouteWithLayout component={Overview} title="Overview" />
                    </ProtectedRoute>
                  }
                />

                <Route
                  path="/transactions"
                  element={
                    <ProtectedRoute>
                      <RouteWithLayout component={Transactions} title="Transactions" />
                    </ProtectedRoute>
                  }
                />

                <Route
                  path="/analytics"
                  element={
                    <ProtectedRoute>
                      <RouteWithLayout component={Analytics} title="Analytics Dashboard" />
                    </ProtectedRoute>
                  }
                />

                <Route
                  path="/categories"
                  element={
                    <ProtectedRoute>
                      <RouteWithLayout component={Categories} title="Categories" />
                    </ProtectedRoute>
                  }
                />

                <Route
                  path="/budgets"
                  element={
                    <ProtectedRoute>
                      <RouteWithLayout component={Budgets} title="Monthly Budgets" />
                    </ProtectedRoute>
                  }
                />

                <Route
                  path="/settings"
                  element={
                    <ProtectedRoute>
                      <RouteWithLayout component={Settings} title="Settings" />
                    </ProtectedRoute>
                  }
                />

                {/* Admin Only Routes */}
                <Route
                  path="/admin/users"
                  element={
                    <ProtectedRoute adminOnly={true}>
                      <RouteWithLayout component={AdminUsers} title="User Management" />
                    </ProtectedRoute>
                  }
                />

                <Route
                  path="/admin/logs"
                  element={
                    <ProtectedRoute adminOnly={true}>
                      <RouteWithLayout component={AdminActivityLogs} title="Admin Activity Logs" />
                    </ProtectedRoute>
                  }
                />

                {/* Default redirect to overview */}
                <Route path="/" element={<Navigate to="/overview" replace />} />

                {/* 404 Route */}
                <Route path="*" element={<NotFound />} />
              </Routes>
            </Suspense>
          </BrowserRouter>
        </AuthProvider>
      </ToastProvider>
    </ThemeProvider>
  );
}
