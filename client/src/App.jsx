import React, { useState } from 'react';
import { BrowserRouter as Router, Routes, Route, Link, useNavigate, useLocation } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import { ThemeProvider, useTheme } from './context/ThemeContext';
import ProtectedRoute from './components/ProtectedRoute';
import NotificationCenter from './components/NotificationCenter';
import Chatbot from './components/Chatbot';
import RoleSelectionModal from './components/RoleSelectionModal';

// Pages
import LandingPage from './pages/LandingPage';
import BloodSearch from './pages/BloodSearch';
import DonorRegistration from './pages/DonorRegistration';
import { LoginPage, RegisterPage } from './pages/AuthPages';
import DonorDashboard from './pages/DonorDashboard';
import ReceiverDashboard from './pages/ReceiverDashboard';
import BloodBankDashboard from './pages/BloodBankDashboard';
import HospitalDashboard from './pages/HospitalDashboard';
import OrganizationDashboard from './pages/OrganizationDashboard';
import AdminDashboard from './pages/AdminDashboard';
import SystemHealthPage from './pages/SystemHealthPage';
import UnauthorizedPage from './pages/UnauthorizedPage';
import NotFoundPage from './pages/NotFoundPage';

import { Activity, LogOut, Menu, X, Shield, Search, UserCheck, Sun, Moon, Laptop } from 'lucide-react';

function Navbar({ onOpenRoleModal }) {
  const { user, logout } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const navigate = useNavigate();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const handleLogout = () => {
    logout();
    navigate('/');
    setMobileMenuOpen(false);
  };

  const getDashboardPath = (role) => {
    switch (role) {
      case 'Donor': return '/dashboard/donor';
      case 'Receiver':
      case 'Patient': return '/dashboard/receiver';
      case 'Blood Bank': return '/dashboard/bank';
      case 'Hospital': return '/dashboard/hospital';
      case 'NGO':
      case 'Organization': return '/dashboard/organization';
      case 'Admin': return '/dashboard/admin';
      default: return '/';
    }
  };

  return (
    <nav className="sticky top-0 z-40 w-full glass-panel border-b border-clinical-border font-sans transition-colors">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Logo */}
          <Link to="/" className="flex items-center space-x-2 text-white font-extrabold text-xl tracking-tight">
            <span className="flex items-center justify-center w-8 h-8 rounded-lg bg-brand-primary neon-glow-red">
              <Activity className="h-5 w-5 text-white animate-heartbeat" />
            </span>
            <span className="text-white">Donor<span className="text-brand-primary">Sync</span></span>
          </Link>

          {/* Desktop Nav Items */}
          <div className="hidden md:flex items-center space-x-5 text-xs font-semibold">
            <Link to="/search" className="text-slate-300 hover:text-brand-primary transition-colors flex items-center space-x-1">
              <Search className="h-4 w-4" />
              <span>Search Availability</span>
            </Link>
            <Link to="/register-donor" className="text-slate-300 hover:text-brand-primary transition-colors flex items-center space-x-1">
              <UserCheck className="h-4 w-4" />
              <span>Register as Donor</span>
            </Link>

            {/* Theme Toggle Button */}
            <button
              onClick={toggleTheme}
              className="p-2 rounded-lg text-slate-400 hover:text-white hover:bg-slate-900 transition-colors cursor-pointer"
              title={`Theme: ${theme.toUpperCase()} (Click to toggle)`}
            >
              {theme === 'dark' ? <Moon className="h-4 w-4 text-yellow-400" /> : theme === 'light' ? <Sun className="h-4 w-4 text-orange-400" /> : <Laptop className="h-4 w-4 text-blue-400" />}
            </button>

            {/* In-App Notifications Dropdown */}
            {user && <NotificationCenter />}

            {user ? (
              <div className="flex items-center space-x-3 pl-3 border-l border-slate-800">
                <Link 
                  to={getDashboardPath(user.role)}
                  className="px-3 py-1.5 rounded-lg bg-navy-800 border border-slate-700 text-slate-200 hover:border-brand-primary/50 transition-all flex items-center space-x-1.5"
                >
                  <Shield className="h-3.5 w-3.5 text-brand-primary" />
                  <span>{user.role} Dashboard</span>
                </Link>

                <div className="flex items-center space-x-2">
                  <span className="text-slate-400 font-medium">{user.name.split(' ')[0]}</span>
                  <button 
                    onClick={handleLogout}
                    className="p-1.5 rounded-lg text-slate-400 hover:text-brand-primary hover:bg-slate-900 transition-all cursor-pointer"
                    title="Log Out"
                  >
                    <LogOut className="h-4 w-4" />
                  </button>
                </div>
              </div>
            ) : (
              <div className="flex items-center space-x-3 pl-3 border-l border-slate-800">
                <button 
                  onClick={onOpenRoleModal}
                  className="text-slate-300 hover:text-white transition-colors cursor-pointer font-semibold"
                >
                  Log In
                </button>
                <Link 
                  to="/register" 
                  className="px-4 py-2 rounded-lg bg-brand-primary hover:bg-brand-hover text-white font-bold transition-all shadow-md hover:shadow-brand-primary/25"
                >
                  Register
                </Link>
              </div>
            )}
          </div>

          {/* Mobile Menu Toggle */}
          <div className="md:hidden flex items-center space-x-2">
            {user && <NotificationCenter />}
            <button
              onClick={toggleTheme}
              className="p-1.5 rounded-md text-slate-400 hover:text-white"
            >
              {theme === 'dark' ? <Moon className="h-4 w-4 text-yellow-400" /> : <Sun className="h-4 w-4 text-orange-400" />}
            </button>
            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="p-2 rounded-md text-slate-400 hover:text-white focus:outline-none"
            >
              {mobileMenuOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
            </button>
          </div>
        </div>
      </div>

      {/* Mobile Drawer */}
      {mobileMenuOpen && (
        <div className="md:hidden px-3 pt-2 pb-4 space-y-2 bg-slate-950 border-b border-slate-800 text-xs font-semibold">
          <Link 
            to="/search" 
            className="block px-3 py-2 rounded-md text-slate-300 hover:bg-slate-900 hover:text-white"
            onClick={() => setMobileMenuOpen(false)}
          >
            Search Availability
          </Link>
          <Link 
            to="/register-donor" 
            className="block px-3 py-2 rounded-md text-slate-300 hover:bg-slate-900 hover:text-white"
            onClick={() => setMobileMenuOpen(false)}
          >
            Register as Donor
          </Link>

          {user ? (
            <>
              <Link 
                to={getDashboardPath(user.role)} 
                className="block px-3 py-2 rounded-md text-brand-primary bg-slate-900"
                onClick={() => setMobileMenuOpen(false)}
              >
                {user.role} Dashboard
              </Link>
              <div className="border-t border-slate-800 pt-2 flex justify-between items-center px-3">
                <span className="text-slate-400">{user.name}</span>
                <button 
                  onClick={handleLogout}
                  className="flex items-center space-x-1 text-slate-400 hover:text-brand-primary cursor-pointer"
                >
                  <LogOut className="h-4 w-4" />
                  <span>Log Out</span>
                </button>
              </div>
            </>
          ) : (
            <div className="pt-3 border-t border-slate-800 flex items-center justify-around space-x-2">
              <button 
                onClick={() => { setMobileMenuOpen(false); onOpenRoleModal(); }}
                className="w-full text-center px-4 py-2 text-slate-300 hover:text-white cursor-pointer"
              >
                Log In
              </button>
              <Link 
                to="/register" 
                className="w-full text-center px-4 py-2 rounded-lg bg-brand-primary text-white font-bold"
                onClick={() => setMobileMenuOpen(false)}
              >
                Register
              </Link>
            </div>
          )}
        </div>
      )}
    </nav>
  );
}

