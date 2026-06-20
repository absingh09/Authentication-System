// Reusable SaaS Auth Module Exports
// Simply copy this folder to another project to integrate SaaS authentication

export { useAuthStore, initializeAuthSession } from './store/authStore';
export { useAuth } from './hooks/useAuth';

// Route Guards
export { default as ProtectedRoute } from './components/ProtectedRoute';
export { default as GuestRoute } from './components/GuestRoute';

// Authentication Pages
export { default as Login } from './pages/Login';
export { default as Register } from './pages/Register';
export { default as ForgotPassword } from './pages/ForgotPassword';
export { default as ResetPassword } from './pages/ResetPassword';
