import React from 'react';
import { Link } from 'react-router-dom';
import { Compass, Home, Search } from 'lucide-react';

export default function NotFoundPage() {
  return (
    <div className="max-w-md mx-auto my-20 p-8 rounded-2xl glass-panel border border-clinical-border text-center space-y-6">
      <div className="w-16 h-16 rounded-full bg-slate-800/60 border border-slate-700 flex items-center justify-center mx-auto text-slate-400">
        <Compass className="h-8 w-8 text-brand-primary" />
      </div>

      <div className="space-y-2">
        <h2 className="text-3xl font-extrabold text-white">404 - Page Not Found</h2>
        <p className="text-xs text-slate-400 leading-relaxed">
          The requested clinical pathway or resource does not exist or has been relocated.
        </p>
      </div>

      <div className="flex flex-col sm:flex-row items-center justify-center gap-3 pt-2">
        <Link
          to="/"
          className="w-full sm:w-auto px-5 py-2.5 rounded-lg bg-brand-primary hover:bg-brand-hover text-white text-xs font-bold transition-all flex items-center justify-center space-x-1.5"
        >
          <Home className="h-3.5 w-3.5" />
          <span>Return Home</span>
        </Link>
        <Link
          to="/search"
          className="w-full sm:w-auto px-5 py-2.5 rounded-lg bg-navy-800 hover:bg-slate-800 border border-slate-700 text-slate-300 text-xs font-semibold transition-all flex items-center justify-center space-x-1.5"
        >
          <Search className="h-3.5 w-3.5" />
          <span>Search Blood</span>
        </Link>
      </div>
    </div>
  );
}
