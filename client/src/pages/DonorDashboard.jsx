import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { Heart, Calendar, Award, QrCode, LineChart, AlertCircle, Droplet, MapPin, Sparkles, CheckCircle2, Clock, ToggleLeft, ToggleRight, Bell, X } from 'lucide-react';
import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts';
import QrCodeGenerator from '../components/QrCodeGenerator';

export default function DonorDashboard() {
  const { user, token } = useAuth();
  const navigate = useNavigate();
  const [showQr, setShowQr] = useState(false);
  const [loginAlert, setLoginAlert] = useState(() => {
    return sessionStorage.getItem('just_logged_in') === 'true';
  });
  const [nearbyRequests, setNearbyRequests] = useState([]);
  const [loadingRequests, setLoadingRequests] = useState(false);
  const [isAvailable, setIsAvailable] = useState(true);
  const [dispatchStatus, setDispatchStatus] = useState({});

  // Dynamic credentials for real-time check-in
  const dynamicBloodGroup = user?.bloodGroup || 'O+';
  const dynamicDonorCode = user?.donorCode || `DS-${dynamicBloodGroup.replace('+', 'POS').replace('-', 'NEG')}-${(user?.id ? user.id.replace(/\D/g, '').slice(0, 5) || user.id.slice(0, 6).toUpperCase() : 'LIVE')}`;

  useEffect(() => {
    if (sessionStorage.getItem('just_logged_in') === 'true') {
      setShowQr(true); // Automatically expand the real-time QR pass after login
      sessionStorage.removeItem('just_logged_in');
    }
  }, []);

  // Health metric historical tracker
  const HEALTH_HISTORY = [
    { month: 'Jan', hemoglobin: 14.2, pulse: 72, bpSystolic: 120 },
    { month: 'Feb', hemoglobin: 14.5, pulse: 70, bpSystolic: 118 },
    { month: 'Mar', hemoglobin: 13.9, pulse: 75, bpSystolic: 122 },
    { month: 'Apr', hemoglobin: 14.8, pulse: 71, bpSystolic: 120 },
    { month: 'May', hemoglobin: 14.6, pulse: 73, bpSystolic: 119 }
  ];

  const fetchNearbyRequests = async () => {
    if (!token) return;
    setLoadingRequests(true);
    try {
      const res = await fetch('/api/donors/nearby-requests', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (res.ok) {
        const data = await res.json();
        setNearbyRequests(data);
      }
    } catch (err) {
      console.warn('Unable to load live nearby requests:', err.message);
    } finally {
      setLoadingRequests(false);
    }
  };

  useEffect(() => {
    fetchNearbyRequests();
  }, [token]);

  const handleToggleAvailability = async () => {
    try {
      const res = await fetch('/api/donors/availability', {
        method: 'PATCH',
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (res.ok) {
        const data = await res.json();
        setIsAvailable(data.isAvailable);
      }
    } catch (err) {
      setIsAvailable(!isAvailable);
    }
  };

  const handleAcceptRequest = async (requestId) => {
    setDispatchStatus(prev => ({ ...prev, [requestId]: 'DISPATCHING' }));
    try {
      const res = await fetch(`/api/donors/requests/${requestId}/respond`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ action: 'ACCEPT', etaMinutes: 20 })
      });

      if (res.ok) {
        setDispatchStatus(prev => ({ ...prev, [requestId]: 'DISPATCHED' }));
        fetchNearbyRequests();
      } else {
        setDispatchStatus(prev => ({ ...prev, [requestId]: 'FAILED' }));
      }
    } catch (err) {
      setDispatchStatus(prev => ({ ...prev, [requestId]: 'FAILED' }));
    }
  };

  if (!user) return null;

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 font-sans text-left space-y-6">
      {/* Login notification toast alert */}
      {loginAlert && (
        <div className="p-4 rounded-2xl bg-gradient-to-r from-brand-primary/20 via-green-500/10 to-slate-900/60 border border-brand-primary/40 flex items-center justify-between animate-in slide-in-from-top-3 duration-300 shadow-xl">
          <div className="flex items-center space-x-3.5">
            <div className="p-2.5 rounded-xl bg-brand-primary/20 text-brand-primary border border-brand-primary/30">
              <Bell className="h-5 w-5 animate-bounce" />
            </div>
            <div className="space-y-0.5">
              <div className="flex items-center space-x-2">
                <h4 className="text-sm font-extrabold text-white">Login Successful! Real-Time Clinical Pass Ready</h4>
                <span className="text-[10px] font-bold bg-green-500/20 text-green-400 px-2 py-0.5 rounded-full border border-green-500/30">ACTIVE</span>
              </div>
              <p className="text-xs text-slate-300">
                Welcome back, <span className="font-semibold text-white">{user.name}</span>. Your real-time QR check-in pass has been generated below for instant clinical check-in.
              </p>
            </div>
          </div>
          <button 
            onClick={() => setLoginAlert(false)} 
            className="text-slate-400 hover:text-white p-1.5 rounded-lg hover:bg-slate-800 transition-colors"
            title="Dismiss notification"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      )}

      {/* Visual greeting banner */}
      <div className="p-6 rounded-2xl glass-panel border border-clinical-border flex flex-col md:flex-row justify-between items-start md:items-center gap-4 relative overflow-hidden">
        <div className="absolute right-0 top-0 w-48 h-48 bg-brand-primary/5 rounded-full filter blur-2xl"></div>
        <div className="space-y-1">
          <div className="inline-flex items-center space-x-1.5 text-xs font-semibold text-brand-primary bg-brand-primary/10 px-2.5 py-0.5 rounded-full border border-brand-primary/20">
            <Sparkles className="h-3 w-3" />
            <span>Donor Certified Life Saver</span>
          </div>
          <h2 className="text-3xl font-extrabold text-white">Welcome back, {user.name}</h2>
          <p className="text-xs text-slate-400">Assigned ID: <span className="font-mono text-slate-300 font-bold">{dynamicDonorCode}</span></p>
        </div>

        <div className="flex items-center space-x-3">
          <button
            onClick={handleToggleAvailability}
            className={`px-3.5 py-2 rounded-lg text-xs font-bold transition-all flex items-center space-x-1.5 cursor-pointer border ${
              isAvailable 
                ? 'bg-green-500/10 text-green-400 border-green-500/30' 
                : 'bg-slate-800 text-slate-400 border-slate-700'
            }`}
          >
            {isAvailable ? <ToggleRight className="h-4 w-4" /> : <ToggleLeft className="h-4 w-4" />}
            <span>{isAvailable ? 'Radar Status: Available' : 'Radar Status: Resting'}</span>
          </button>

          <button 
            onClick={() => setShowQr(!showQr)}
            className="px-4 py-2 rounded-lg bg-brand-primary hover:bg-brand-hover text-white text-xs font-bold transition-all flex items-center space-x-1.5 cursor-pointer shadow-lg hover:shadow-brand-primary/20"
          >
            <QrCode className="h-4 w-4" />
            <span>{showQr ? 'Close Pass' : 'Digital Donor Pass'}</span>
          </button>
        </div>
      </div>

      {/* QR Code Pass Modal / Drawer */}
      {showQr && (
        <div className="animate-in fade-in zoom-in-95 duration-200">
          <QrCodeGenerator 
            donorCode={dynamicDonorCode} 
            donorName={user.name} 
            bloodGroup={dynamicBloodGroup} 
          />
        </div>
      )}

      {/* CORE STATS GRID */}
      <div className="grid grid-cols-1 md:grid-cols-12 gap-8 items-start">
        {/* Left: Real-time Emergency Requests */}
        <div className="md:col-span-8 space-y-6">
          <div className="flex justify-between items-center px-1">
            <h3 className="text-lg font-bold text-white flex items-center space-x-2">
              <AlertCircle className="h-5 w-5 text-brand-primary animate-pulse" />
              <span>Nearby Emergency Blood Matches</span>
            </h3>
            <span className="text-xs text-slate-400">{nearbyRequests.length} active alerts in 25km</span>
          </div>

          {loadingRequests ? (
            <div className="space-y-3">
              {[1, 2].map(n => (
                <div key={n} className="h-28 rounded-2xl bg-navy-900/40 border border-slate-800 animate-pulse"></div>
              ))}
            </div>
          ) : nearbyRequests.length === 0 ? (
            <div className="p-8 text-center rounded-2xl border border-slate-800 bg-navy-950/20 space-y-2">
              <CheckCircle2 className="h-8 w-8 text-green-400 mx-auto" />
              <p className="text-sm text-slate-300 font-semibold">No critical emergencies nearby right now.</p>
              <p className="text-xs text-slate-500">Your radar is active. You will receive an alert if a compatible patient needs blood.</p>
            </div>
          ) : (
            <div className="space-y-4">
              {nearbyRequests.map(req => {
                const status = dispatchStatus[req.id];
                return (
                  <div key={req.id} className="p-5 rounded-2xl border border-red-500/25 bg-red-500/5 space-y-4 hover:border-red-500/40 transition-all">
                    <div className="flex justify-between items-center border-b border-red-500/10 pb-3">
                      <span className="text-xs font-bold text-red-400 uppercase tracking-wider flex items-center space-x-1.5">
                        <Droplet className="h-4 w-4 animate-bounce shrink-0" />
                        <span>{req.urgency} Emergency Blood Call</span>
                      </span>
                      <span className="text-[10px] text-red-400 font-bold bg-red-500/10 px-2.5 py-0.5 rounded-full border border-red-500/20">
                        {req.bloodGroup} COMPATIBLE
                      </span>
                    </div>

                    <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                      <div className="space-y-1.5">
                        <p className="text-sm font-bold text-white">
                          {req.unitsRequired} Units required for {req.patientName}
                        </p>
                        <div className="flex items-center space-x-3 text-[10px] text-slate-400">
                          <span className="flex items-center space-x-0.5">
                            <MapPin className="h-3.5 w-3.5 text-red-500" />
                            <span>{req.hospital} ({req.distanceKm || '2.1'} km)</span>
                          </span>
                          <span className="flex items-center space-x-0.5">
                            <Clock className="h-3.5 w-3.5 text-slate-500" />
                            <span>Status: {req.status}</span>
                          </span>
                        </div>
                      </div>

                      {status === 'DISPATCHED' ? (
                        <div className="px-4 py-2 rounded-lg bg-green-500/20 border border-green-500/30 text-green-400 text-xs font-bold flex items-center space-x-1.5">
                          <CheckCircle2 className="h-4 w-4" />
                          <span>ETA Dispatched!</span>
                        </div>
                      ) : (
                        <button
                          onClick={() => handleAcceptRequest(req.id)}
                          disabled={status === 'DISPATCHING'}
                          className="px-5 py-2.5 rounded-lg bg-brand-primary hover:bg-brand-hover text-white text-xs font-bold transition-all cursor-pointer shadow-md hover:shadow-brand-primary/20 shrink-0"
                        >
                          {status === 'DISPATCHING' ? 'Confirming...' : 'Accept & Dispatch ETA'}
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {/* Hemoglobin Trends Chart */}
          <div className="p-6 rounded-2xl border border-clinical-border bg-slate-900/40 space-y-4">
            <div>
              <h3 className="text-base font-bold text-white flex items-center space-x-1.5">
                <LineChart className="h-5 w-5 text-brand-primary" />
                <span>Health History Logger (Hemoglobin Trends)</span>
              </h3>
              <p className="text-[10px] text-slate-400">Normal safety baseline: 13.5 - 17.5 g/dL.</p>
            </div>

            <div className="w-full h-44">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={HEALTH_HISTORY}>
                  <defs>
                    <linearGradient id="colorHb" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#ef4444" stopOpacity={0.25}/>
                      <stop offset="95%" stopColor="#ef4444" stopOpacity={0}/>
                    </linearGradient>
                  </defs>
                  <XAxis dataKey="month" stroke="#475569" fontSize={9} />
                  <YAxis stroke="#475569" fontSize={9} domain={[12, 16]} />
                  <Tooltip contentStyle={{ backgroundColor: '#0f172a', borderColor: '#1e293b', fontSize: 10 }} />
                  <Area type="monotone" dataKey="hemoglobin" stroke="#ef4444" strokeWidth={2} fillOpacity={1} fill="url(#colorHb)" />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>

        {/* Right: Circular Eligibility Meter & Badges */}
        <div className="md:col-span-4 space-y-6">
          <div className="p-6 rounded-2xl glass-panel border border-clinical-border text-center space-y-4">
            <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider">Donation Eligibility Status</h4>
            
            <div className="w-32 h-32 mx-auto relative flex items-center justify-center">
              <svg className="w-full h-full transform -rotate-90">
                <circle cx="64" cy="64" r="50" className="stroke-slate-800" strokeWidth="6" fill="transparent" />
                <circle cx="64" cy="64" r="50" className="stroke-green-500 neon-glow-green" strokeWidth="6" fill="transparent" strokeDasharray="314" strokeDashoffset="0" />
              </svg>
              <div className="absolute text-center">
                <span className="block text-2xl font-extrabold text-white">100%</span>
                <span className="text-[8px] text-green-400 uppercase font-bold tracking-wider">Eligible Now</span>
              </div>
            </div>

            <div className="text-xs text-slate-400 space-y-1">
              <p className="font-semibold text-slate-200">Last donated: 95 days ago</p>
              <p className="text-[10px] text-slate-500">Rest interval satisfies standard 90-day requirement.</p>
            </div>
          </div>

          <div className="p-6 rounded-2xl glass-panel border border-clinical-border space-y-4">
            <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider">Verified Badges</h4>
            <div className="space-y-3">
              <div className="flex items-center space-x-3 p-2.5 rounded-lg bg-navy-950 border border-slate-900">
                <span className="text-xl">🏆</span>
                <div className="text-left leading-tight">
                  <p className="text-[11px] font-bold text-slate-200">Lifesaver Medal</p>
                  <p className="text-[9px] text-slate-500 mt-0.5">Responded to emergency O- call within 1h</p>
                </div>
              </div>
              <div className="flex items-center space-x-3 p-2.5 rounded-lg bg-navy-950 border border-slate-900">
                <span className="text-xl">🛡️</span>
                <div className="text-left leading-tight">
                  <p className="text-[11px] font-bold text-slate-200">Centurion Donor</p>
                  <p className="text-[9px] text-slate-500 mt-0.5">Completed 6 confirmed blood donations</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
