import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { ShieldAlert, User, Shield, Building, Heart, ArrowRight, Phone, Mail, KeyRound, CheckCircle2, Lock } from 'lucide-react';

export function LoginPage() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  // URL query parameter for role (e.g. ?role=Donor)
  const queryParams = new URLSearchParams(location.search);
  const initialRole = queryParams.get('role') || '';

  const [activeTab, setActiveTab] = useState('email'); // 'email' | 'phone'
  const [selectedRole, setSelectedRole] = useState(initialRole);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  // Phone OTP state
  const [phoneNumber, setPhoneNumber] = useState('');
  const [otpCode, setOtpCode] = useState('');
  const [otpSent, setOtpSent] = useState(false);
  const [otpTimer, setOtpTimer] = useState(0);
  const [otpInfo, setOtpInfo] = useState('');

  // Forgot password state
  const [showForgotModal, setShowForgotModal] = useState(false);
  const [forgotEmail, setForgotEmail] = useState('');
  const [forgotStatus, setForgotStatus] = useState('');

  useEffect(() => {
    let interval;
    if (otpTimer > 0) {
      interval = setInterval(() => setOtpTimer(t => t - 1), 1000);
    }
    return () => clearInterval(interval);
  }, [otpTimer]);

  const redirectDashboard = (role) => {
    switch (role) {
      case 'Donor': navigate('/dashboard/donor'); break;
      case 'Receiver':
      case 'Patient': navigate('/dashboard/receiver'); break;
      case 'Blood Bank': navigate('/dashboard/bank'); break;
      case 'Hospital': navigate('/dashboard/hospital'); break;
      case 'NGO':
      case 'Organization': navigate('/dashboard/organization'); break;
      case 'Admin': navigate('/dashboard/admin'); break;
      default: navigate('/');
    }
  };

  const handleEmailSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: email.trim(),
          password,
          expectedRole: selectedRole || undefined
        })
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Invalid credentials. Please verify and try again.');
      }

      localStorage.setItem('donorsync_token', data.token);
      localStorage.setItem('donorsync_user', JSON.stringify(data.user));
      sessionStorage.setItem('just_logged_in', 'true');

      // Request browser notification if supported
      if ('Notification' in window && Notification.permission === 'granted') {
        try {
          new Notification('DonorSync: Login Successful', {
            body: `Welcome back, ${data.user.name}! Your real-time QR pass is generated.`,
          });
        } catch (e) {}
      }

      // Force context refresh or redirect
      window.location.href = getRoleUrl(data.user.role);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const getRoleUrl = (role) => {
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

  const handleSendOtp = async () => {
    if (!phoneNumber.trim() || phoneNumber.trim().length < 8) {
      setError('Please enter a valid phone number with country code (e.g. +91 9876543210)');
      return;
    }

    setError('');
    setLoading(true);

    try {
      const res = await fetch('/api/auth/phone/send-otp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phone: phoneNumber.trim() })
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error);

      setOtpSent(true);
      setOtpTimer(60);
      setOtpInfo(data.debugCode ? `Verification code dispatched! Demo verification code: ${data.debugCode}` : 'Verification code sent to your phone.');
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyOtp = async (e) => {
    e.preventDefault();
    if (!otpCode.trim()) {
      setError('Please enter the 6-digit verification code.');
      return;
    }

    setError('');
    setLoading(true);

    try {
      const res = await fetch('/api/auth/phone/verify-otp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          phone: phoneNumber.trim(),
          otp: otpCode.trim(),
          role: selectedRole || 'Donor'
        })
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error);

      localStorage.setItem('donorsync_token', data.token);
      localStorage.setItem('donorsync_user', JSON.stringify(data.user));
      sessionStorage.setItem('just_logged_in', 'true');

      window.location.href = getRoleUrl(data.user.role);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleForgotSubmit = async (e) => {
    e.preventDefault();
    if (!forgotEmail) return;
    try {
      const res = await fetch('/api/auth/forgot-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: forgotEmail.trim() })
      });
      const data = await res.json();
      setForgotStatus(data.message);
    } catch (err) {
      setForgotStatus('Request dispatched successfully.');
    }
  };

  return (
    <div className="max-w-md mx-auto my-12 p-8 rounded-3xl glass-panel border border-clinical-border font-sans relative shadow-2xl animate-in fade-in slide-in-from-bottom-3 duration-250 text-left">
      {/* Role Banner if pre-selected */}
      {selectedRole && (
        <div className="mb-6 p-3 rounded-2xl bg-brand-primary/10 border border-brand-primary/30 flex items-center justify-between text-xs text-brand-primary">
          <div className="flex items-center space-x-2">
            <Shield className="h-4 w-4" />
            <span className="font-bold">Portal: {selectedRole}</span>
          </div>
          <button
            onClick={() => setSelectedRole('')}
            className="text-[11px] underline text-slate-400 hover:text-white cursor-pointer"
          >
            Change
          </button>
        </div>
      )}

      <div className="text-center mb-6">
        <h2 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight">
          Welcome to <span className="text-brand-primary">DonorSync</span>
        </h2>
        <p className="text-xs text-slate-400 mt-1.5">
          Sign in with verified medical credentials to access your dashboard.
        </p>
      </div>

      {/* Tabs: Email vs Phone OTP */}
      <div className="grid grid-cols-2 gap-2 p-1.5 rounded-2xl bg-slate-900/80 border border-slate-800 mb-6 text-xs font-bold">
        <button
          type="button"
          onClick={() => { setActiveTab('email'); setError(''); }}
          className={`py-2 rounded-xl transition-all cursor-pointer flex items-center justify-center space-x-1.5 ${
            activeTab === 'email' 
              ? 'bg-brand-primary text-white shadow-md' 
              : 'text-slate-400 hover:text-white'
          }`}
        >
          <Mail className="h-3.5 w-3.5" />
          <span>Email & Password</span>
        </button>
        <button
          type="button"
          onClick={() => { setActiveTab('phone'); setError(''); }}
          className={`py-2 rounded-xl transition-all cursor-pointer flex items-center justify-center space-x-1.5 ${
            activeTab === 'phone' 
              ? 'bg-brand-primary text-white shadow-md' 
              : 'text-slate-400 hover:text-white'
          }`}
        >
          <Phone className="h-3.5 w-3.5" />
          <span>Phone & OTP</span>
        </button>
      </div>

      {error && (
        <div className="p-3 mb-6 rounded-xl bg-red-500/10 border border-red-500/30 text-xs text-red-400 flex items-start space-x-2 animate-in fade-in duration-150">
          <ShieldAlert className="h-4 w-4 shrink-0 mt-0.5" />
          <span className="leading-relaxed">{error}</span>
        </div>
      )}

      {/* Tab 1: Email + Password Form */}
      {activeTab === 'email' ? (
        <form onSubmit={handleEmailSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1.5">
              Email Address
            </label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="e.g. doctor@hospital.com"
              required
              className="w-full px-4 py-2.5 rounded-xl glass-input text-sm text-white placeholder-slate-600 focus:outline-none"
            />
          </div>

          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider">
                Password
              </label>
              <button
                type="button"
                onClick={() => setShowForgotModal(true)}
                className="text-[11px] text-brand-primary hover:underline cursor-pointer"
              >
                Forgot Password?
              </button>
            </div>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              required
              className="w-full px-4 py-2.5 rounded-xl glass-input text-sm text-white placeholder-slate-600 focus:outline-none"
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full py-3 rounded-xl bg-brand-primary hover:bg-brand-hover text-white font-bold text-sm tracking-wide transition-all shadow-lg shadow-brand-primary/20 cursor-pointer flex items-center justify-center space-x-1.5 mt-2"
          >
            <span>{loading ? 'Verifying Credentials...' : 'Sign In'}</span>
            <ArrowRight className="h-4 w-4" />
          </button>
        </form>
      ) : (
        /* Tab 2: Phone + OTP Form */
        <div className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1.5">
              Mobile Phone Number
            </label>
            <div className="flex space-x-2">
              <input
                type="tel"
                value={phoneNumber}
                onChange={(e) => setPhoneNumber(e.target.value)}
                placeholder="+91 9876543210"
                disabled={otpSent}
                className="w-full px-4 py-2.5 rounded-xl glass-input text-sm text-white placeholder-slate-600 focus:outline-none"
              />
              {!otpSent ? (
                <button
                  type="button"
                  onClick={handleSendOtp}
                  disabled={loading}
                  className="px-4 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-white text-xs font-bold shrink-0 transition-colors cursor-pointer"
                >
                  Send Code
                </button>
              ) : (
                <button
                  type="button"
                  onClick={() => { setOtpSent(false); setOtpCode(''); }}
                  className="px-3 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs shrink-0 cursor-pointer"
                >
                  Edit
                </button>
              )}
            </div>
          </div>

          {otpInfo && (
            <div className="p-3 rounded-xl bg-blue-500/10 border border-blue-500/30 text-xs text-blue-400">
              {otpInfo}
            </div>
          )}

          {otpSent && (
            <form onSubmit={handleVerifyOtp} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1.5">
                  Enter 6-Digit Verification Code
                </label>
                <input
                  type="text"
                  maxLength={6}
                  value={otpCode}
                  onChange={(e) => setOtpCode(e.target.value)}
                  placeholder="123456"
                  required
                  className="w-full px-4 py-2.5 rounded-xl glass-input text-center tracking-widest font-mono text-lg text-white placeholder-slate-600 focus:outline-none"
                />
              </div>

              <div className="flex justify-between items-center text-xs">
                <span className="text-slate-400">
                  {otpTimer > 0 ? `Resend code in ${otpTimer}s` : 'Code expired?'}
                </span>
                {otpTimer === 0 && (
                  <button
                    type="button"
                    onClick={handleSendOtp}
                    className="text-brand-primary font-bold hover:underline cursor-pointer"
                  >
                    Resend Code
                  </button>
                )}
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full py-3 rounded-xl bg-brand-primary hover:bg-brand-hover text-white font-bold text-sm tracking-wide transition-all shadow-lg shadow-brand-primary/20 cursor-pointer flex items-center justify-center space-x-1.5"
              >
                <span>{loading ? 'Verifying...' : 'Authenticate & Enter'}</span>
                <ArrowRight className="h-4 w-4" />
              </button>
            </form>
          )}
        </div>
      )}

      {/* Account Registration Link */}
      <div className="mt-8 pt-6 border-t border-slate-800/80 text-center text-xs text-slate-400">
        <span>Don't have an account? </span>
        <Link to="/register" className="text-brand-primary font-bold hover:underline">
          Register for DonorSync
        </Link>
      </div>

      {/* Forgot Password Modal */}
      {showForgotModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-sm">
          <div className="w-full max-w-sm p-6 rounded-2xl glass-panel border border-clinical-border shadow-2xl">
            <h3 className="text-lg font-bold text-white mb-2">Reset Account Password</h3>
            <p className="text-xs text-slate-400 mb-4">
              Enter your registered clinical email address. We will dispatch a secure recovery link.
            </p>
            {forgotStatus ? (
              <div className="p-3 mb-4 rounded-lg bg-green-500/10 border border-green-500/20 text-xs text-green-400">
                {forgotStatus}
              </div>
            ) : (
              <form onSubmit={handleForgotSubmit} className="space-y-4">
                <input
                  type="email"
                  value={forgotEmail}
                  onChange={(e) => setForgotEmail(e.target.value)}
                  placeholder="name@organization.com"
                  required
                  className="w-full px-4 py-2.5 rounded-lg glass-input text-xs text-white"
                />
                <div className="flex space-x-2">
                  <button
                    type="button"
                    onClick={() => { setShowForgotModal(false); setForgotStatus(''); }}
                    className="w-1/2 py-2 rounded-lg bg-slate-800 text-slate-400 text-xs font-semibold hover:text-white"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="w-1/2 py-2 rounded-lg bg-brand-primary text-white text-xs font-bold"
                  >
                    Send Link
                  </button>
                </div>
              </form>
            )}
            {forgotStatus && (
              <button
                onClick={() => { setShowForgotModal(false); setForgotStatus(''); }}
                className="w-full mt-3 py-2 rounded-lg bg-slate-800 text-white text-xs font-bold"
              >
                Close
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

export function RegisterPage() {
  const navigate = useNavigate();
  const [role, setRole] = useState('Donor');
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [bloodGroup, setBloodGroup] = useState('O+');
  const [city, setCity] = useState('Bengaluru');
  const [hospitalName, setHospitalName] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const BLOOD_GROUPS = ['O-', 'O+', 'A-', 'A+', 'B-', 'B+', 'AB-', 'AB+'];

  const handleRegister = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const res = await fetch('/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: name.trim(),
          email: email.trim(),
          password,
          role,
          phone: phone.trim(),
          city: city.trim(),
          bloodGroup: (role === 'Donor' || role === 'Receiver') ? bloodGroup : undefined,
          hospitalName: (role === 'Hospital' || role === 'Blood Bank') ? hospitalName : undefined
        })
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || data.detail || 'Unable to register account.');

      localStorage.setItem('donorsync_token', data.token);
      localStorage.setItem('donorsync_user', JSON.stringify(data.user));

      switch (data.user.role) {
        case 'Donor': window.location.href = '/dashboard/donor'; break;
        case 'Receiver': window.location.href = '/dashboard/receiver'; break;
        case 'Hospital': window.location.href = '/dashboard/hospital'; break;
        case 'Blood Bank': window.location.href = '/dashboard/bank'; break;
        case 'NGO': window.location.href = '/dashboard/organization'; break;
        default: window.location.href = '/';
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-lg mx-auto my-12 p-8 rounded-3xl glass-panel border border-clinical-border font-sans text-left relative shadow-2xl">
      <div className="text-center mb-6">
        <h2 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight">
          Create <span className="text-brand-primary">DonorSync</span> Account
        </h2>
        <p className="text-xs text-slate-400 mt-1.5">
          Join our decentralized clinical network saving lives daily.
        </p>
      </div>

      {error && (
        <div className="p-3 mb-6 rounded-xl bg-red-500/10 border border-red-500/30 text-xs text-red-400 flex items-start space-x-2">
          <ShieldAlert className="h-4 w-4 shrink-0 mt-0.5" />
          <span>{error}</span>
        </div>
      )}

      <form onSubmit={handleRegister} className="space-y-4">
        {/* Role Selection */}
        <div>
          <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1.5">
            Select Your Community Role
          </label>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
            {[
              { id: 'Donor', label: 'Life Saver / Donor' },
              { id: 'Receiver', label: 'Patient / Receiver' },
              { id: 'Hospital', label: 'Hospital' },
              { id: 'Blood Bank', label: 'Blood Bank' },
              { id: 'NGO', label: 'NGO / Organization' }
            ].map(r => (
              <button
                type="button"
                key={r.id}
                onClick={() => setRole(r.id)}
                className={`py-2 px-3 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                  role === r.id 
                    ? 'bg-brand-primary text-white neon-glow-red border border-red-500/30' 
                    : 'bg-slate-900 text-slate-400 border border-slate-800 hover:text-white'
                }`}
              >
                {r.label}
              </button>
            ))}
          </div>
        </div>

        {/* Name */}
        <div>
          <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1.5">
            {role === 'Hospital' ? 'Hospital / Clinic Name' : role === 'Blood Bank' ? 'Blood Bank Name' : role === 'NGO' ? 'Organization Name' : 'Full Name'}
          </label>
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="e.g. Dr. Sarah Jenkins"
            required
            className="w-full px-4 py-2.5 rounded-xl glass-input text-xs text-white"
          />
        </div>

        {/* Email & Phone */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1.5">Email Address</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="user@donorsync.com"
              required
              className="w-full px-4 py-2.5 rounded-xl glass-input text-xs text-white"
            />
          </div>
          <div>
            <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1.5">Phone Number</label>
            <input
              type="tel"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              placeholder="+91 9876543210"
              required
              className="w-full px-4 py-2.5 rounded-xl glass-input text-xs text-white"
            />
          </div>
        </div>

        {/* Conditional Blood Group */}
        {(role === 'Donor' || role === 'Receiver') && (
          <div>
            <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1.5">Blood Group</label>
            <div className="grid grid-cols-4 gap-2">
              {BLOOD_GROUPS.map(grp => (
                <button
                  type="button"
                  key={grp}
                  onClick={() => setBloodGroup(grp)}
                  className={`py-2 rounded-lg text-xs font-bold cursor-pointer ${
                    bloodGroup === grp 
                      ? 'bg-brand-primary text-white neon-glow-red' 
                      : 'bg-slate-900 text-slate-400 border border-slate-800 hover:text-white'
                  }`}
                >
                  {grp}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Password */}
        <div>
          <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1.5">Password (min 6 characters)</label>
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="••••••••"
            required
            className="w-full px-4 py-2.5 rounded-xl glass-input text-xs text-white"
          />
        </div>

        <button
          type="submit"
          disabled={loading}
          className="w-full py-3 rounded-xl bg-brand-primary hover:bg-brand-hover text-white font-bold text-sm tracking-wide transition-all shadow-lg shadow-brand-primary/20 cursor-pointer flex items-center justify-center space-x-1.5 mt-4"
        >
          <span>{loading ? 'Creating Account...' : 'Complete Registration'}</span>
          <ArrowRight className="h-4 w-4" />
        </button>
      </form>

      <div className="mt-6 pt-4 border-t border-slate-800 text-center text-xs text-slate-400">
        <span>Already have an account? </span>
        <Link to="/login" className="text-brand-primary font-bold hover:underline">
          Sign In
        </Link>
      </div>
    </div>
  );
}
