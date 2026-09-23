import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { Building, Send, Clock, MapPin, Truck, AlertCircle, Calendar, PlusCircle, CheckCircle2, Droplet, Package } from 'lucide-react';

export default function HospitalDashboard() {
  const { user, token } = useAuth();
  const [requests, setRequests] = useState([]);
  const [stocks, setStocks] = useState({});
  const [showRequestModal, setShowRequestModal] = useState(false);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');

  // Form state for hospital emergency submission
  const [patientName, setPatientName] = useState('');
  const [bloodGroup, setBloodGroup] = useState('O-');
  const [unitsRequired, setUnitsRequired] = useState('3');
  const [urgency, setUrgency] = useState('Critical');
  const [notes, setNotes] = useState('');

  const BLOOD_GROUPS = ['O-', 'O+', 'A-', 'A+', 'B-', 'B+', 'AB-', 'AB+'];

  const fetchData = async () => {
    try {
      // 1. Fetch active hospital emergency requests
      const reqRes = await fetch('/api/requests/list');
      if (reqRes.ok) {
        const reqData = await reqRes.json();
        setRequests(reqData);
      }

      // 2. Fetch live inventory
      const invRes = await fetch('/api/inventory/stocks');
      if (invRes.ok) {
        const invData = await invRes.json();
        setStocks(invData.stocks || {});
      }
    } catch (err) {
      console.warn('Unable to load hospital clinical data:', err.message);
    }
  };

  useEffect(() => {
    fetchData();
  }, [token]);

  const handleCreateRequest = async (e) => {
    e.preventDefault();
    if (!patientName.trim()) return;

    setLoading(true);
    try {
      const res = await fetch('/api/requests/emergency', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          patientName: patientName.trim(),
          bloodGroup,
          unitsRequired: parseInt(unitsRequired, 10),
          urgency,
          hospital: user?.name || 'St. Jude General Hospital',
          notes,
          latitude: 12.9736,
          longitude: 77.6111
        })
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error);

      setMessage(`Emergency dispatch created! ${data.matchingDonorsCount || 0} donors notified.`);
      setShowRequestModal(false);
      setPatientName('');
      setNotes('');
      fetchData();
    } catch (err) {
      setMessage(`Failed: ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  if (!user) return null;

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 font-sans text-left space-y-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div className="space-y-1">
          <div className="inline-flex items-center space-x-1.5 text-xs font-semibold text-green-400 bg-green-500/10 px-2.5 py-0.5 rounded-full border border-green-500/20">
            <Building className="h-3.5 w-3.5" />
            <span>Authorized Medical Center Portal</span>
          </div>
          <h2 className="text-3xl font-extrabold text-white">{user.name}</h2>
          <p className="text-xs text-slate-400">Control real-time blood transfusion logistics, emergency dispatches, and incoming donor responses.</p>
        </div>

        <button
          onClick={() => setShowRequestModal(true)}
          className="px-5 py-2.5 rounded-lg bg-brand-primary hover:bg-brand-hover text-white text-xs font-bold transition-all flex items-center space-x-1.5 cursor-pointer shadow-lg hover:shadow-brand-primary/25 shrink-0"
        >
          <PlusCircle className="h-4 w-4" />
          <span>Dispatch Emergency Blood Call</span>
        </button>
      </div>

      {message && (
        <div className="p-3 rounded-lg bg-slate-900 border border-slate-800 text-xs text-brand-primary flex items-center justify-between">
          <span>{message}</span>
          <button onClick={() => setMessage('')} className="text-slate-500 hover:text-white">✕</button>
        </div>
      )}

      {/* Top Clinical Stock Overview */}
      <div className="p-5 rounded-2xl glass-panel border border-clinical-border space-y-3">
        <div className="flex justify-between items-center">
          <span className="text-xs font-bold text-slate-300 uppercase tracking-wider flex items-center space-x-1.5">
            <Package className="h-4 w-4 text-brand-primary" />
            <span>Regional Blood Bank Stock Overview</span>
          </span>
          <span className="text-[10px] text-slate-400">Connected to City Central Repository</span>
        </div>

        <div className="grid grid-cols-4 sm:grid-cols-8 gap-2">
          {BLOOD_GROUPS.map(grp => {
            const qty = stocks[grp] || 0;
            const isCritical = qty <= 5;
            return (
              <div key={grp} className={`p-3 rounded-xl border text-center space-y-1 ${
                isCritical 
                  ? 'bg-red-500/10 border-red-500/30' 
                  : 'bg-navy-900/40 border-slate-800'
              }`}>
                <span className="text-xs font-bold text-slate-300">{grp}</span>
                <p className={`text-lg font-extrabold ${isCritical ? 'text-red-400 animate-pulse' : 'text-white'}`}>
                  {qty}
                </p>
                <span className="text-[9px] text-slate-500 block">Units</span>
              </div>
            );
          })}
        </div>
      </div>

      {/* Main Grid: Active Emergency Requests */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        {/* Active Emergency Requests Table */}
        <div className="lg:col-span-8 space-y-4">
          <h3 className="text-base font-bold text-white flex items-center space-x-2">
            <AlertCircle className="h-5 w-5 text-brand-primary" />
            <span>Active Hospital Transfusion Dispatches ({requests.length})</span>
          </h3>

          <div className="space-y-3">
            {requests.map(req => (
              <div key={req.id} className="p-4 rounded-xl glass-card border border-clinical-border flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
                <div className="space-y-1">
                  <div className="flex items-center space-x-2">
                    <span className="text-sm font-bold text-white">{req.patientName}</span>
                    <span className="px-2 py-0.5 rounded bg-brand-primary/10 text-brand-primary text-xs font-bold border border-brand-primary/20">
                      {req.bloodGroup}
                    </span>
                    <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${
                      req.urgency === 'Critical' ? 'bg-red-500/10 text-red-400 border-red-500/20' : 'bg-yellow-500/10 text-yellow-400 border-yellow-500/20'
                    }`}>
                      {req.urgency}
                    </span>
                  </div>

                  <p className="text-xs text-slate-400">
                    Units: <span className="text-slate-200 font-bold">{req.unitsRequired}</span> • Hospital: {req.hospital}
                  </p>

                  {req.notes && (
                    <p className="text-[11px] text-slate-500 italic">"{req.notes}"</p>
                  )}
                </div>

                <div className="flex sm:flex-col items-end justify-between w-full sm:w-auto gap-2">
                  <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold border ${
                    req.status === 'FULFILLED'
                      ? 'bg-green-500/10 text-green-400 border-green-500/20'
                      : 'bg-brand-primary/10 text-brand-primary border-brand-primary/20 animate-pulse'
                  }`}>
                    {req.status}
                  </span>
                  <span className="text-[10px] text-slate-500">
                    {new Date(req.createdAt).toLocaleDateString()}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Right: Hospital Logistical Dispatches */}
        <div className="lg:col-span-4 space-y-4">
          <h3 className="text-base font-bold text-white flex items-center space-x-2">
            <Truck className="h-5 w-5 text-brand-primary" />
            <span>Emergency Cold-Chain Transit</span>
          </h3>

          <div className="space-y-3">
            <div className="p-4 rounded-xl glass-panel border border-slate-800 space-y-3">
              <div className="flex justify-between items-center text-xs">
                <span className="font-bold text-slate-200">City Repo ➡️ St. Jude ICU</span>
                <span className="text-brand-primary font-bold text-[10px] bg-brand-primary/10 px-2 py-0.5 rounded border border-brand-primary/20 animate-pulse">
                  In Transit
                </span>
              </div>
              <div className="flex justify-between text-[11px] text-slate-400">
                <span>Units: <strong className="text-white">3 (O-)</strong></span>
                <span>ETA: <strong className="text-brand-primary">4 min</strong></span>
              </div>
              <div className="w-full h-1.5 bg-slate-900 rounded-full overflow-hidden">
                <div className="h-full bg-brand-primary w-[75%] rounded-full animate-pulse"></div>
              </div>
            </div>

            <div className="p-4 rounded-xl glass-panel border border-slate-800 space-y-3">
              <div className="flex justify-between items-center text-xs">
                <span className="font-bold text-slate-200">Red Cross ➡️ Surgery B</span>
                <span className="text-green-400 font-bold text-[10px] bg-green-500/10 px-2 py-0.5 rounded border border-green-500/20">
                  Completed
                </span>
              </div>
              <div className="flex justify-between text-[11px] text-slate-400">
                <span>Units: <strong className="text-white">2 (A+)</strong></span>
                <span className="text-green-400 font-bold">Delivered</span>
              </div>
              <div className="w-full h-1.5 bg-slate-900 rounded-full overflow-hidden">
                <div className="h-full bg-green-400 w-full rounded-full"></div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Emergency Request Modal */}
      {showRequestModal && (
        <div className="fixed inset-0 bg-black/75 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="w-full max-w-lg rounded-2xl glass-panel border border-clinical-border p-6 space-y-5 animate-in zoom-in-95 duration-150">
            <div className="flex justify-between items-center border-b border-slate-800 pb-3">
              <h3 className="text-lg font-bold text-white flex items-center space-x-2">
                <Droplet className="h-5 w-5 text-brand-primary" />
                <span>Hospital Emergency Blood Dispatch</span>
              </h3>
              <button onClick={() => setShowRequestModal(false)} className="text-slate-400 hover:text-white p-1">✕</button>
            </div>

            <form onSubmit={handleCreateRequest} className="space-y-4 text-xs">
              <div>
                <label className="block font-semibold text-slate-400 uppercase tracking-wider mb-1">Patient Name / Case ID</label>
                <input
                  type="text"
                  required
                  value={patientName}
                  onChange={(e) => setPatientName(e.target.value)}
                  placeholder="e.g. Trauma Patient #4092"
                  className="w-full px-4 py-2.5 rounded-lg glass-input text-xs"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-400 uppercase tracking-wider mb-1">Blood Group Needed</label>
                  <select
                    value={bloodGroup}
                    onChange={(e) => setBloodGroup(e.target.value)}
                    className="w-full px-4 py-2.5 rounded-lg glass-input text-xs bg-slate-900 text-white"
                  >
                    {BLOOD_GROUPS.map(g => <option key={g} value={g}>{g}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block font-semibold text-slate-400 uppercase tracking-wider mb-1">Units Required (Pints)</label>
                  <input
                    type="number"
                    min="1"
                    max="10"
                    required
                    value={unitsRequired}
                    onChange={(e) => setUnitsRequired(e.target.value)}
                    className="w-full px-4 py-2.5 rounded-lg glass-input text-xs"
                  />
                </div>
              </div>

              <div>
                <label className="block font-semibold text-slate-400 uppercase tracking-wider mb-1">Urgency Priority</label>
                <select
                  value={urgency}
                  onChange={(e) => setUrgency(e.target.value)}
                  className="w-full px-4 py-2.5 rounded-lg glass-input text-xs bg-slate-900 text-white"
                >
                  <option value="Critical">Critical (Immediate OR Transfusion)</option>
                  <option value="High">High (Within 4 Hours)</option>
                  <option value="Medium">Medium (Scheduled)</option>
                </select>
              </div>

              <div>
                <label className="block font-semibold text-slate-400 uppercase tracking-wider mb-1">Clinical Department Notes</label>
                <textarea
                  rows="2"
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="e.g. Emergency Surgical Suite 3 - Massive transfusion protocol initiated"
                  className="w-full px-4 py-2 rounded-lg glass-input text-xs"
                ></textarea>
              </div>

              <div className="pt-3 flex justify-end space-x-2">
                <button
                  type="button"
                  onClick={() => setShowRequestModal(false)}
                  className="px-4 py-2 rounded-lg bg-navy-900 text-slate-400 text-xs font-semibold hover:bg-slate-800 transition-all cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={loading}
                  className="px-5 py-2 rounded-lg bg-brand-primary hover:bg-brand-hover text-white text-xs font-bold transition-all shadow-md cursor-pointer"
                >
                  {loading ? 'Dispatching...' : 'Initiate Radar Alert Broadcast'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
