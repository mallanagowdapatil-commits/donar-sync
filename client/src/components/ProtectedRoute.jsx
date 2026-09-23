import React from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { Activity } from 'lucide-react';

export default function ProtectedRoute({ children, allowedRoles = [] }) {
  const { user, loading } = useAuth();
  const location = useLocation();

  if (loading) {
    return (
      <div className="min-h-[60vh] flex flex-col items-center justify-center space-y-4">
        <div className="w-12 h-12 rounded-xl bg-brand-primary/10 border border-brand-primary/30 flex items-center justify-center animate-pulse">
          <Activity className="h-6 w-6 text-brand-primary animate-spin" />
        </div>
        <p className="text-xs text-slate-400 font-semibold tracking-wider uppercase">Verifying Clinical Security Protocol...</p>
      </div>
    );
  }

  // Not authenticated
  if (!user) {
    return <Navigate to={`/login?redirect=${encodeURIComponent(location.pathname)}`} replace />;
  }

  // Role authorized check
  if (allowedRoles.length > 0 && !allowedRoles.includes(user.role)) {
    return <Navigate to="/unauthorized" state={{ attemptedPath: location.pathname, userRole: user.role }} replace />;
  }

  return children;
}
