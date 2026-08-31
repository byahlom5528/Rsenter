import React, { Suspense, lazy } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import { Layout } from './components/layout/Layout';
import { EntryPage } from './pages/EntryPage';

// Code-split pages for high performance and fast initial load
const RegisterPage = lazy(() => import('./pages/RegisterPage').then((m) => ({ default: m.RegisterPage })));
const DashboardPage = lazy(() => import('./pages/DashboardPage').then((m) => ({ default: m.DashboardPage })));
const BackpackPage = lazy(() => import('./pages/BackpackPage').then((m) => ({ default: m.BackpackPage })));
const OrgTreePage = lazy(() => import('./pages/OrgTreePage').then((m) => ({ default: m.OrgTreePage })));
const AdminPage = lazy(() => import('./pages/AdminPage').then((m) => ({ default: m.AdminPage })));

const LoadingSpinner = () => (
  <div className="min-h-[60vh] flex flex-col items-center justify-center gap-3">
    <div className="w-10 h-10 border-4 border-brand-600 border-t-transparent rounded-full animate-spin"></div>
    <span className="text-xs text-slate-500 font-semibold">טוען...</span>
  </div>
);

// Protected Route Component for standard user pages
const ProtectedRoute: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { currentUser, isLoading } = useAuth();

  if (isLoading) {
    return <LoadingSpinner />;
  }

  if (!currentUser) {
    return <Navigate to="/" replace />;
  }

  return <>{children}</>;
};

// Protected Admin Route
const AdminRoute: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { currentUser, isAdmin, isLoading } = useAuth();

  if (isLoading) {
    return <LoadingSpinner />;
  }

  if (!currentUser || !isAdmin) {
    return <Navigate to="/" replace />;
  }

  return <>{children}</>;
};

export const App: React.FC = () => {
  return (
    <AuthProvider>
      <BrowserRouter future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
        <Layout>
          <Suspense fallback={<LoadingSpinner />}>
            <Routes>
              <Route path="/" element={<EntryPage />} />
              <Route path="/register" element={<RegisterPage />} />
              
              <Route
                path="/dashboard"
                element={
                  <ProtectedRoute>
                    <DashboardPage />
                  </ProtectedRoute>
                }
              />

              <Route
                path="/backpack"
                element={
                  <ProtectedRoute>
                    <BackpackPage />
                  </ProtectedRoute>
                }
              />

              <Route
                path="/org-tree"
                element={
                  <ProtectedRoute>
                    <OrgTreePage />
                  </ProtectedRoute>
                }
              />

              <Route
                path="/admin"
                element={
                  <AdminRoute>
                    <AdminPage />
                  </AdminRoute>
                }
              />

              <Route path="*" element={<Navigate to="/" replace />} />
            </Routes>
          </Suspense>
        </Layout>
      </BrowserRouter>
    </AuthProvider>
  );
};