function MainApp() {
  const [showRoleModal, setShowRoleModal] = useState(false);

  return (
    <div className="min-h-screen flex flex-col justify-between font-sans">
      <div>
        <Navbar onOpenRoleModal={() => setShowRoleModal(true)} />
        <main>
          <Routes>
            {/* Public Routes */}
            <Route path="/" element={<LandingPage onOpenRoleModal={() => setShowRoleModal(true)} />} />
            <Route path="/search" element={<BloodSearch />} />
            <Route path="/register-donor" element={<DonorRegistration />} />
            <Route path="/login" element={<LoginPage />} />
            <Route path="/register" element={<RegisterPage />} />
            <Route path="/unauthorized" element={<UnauthorizedPage />} />
            
            {/* Role-Guarded Protected Routes */}
            <Route 
              path="/dashboard/donor" 
              element={
                <ProtectedRoute allowedRoles={['Donor', 'Admin']}>
                  <DonorDashboard />
                </ProtectedRoute>
              } 
            />
            <Route 
              path="/dashboard/receiver" 
              element={
                <ProtectedRoute allowedRoles={['Receiver', 'Patient', 'Admin']}>
                  <ReceiverDashboard />
                </ProtectedRoute>
              } 
            />
            <Route 
              path="/dashboard/bank" 
              element={
                <ProtectedRoute allowedRoles={['Blood Bank', 'Admin']}>
                  <BloodBankDashboard />
                </ProtectedRoute>
              } 
            />
            <Route 
              path="/dashboard/hospital" 
              element={
                <ProtectedRoute allowedRoles={['Hospital', 'Admin']}>
                  <HospitalDashboard />
                </ProtectedRoute>
              } 
            />
            <Route 
              path="/dashboard/organization" 
              element={
                <ProtectedRoute allowedRoles={['NGO', 'Organization', 'Admin']}>
                  <OrganizationDashboard />
                </ProtectedRoute>
              } 
            />
            <Route 
              path="/dashboard/admin" 
              element={
                <ProtectedRoute allowedRoles={['Admin']}>
                  <AdminDashboard />
                </ProtectedRoute>
              } 
            />
            <Route 
              path="/admin/system-health" 
              element={
                <ProtectedRoute allowedRoles={['Admin']}>
                  <SystemHealthPage />
                </ProtectedRoute>
              } 
            />
            
            {/* 404 Catch-All */}
            <Route path="*" element={<NotFoundPage />} />
          </Routes>
        </main>
      </div>

      {/* Centered Role Selection Modal */}
      <RoleSelectionModal 
        isOpen={showRoleModal} 
        onClose={() => setShowRoleModal(false)} 
      />

      {/* Floating Healthcare AI Assistant */}
      <Chatbot />

      {/* Footer */}
      <footer className="w-full py-8 mt-12 bg-slate-950/80 border-t border-slate-900 text-center text-xs text-slate-500">
        <div className="max-w-7xl mx-auto px-4 space-y-1">
          <p>© {new Date().getFullYear()} DonorSync AI. Certified under Digital Healthcare Privacy Frameworks.</p>
          <p className="text-[10px] text-slate-600">Built with React 18, Vite, Express.js REST Gateway, and Supabase PostgreSQL.</p>
        </div>
      </footer>
    </div>
  );
}

export default function App() {
  return (
    <ThemeProvider>
      <AuthProvider>
        <Router>
          <MainApp />
        </Router>
      </AuthProvider>
    </ThemeProvider>
  );
}
