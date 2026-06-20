import React, { useEffect } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import { initializeAuthSession } from './store/authStore';

// Layouts
import AuthLayout from './layouts/AuthLayout';
import DashboardLayout from './layouts/DashboardLayout';

// Route Guards
import ProtectedRoute from './routes/ProtectedRoute';
import GuestRoute from './routes/GuestRoute';

// Pages
import Login from './pages/Login';
import Register from './pages/Register';
import ForgotPassword from './pages/ForgotPassword';
import ResetPassword from './pages/ResetPassword';
import Dashboard from './pages/Dashboard';
import Settings from './pages/Settings';

export default function App() {
  // Check session active status on load
  useEffect(() => {
    initializeAuthSession();
  }, []);

  return (
    <>
      <Toaster
        position="top-right"
        toastOptions={{
          className: 'bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-100 border border-slate-100 dark:border-white/10 rounded-xl font-semibold text-sm shadow-xl',
          duration: 3000,
        }}
      />
      <BrowserRouter>
        <Routes>
          {/* Guest/Auth Routes wrapper */}
          <Route
            path="/login"
            element={
              <GuestRoute>
                <AuthLayout>
                  <Login />
                </AuthLayout>
              </GuestRoute>
            }
          />
          <Route
            path="/register"
            element={
              <GuestRoute>
                <AuthLayout>
                  <Register />
                </AuthLayout>
              </GuestRoute>
            }
          />
          <Route
            path="/forgot-password"
            element={
              <GuestRoute>
                <AuthLayout>
                  <ForgotPassword />
                </AuthLayout>
              </GuestRoute>
            }
          />
          {/* Support both route formats for reset password link from backend */}
          <Route
            path="/reset-password"
            element={
              <GuestRoute>
                <AuthLayout>
                  <ResetPassword />
                </AuthLayout>
              </GuestRoute>
            }
          />
          <Route
            path="/reset-password.html"
            element={
              <GuestRoute>
                <AuthLayout>
                  <ResetPassword />
                </AuthLayout>
              </GuestRoute>
            }
          />

          {/* Protected Routes wrapper */}
          <Route
            path="/dashboard"
            element={
              <ProtectedRoute>
                <DashboardLayout>
                  <Dashboard />
                </DashboardLayout>
              </ProtectedRoute>
            }
          />
          <Route
            path="/settings"
            element={
              <ProtectedRoute>
                <DashboardLayout>
                  <Settings />
                </DashboardLayout>
              </ProtectedRoute>
            }
          />

          {/* Fallback routing */}
          <Route path="/" element={<Navigate to="/dashboard" replace />} />
          <Route path="*" element={<Navigate to="/dashboard" replace />} />
        </Routes>
      </BrowserRouter>
    </>
  );
}
