import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { ShieldAlert, ArrowLeft, Home } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

export default function UnauthorizedPage() {
  const { user } = useAuth();
  const location = useLocation();
  const attemptedPath = location.state?.attemptedPath || 'the requested dashboard';

  const getDashboardPath = (role) => {
    switch (role) {
      case 'Donor': return '/dashboard/donor';
      case 'Receiver': return '/dashboard/receiver';
      case 'Blood Bank': return '/dashboard/bank';
      case 'Hospital': return '/dashboard/hospital';
      case 'Admin': return '/dashboard/admin';
      default: return '/';
    }
  };

  return (
    <div className="max-w-lg mx-auto my-16 p-8 rounded-2xl glass-panel border border-red-500/30 text-center space-y-6">
      <div className="w-16 h-16 rounded-full bg-red-500/10 border border-red-500/30 flex items-center justify-center mx-auto text-red-500 animate-pulse">
        <ShieldAlert className="h-8 w-8" />
      </div>

      <div className="space-y-2">
        <h2 className="text-2xl font-extrabold text-white">403 - Access Restricted</h2>
        <p className="text-xs text-slate-400 leading-relaxed">
          Your current clinical credential role ({user?.role || 'Guest'}) does not have permission to access <code className="text-brand-primary bg-slate-900 px-1.5 py-0.5 rounded">{attemptedPath}</code>.
        </p>
      </div>

      <div className="p-4 rounded-xl bg-slate-900/60 border border-slate-800 text-left text-xs text-slate-400 space-y-1.5">
        <p className="font-semibold text-slate-300">Security Clearance Rule:</p>
        <p>DonorSync enforces strict HIPAA role isolation. To access this dashboard, please log in with an authorized account credential for that portal.</p>
      </div>

      <div className="flex flex-col sm:flex-row items-center justify-center gap-3 pt-2">
        {user && (
          <Link
            to={getDashboardPath(user.role)}
            className="w-full sm:w-auto px-5 py-2.5 rounded-lg bg-brand-primary hover:bg-brand-hover text-white text-xs font-bold transition-all flex items-center justify-center space-x-1.5"
          >
            <span>Go to My {user.role} Dashboard</span>
          </Link>
        )}
        <Link
          to="/"
          className="w-full sm:w-auto px-5 py-2.5 rounded-lg bg-navy-800 hover:bg-slate-800 border border-slate-700 text-slate-300 text-xs font-semibold transition-all flex items-center justify-center space-x-1.5"
        >
          <Home className="h-3.5 w-3.5" />
          <span>Return Home</span>
        </Link>
      </div>
    </div>
  );
}
