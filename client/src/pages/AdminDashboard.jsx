import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { Shield, Users, AlertCircle, Terminal, RefreshCw, BarChart2, Activity, UserX, UserCheck, ShieldCheck, Heart } from 'lucide-react';

export default function AdminDashboard() {
  const { user, token } = useAuth();
  const [metrics, setMetrics] = useState(null);
  const [usersList, setUsersList] = useState([]);
  const [auditLogs, setAuditLogs] = useState([]);
  const [selectedRole, setSelectedRole] = useState('');
  const [selectedSeverity, setSelectedSeverity] = useState('');
  const [loading, setLoading] = useState(false);
  const [statusMessage, setStatusMessage] = useState('');

  const fetchAdminData = async () => {
    if (!token) return;
    setLoading(true);
    try {
      // 1. Live dynamic aggregated metrics
      const mRes = await fetch('/api/admin/metrics', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (mRes.ok) {
        const mData = await mRes.json();
        setMetrics(mData);
      }

      // 2. User directory
      const uRes = await fetch(`/api/admin/users${selectedRole ? `?role=${selectedRole}` : ''}`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (uRes.ok) {
        const uData = await uRes.json();
        setUsersList(uData);
      }

      // 3. Security audit logs
      const aRes = await fetch(`/api/admin/audit${selectedSeverity ? `?severity=${selectedSeverity}` : ''}`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (aRes.ok) {
        const aData = await aRes.json();
        setAuditLogs(aData);
      }
    } catch (err) {
      console.warn('Unable to load admin data:', err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAdminData();
  }, [token, selectedRole, selectedSeverity]);

  const handleToggleUser = async (userId) => {
    try {
      const res = await fetch(`/api/admin/users/${userId}/status`, {
        method: 'PATCH',
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setStatusMessage(data.message);
      fetchAdminData();
    } catch (err) {
      setStatusMessage(`Error: ${err.message}`);
    }
  };

  if (!user) return null;

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 font-sans text-left space-y-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div className="space-y-1">
          <div className="inline-flex items-center space-x-1.5 text-xs font-semibold text-yellow-500 bg-yellow-500/10 px-2.5 py-0.5 rounded-full border border-yellow-500/20">
            <Shield className="h-3.5 w-3.5" />
            <span>Root Administration Clearance</span>
          </div>
          <h2 className="text-3xl font-extrabold text-white">Clinical Administration Hub</h2>
          <p className="text-xs text-slate-400">Monitor live clinical entities, inspect HIPAA compliance audit trails, and manage user access permissions.</p>
        </div>

        <div className="flex items-center space-x-2">
          <Link
            to="/admin/system-health"
            className="px-4 py-2.5 rounded-lg bg-navy-800 hover:bg-slate-800 border border-slate-700 text-slate-200 text-xs font-bold transition-all flex items-center space-x-1.5 cursor-pointer shadow-md"
          >
            <Activity className="h-3.5 w-3.5 text-brand-primary" />
            <span>Live System Diagnostics</span>
          </Link>
          <button
            onClick={fetchAdminData}
            disabled={loading}
            className="p-2.5 rounded-lg bg-slate-900 border border-slate-800 text-slate-400 hover:text-white transition-colors cursor-pointer"
            title="Refresh Metrics"
          >
            <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin text-brand-primary' : ''}`} />
          </button>
        </div>
      </div>

      {statusMessage && (
        <div className="p-3 rounded-lg bg-slate-900 border border-slate-800 text-xs text-brand-primary flex items-center justify-between">
          <span>{statusMessage}</span>
          <button onClick={() => setStatusMessage('')} className="text-slate-500 hover:text-white">✕</button>
        </div>
      )}

      {/* Real Aggregated Database Metric Cards (No Fake Statistics!) */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <div className="p-4 rounded-xl glass-card border border-clinical-border text-center space-y-1">
          <Users className="h-5 w-5 text-brand-primary mx-auto" />
          <h4 className="text-2xl font-extrabold text-white">{metrics?.users?.total ?? 0}</h4>
          <p className="text-[10px] text-slate-500 uppercase tracking-wider font-semibold">Total Verified Users</p>
        </div>

        <div className="p-4 rounded-xl glass-card border border-clinical-border text-center space-y-1">
          <AlertCircle className="h-5 w-5 text-red-500 mx-auto animate-pulse" />
          <h4 className="text-2xl font-extrabold text-white">{metrics?.requests?.activeEmergency ?? 0}</h4>
          <p className="text-[10px] text-slate-500 uppercase tracking-wider font-semibold">Active Emergency Calls</p>
        </div>

        <div className="p-4 rounded-xl glass-card border border-clinical-border text-center space-y-1">
          <Heart className="h-5 w-5 text-green-400 mx-auto" />
          <h4 className="text-2xl font-extrabold text-white">{metrics?.requests?.fulfilled ?? 0}</h4>
          <p className="text-[10px] text-slate-500 uppercase tracking-wider font-semibold">Fulfilled Transfusions</p>
        </div>

        <div className="p-4 rounded-xl glass-card border border-clinical-border text-center space-y-1">
          <ShieldCheck className="h-5 w-5 text-blue-400 mx-auto" />
          <h4 className="text-2xl font-extrabold text-white">{metrics?.inventory?.totalAvailableUnits ?? 0}</h4>
          <p className="text-[10px] text-slate-500 uppercase tracking-wider font-semibold">Total Stock Units</p>
        </div>
      </div>

      {/* Main Grid: User Management & Audit Explorer */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        {/* User Account Access Directory */}
        <div className="lg:col-span-7 space-y-4">
          <div className="flex justify-between items-center px-1">
            <h3 className="text-base font-bold text-white flex items-center space-x-2">
              <Users className="h-4 w-4 text-brand-primary" />
              <span>User Role Access Management ({usersList.length})</span>
            </h3>

            <select
              value={selectedRole}
              onChange={(e) => setSelectedRole(e.target.value)}
              className="px-2.5 py-1 rounded bg-slate-900 border border-slate-800 text-xs text-slate-300"
            >
              <option value="">All Roles</option>
              <option value="Donor">Donor</option>
              <option value="Receiver">Receiver</option>
              <option value="Hospital">Hospital</option>
              <option value="Blood Bank">Blood Bank</option>
              <option value="Admin">Admin</option>
            </select>
          </div>

          <div className="space-y-2.5">
            {usersList.map(u => (
              <div key={u.id} className="p-3.5 rounded-xl glass-card border border-clinical-border flex justify-between items-center text-xs">
                <div className="space-y-0.5">
                  <div className="flex items-center space-x-2">
                    <span className="font-bold text-white">{u.name}</span>
                    <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-navy-900 border border-slate-800 text-slate-300">
                      {u.role}
                    </span>
                    <span className={`w-2 h-2 rounded-full ${u.isActive ? 'bg-green-400' : 'bg-red-400'}`}></span>
                  </div>
                  <p className="text-[10px] text-slate-400 font-mono">{u.email}</p>
                </div>

                <div className="flex items-center space-x-3">
                  <span className={`text-[10px] font-semibold ${u.isActive ? 'text-green-400' : 'text-red-400'}`}>
                    {u.isActive ? 'Active' : 'Deactivated'}
                  </span>
                  {u.id !== user.id && (
                    <button
                      onClick={() => handleToggleUser(u.id)}
                      className="p-1.5 rounded-lg bg-slate-900 hover:bg-slate-800 border border-slate-800 text-slate-400 hover:text-white transition-colors cursor-pointer"
                      title={u.isActive ? 'Deactivate Account' : 'Reactivate Account'}
                    >
                      {u.isActive ? <UserX className="h-3.5 w-3.5 text-red-400" /> : <UserCheck className="h-3.5 w-3.5 text-green-400" />}
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Security & Audit Trail */}
        <div className="lg:col-span-5 space-y-4">
          <div className="flex justify-between items-center px-1">
            <h3 className="text-base font-bold text-white flex items-center space-x-2">
              <Terminal className="h-4 w-4 text-brand-primary" />
              <span>HIPAA Compliance Audit Trail</span>
            </h3>

            <select
              value={selectedSeverity}
              onChange={(e) => setSelectedSeverity(e.target.value)}
              className="px-2 py-1 rounded bg-slate-900 border border-slate-800 text-xs text-slate-300"
            >
              <option value="">All Severities</option>
              <option value="Critical">Critical</option>
              <option value="High">High</option>
              <option value="Info">Info</option>
            </select>
          </div>

          <div className="p-4 rounded-2xl glass-panel border border-clinical-border space-y-3 max-h-96 overflow-y-auto">
            {auditLogs.map((log, i) => (
              <div key={log.id || i} className="p-3 rounded-lg bg-navy-950/60 border border-slate-900 space-y-1 text-xs">
                <div className="flex justify-between items-center text-[10px]">
                  <span className="font-mono text-slate-400">{log.userEmail || log.user}</span>
                  <span className={`px-1.5 py-0.5 rounded font-bold ${
                    log.severity === 'Critical' ? 'bg-red-500/20 text-red-400' : log.severity === 'High' ? 'bg-yellow-500/20 text-yellow-400' : 'bg-slate-800 text-slate-400'
                  }`}>
                    {log.severity}
                  </span>
                </div>
                <p className="text-slate-300 text-[11px] leading-tight">{log.action}</p>
                <p className="text-[9px] text-slate-500">{new Date(log.createdAt || log.timestamp).toLocaleTimeString()}</p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
