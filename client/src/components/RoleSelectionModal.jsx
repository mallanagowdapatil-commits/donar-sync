import React, { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { User, Heart, Building, Building2, Users, Shield, X, ArrowRight } from 'lucide-react';

export default function RoleSelectionModal({ isOpen, onClose }) {
  const navigate = useNavigate();

  // Close on ESC key press
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape') onClose();
    };
    if (isOpen) {
      document.addEventListener('keydown', handleKeyDown);
      document.body.style.overflow = 'hidden';
    }
    return () => {
      document.removeEventListener('keydown', handleKeyDown);
      document.body.style.overflow = 'unset';
    };
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const roles = [
    {
      id: 'Receiver',
      label: 'Patient / Receiver',
      desc: 'Request urgent emergency blood and track matched live donors',
      icon: User,
      color: 'text-blue-400',
      borderHover: 'hover:border-blue-500/50',
      badgeBg: 'bg-blue-500/10 text-blue-400'
    },
    {
      id: 'Donor',
      label: 'Life Saver / Donor',
      desc: 'Receive emergency nearby radius alerts and donate blood',
      icon: Heart,
      color: 'text-brand-primary',
      borderHover: 'hover:border-brand-primary/50',
      badgeBg: 'bg-brand-primary/10 text-brand-primary'
    },
    {
      id: 'Hospital',
      label: 'Hospital / Clinical Center',
      desc: 'Submit clinical emergency requests and monitor matched units',
      icon: Building,
      color: 'text-emerald-400',
      borderHover: 'hover:border-emerald-500/50',
      badgeBg: 'bg-emerald-500/10 text-emerald-400'
    },
    {
      id: 'Blood Bank',
      label: 'Blood Bank & Storage Center',
      desc: 'Manage cold-chain stocks across 8 groups and track batch expiry',
      icon: Building2,
      color: 'text-amber-400',
      borderHover: 'hover:border-amber-500/50',
      badgeBg: 'bg-amber-500/10 text-amber-400'
    },
    {
      id: 'NGO',
      label: 'NGO / Community Organization',
      desc: 'Coordinate donation drives, campus camps, and volunteer networks',
      icon: Users,
      color: 'text-purple-400',
      borderHover: 'hover:border-purple-500/50',
      badgeBg: 'bg-purple-500/10 text-purple-400'
    }
  ];

  const handleSelectRole = (roleId) => {
    onClose();
    navigate(`/login?role=${encodeURIComponent(roleId)}`);
  };

  const handleAdminAccess = () => {
    onClose();
    navigate('/login?role=Admin');
  };

  return (
    <div 
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-md transition-opacity duration-250 animate-in fade-in"
      onClick={onClose}
    >
      <div 
        className="relative w-full max-w-lg p-6 sm:p-8 rounded-3xl glass-panel border border-clinical-border shadow-2xl transition-all duration-250 transform animate-in zoom-in-95 slide-in-from-bottom-4"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute top-5 right-5 p-2 rounded-full text-slate-400 hover:text-white hover:bg-slate-800/60 transition-colors cursor-pointer"
          title="Close (Esc)"
        >
          <X className="h-5 w-5" />
        </button>

        {/* Modal Header */}
        <div className="text-center mb-6">
          <div className="inline-flex items-center justify-center w-12 h-12 rounded-2xl bg-brand-primary/10 border border-brand-primary/30 mb-3 neon-glow-red">
            <Heart className="h-6 w-6 text-brand-primary" />
          </div>
          <h2 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight">
            Continue to <span className="text-brand-primary">DonorSync</span>
          </h2>
          <p className="text-xs text-slate-400 mt-1.5">
            Select your clinical portal to proceed with verified authentication.
          </p>
        </div>

        {/* Role Options */}
        <div className="space-y-2.5">
          {roles.map((r) => {
            const Icon = r.icon;
            return (
              <button
                key={r.id}
                onClick={() => handleSelectRole(r.id)}
                className={`w-full p-3.5 rounded-2xl bg-slate-900/60 hover:bg-slate-900 border border-slate-800/80 ${r.borderHover} text-left transition-all duration-200 flex items-center justify-between group cursor-pointer hover:shadow-lg hover:-translate-y-0.5`}
              >
                <div className="flex items-center space-x-3.5">
                  <div className={`p-2.5 rounded-xl ${r.badgeBg} shrink-0`}>
                    <Icon className={`h-5 w-5 ${r.color}`} />
                  </div>
                  <div>
                    <h4 className="text-sm font-bold text-white group-hover:text-brand-primary transition-colors">
                      {r.label}
                    </h4>
                    <p className="text-[11px] text-slate-400 line-clamp-1">
                      {r.desc}
                    </p>
                  </div>
                </div>
                <ArrowRight className="h-4 w-4 text-slate-600 group-hover:text-white group-hover:translate-x-1 transition-all shrink-0 ml-2" />
              </button>
            );
          })}
        </div>

        {/* Footer with Discreet Admin Link & Register */}
        <div className="mt-6 pt-4 border-t border-slate-800/80 flex items-center justify-between text-xs text-slate-400">
          <button
            onClick={handleAdminAccess}
            className="flex items-center space-x-1.5 text-slate-500 hover:text-slate-300 transition-colors cursor-pointer"
          >
            <Shield className="h-3.5 w-3.5" />
            <span>Administrator Access</span>
          </button>

          <button
            onClick={() => { onClose(); navigate('/register'); }}
            className="text-brand-primary hover:underline font-semibold cursor-pointer"
          >
            Create New Account
          </button>
        </div>
      </div>
    </div>
  );
}
