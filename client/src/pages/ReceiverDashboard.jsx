import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { Droplet, Send, User, MapPin, Compass, Star, CheckCircle2, Clock, AlertCircle, PlusCircle, XCircle } from 'lucide-react';

export default function ReceiverDashboard() {
  const { user, token } = useAuth();
  const [patientName, setPatientName] = useState('');
  const [bloodGroup, setBloodGroup] = useState('O-');
  const [units, setUnits] = useState('2');
  const [urgency, setUrgency] = useState('Critical');
  const [hospital, setHospital] = useState('St. Jude General Hospital');
  const [notes, setNotes] = useState('');
  const [loading, setLoading] = useState(false);
  const [myRequests, setMyRequests] = useState([]);
  const [selectedRequest, setSelectedRequest] = useState(null);
  const [matchedDonors, setMatchedDonors] = useState([]);
  const [statusMessage, setStatusMessage] = useState('');
  const [showCreateModal, setShowCreateModal] = useState(false);

  const BLOOD_GROUPS = ['O-', 'O+', 'A-', 'A+', 'B-', 'B+', 'AB-', 'AB+'];

  const fetchMyRequests = async () => {
    if (!token) return;
    try {
      const res = await fetch('/api/requests/my-requests', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (res.ok) {
        const data = await res.json();
        setMyRequests(data);
        if (data.length > 0 && !selectedRequest) {
          setSelectedRequest(data[0]);
          fetchMatches(data[0].bloodGroup, data[0].latitude, data[0].longitude);
        }
      }
    } catch (err) {
      console.warn('Unable to load requests history:', err.message);
    }
  };

  const fetchMatches = async (group, lat = 12.9716, lon = 77.5946) => {
    try {
      const res = await fetch(`/api/matching/donors?lat=${lat}&lon=${lon}&bloodGroup=${encodeURIComponent(group)}&radius=30`);
      if (res.ok) {
        const data = await res.json();
        setMatchedDonors(data.matches || []);
      }
    } catch (err) {}
  };

  useEffect(() => {
    fetchMyRequests();
  }, [token]);

  const handleCreateRequest = async (e) => {
    e.preventDefault();
    if (!patientName.trim()) return;

    setLoading(true);
    setStatusMessage('Broadcasting emergency alert to nearby compatible donors...');

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
          unitsRequired: parseInt(units, 10),
          urgency,
          hospital,
          notes,
          latitude: 12.9736,
          longitude: 77.6111
        })
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error);

      setStatusMessage('Request registered successfully! Matching donors alerted.');
      setShowCreateModal(false);
      setPatientName('');
      setNotes('');
      fetchMyRequests();
      if (data.request) {
        setSelectedRequest(data.request);
        fetchMatches(data.request.bloodGroup, data.request.latitude, data.request.longitude);
      }
    } catch (err) {
      setStatusMessage(`Error: ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  const handleCancelRequest = async (requestId) => {
    setStatusMessage('Cancelling request...');
    try {
      const res = await fetch(`/api/requests/${requestId}/status`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ status: 'CANCELLED' })
      });
      if (res.ok) {
        setStatusMessage('Request status updated to CANCELLED.');
        fetchMyRequests();
      }
    } catch (err) {
      setStatusMessage(`Cancellation failed: ${err.message}`);
    }
  };

  if (!user) return null;

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 font-sans text-left space-y-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div className="space-y-1">
          <h2 className="text-3xl font-extrabold text-white">Receiver / Patient Dashboard</h2>
          <p className="text-xs text-slate-400">Manage blood requests, track nearby matched donor responses, and monitor fulfillment.</p>
        </div>

        <button
          onClick={() => setShowCreateModal(true)}
          className="px-5 py-2.5 rounded-lg bg-brand-primary hover:bg-brand-hover text-white text-xs font-bold transition-all flex items-center space-x-1.5 cursor-pointer shadow-lg hover:shadow-brand-primary/25 shrink-0"
        >
          <PlusCircle className="h-4 w-4" />
          <span>Create New Blood Request</span>
        </button>
      </div>

      {statusMessage && (
        <div className="p-3 rounded-lg bg-slate-900 border border-slate-800 text-xs text-brand-primary flex items-center justify-between">
          <span>{statusMessage}</span>
          <button onClick={() => setStatusMessage('')} className="text-slate-500 hover:text-white">✕</button>
        </div>
      )}

      {/* Main Grid: Left Requests History, Right Live Matched Radar */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        {/* Left: Active and Past Requests */}
        <div className="lg:col-span-6 space-y-4">
          <div className="flex justify-between items-center px-1">
            <h3 className="text-base font-bold text-white flex items-center space-x-2">
              <Clock className="h-4 w-4 text-brand-primary" />
              <span>My Blood Requests ({myRequests.length})</span>
            </h3>
          </div>

          {myRequests.length === 0 ? (
            <div className="p-10 text-center rounded-2xl glass-panel border border-slate-800 space-y-3">
              <Droplet className="h-8 w-8 text-slate-600 mx-auto" />
              <p className="text-sm font-semibold text-slate-300">No active blood requests filed yet.</p>
              <p className="text-xs text-slate-500">Need blood for a patient? Click "Create New Blood Request" above to initiate radar matching.</p>
            </div>
          ) : (
            <div className="space-y-3">
              {myRequests.map(req => {
                const isSelected = selectedRequest?.id === req.id;
                return (
                  <div
                    key={req.id}
                    onClick={() => {
                      setSelectedRequest(req);
                      fetchMatches(req.bloodGroup, req.latitude, req.longitude);
                    }}
                    className={`p-4 rounded-xl border transition-all cursor-pointer ${
                      isSelected 
                        ? 'glass-panel border-brand-primary/50 bg-slate-900/80 shadow-lg shadow-brand-primary/10' 
                        : 'bg-navy-900/30 border-slate-800/80 hover:border-slate-700'
                    }`}
                  >
                    <div className="flex justify-between items-start">
                      <div className="space-y-1">
                        <div className="flex items-center space-x-2">
                          <span className="text-sm font-bold text-white">{req.patientName}</span>
                          <span className="px-2 py-0.5 rounded-md bg-brand-primary/10 text-brand-primary text-xs font-bold border border-brand-primary/20">
                            {req.bloodGroup}
                          </span>
                        </div>
                        <p className="text-xs text-slate-400">{req.hospital} • {req.unitsRequired} Units Required</p>
                      </div>

                      <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold border ${
                        req.status === 'FULFILLED'
                          ? 'bg-green-500/10 text-green-400 border-green-500/20'
                          : req.status === 'MATCHING' || req.status === 'DONOR_CONTACTED'
                            ? 'bg-brand-primary/10 text-brand-primary border-brand-primary/20 animate-pulse'
                            : 'bg-slate-800 text-slate-400 border-slate-700'
                      }`}>
                        {req.status}
                      </span>
                    </div>

                    <div className="mt-3 pt-3 border-t border-slate-800/60 flex justify-between items-center text-[10px] text-slate-500">
                      <span>Filed: {new Date(req.createdAt).toLocaleDateString()}</span>
                      {req.status !== 'CANCELLED' && req.status !== 'FULFILLED' && (
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleCancelRequest(req.id);
                          }}
                          className="text-red-400 hover:text-red-300 transition-colors"
                        >
                          Cancel Request
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Right: Radar Matches for Selected Request */}
        <div className="lg:col-span-6 space-y-4">
          <div className="flex justify-between items-center px-1">
            <h3 className="text-base font-bold text-white flex items-center space-x-2">
              <Compass className="h-4 w-4 text-brand-primary" />
              <span>
                Matching Donors for {selectedRequest ? `${selectedRequest.patientName} (${selectedRequest.bloodGroup})` : 'Selected Request'}
              </span>
            </h3>
            <span className="text-xs text-slate-400">{matchedDonors.length} in range</span>
          </div>

          {!selectedRequest ? (
            <div className="p-10 text-center rounded-2xl glass-panel border border-slate-800 space-y-2">
              <Compass className="h-8 w-8 text-slate-600 mx-auto" />
              <p className="text-xs text-slate-400">Select a blood request on the left to view matching donors.</p>
            </div>
          ) : matchedDonors.length === 0 ? (
            <div className="p-8 text-center rounded-2xl glass-panel border border-slate-800 space-y-2">
              <AlertCircle className="h-8 w-8 text-yellow-500/80 mx-auto" />
              <p className="text-xs font-semibold text-slate-300">No active donors currently in immediate 30km radius.</p>
              <p className="text-[10px] text-slate-500">Automated radar will continue pinging surrounding donor circles.</p>
            </div>
          ) : (
            <div className="space-y-3">
              {matchedDonors.map(donor => (
                <div key={donor.id} className="p-4 rounded-xl glass-card border border-clinical-border space-y-2">
                  <div className="flex justify-between items-center">
                    <div className="flex items-center space-x-2">
                      <span className="w-2 h-2 rounded-full bg-brand-primary"></span>
                      <span className="text-xs font-bold text-slate-200">{donor.name}</span>
                      <span className="px-1.5 py-0.5 rounded bg-brand-primary/10 text-brand-primary text-[10px] font-bold">
                        {donor.bloodGroup}
                      </span>
                    </div>

                    <div className="text-right">
                      <span className="text-xs font-bold text-brand-primary flex items-center space-x-1">
                        <Star className="h-3 w-3 fill-brand-primary" />
                        <span>{donor.matchScore}% Match</span>
                      </span>
                    </div>
                  </div>

                  <p className="text-[10px] text-slate-400 leading-snug">
                    {donor.scoringExplanation}
                  </p>

                  <div className="pt-2 border-t border-slate-800/60 flex justify-between items-center text-[10px] text-slate-500">
                    <span className="flex items-center space-x-1">
                      <MapPin className="h-3 w-3" />
                      <span>{donor.distanceKm} km away (~{donor.routeEtaMinutes} min transit)</span>
                    </span>
                    <span className="text-green-400 font-semibold">Alert Dispatched</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Create Request Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 bg-black/75 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="w-full max-w-lg rounded-2xl glass-panel border border-clinical-border p-6 space-y-5 animate-in zoom-in-95 duration-150">
            <div className="flex justify-between items-center border-b border-slate-800 pb-3">
              <h3 className="text-lg font-bold text-white flex items-center space-x-2">
                <Droplet className="h-5 w-5 text-brand-primary" />
                <span>Create Emergency Blood Request</span>
              </h3>
              <button onClick={() => setShowCreateModal(false)} className="text-slate-400 hover:text-white p-1">
                ✕
              </button>
            </div>

            <form onSubmit={handleCreateRequest} className="space-y-4 text-xs">
              <div>
                <label className="block font-semibold text-slate-400 uppercase tracking-wider mb-1">Patient Full Name</label>
                <input
                  type="text"
                  required
                  value={patientName}
                  onChange={(e) => setPatientName(e.target.value)}
                  placeholder="e.g. Arthur Dent"
                  className="w-full px-4 py-2.5 rounded-lg glass-input text-xs"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-400 uppercase tracking-wider mb-1">Blood Group</label>
                  <select
                    value={bloodGroup}
                    onChange={(e) => setBloodGroup(e.target.value)}
                    className="w-full px-4 py-2.5 rounded-lg glass-input text-xs bg-slate-900 text-white"
                  >
                    {BLOOD_GROUPS.map(g => <option key={g} value={g}>{g}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block font-semibold text-slate-400 uppercase tracking-wider mb-1">Units Needed (Pints)</label>
                  <input
                    type="number"
                    min="1"
                    max="10"
                    required
                    value={units}
                    onChange={(e) => setUnits(e.target.value)}
                    className="w-full px-4 py-2.5 rounded-lg glass-input text-xs"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-400 uppercase tracking-wider mb-1">Urgency Level</label>
                  <select
                    value={urgency}
                    onChange={(e) => setUrgency(e.target.value)}
                    className="w-full px-4 py-2.5 rounded-lg glass-input text-xs bg-slate-900 text-white"
                  >
                    <option value="Critical">Critical (Immediate Surgery)</option>
                    <option value="High">High (Within 6 Hours)</option>
                    <option value="Medium">Medium (Within 24 Hours)</option>
                    <option value="Low">Low (Scheduled Operation)</option>
                  </select>
                </div>
                <div>
                  <label className="block font-semibold text-slate-400 uppercase tracking-wider mb-1">Hospital / Medical Center</label>
                  <input
                    type="text"
                    required
                    value={hospital}
                    onChange={(e) => setHospital(e.target.value)}
                    className="w-full px-4 py-2.5 rounded-lg glass-input text-xs"
                  />
                </div>
              </div>

              <div>
                <label className="block font-semibold text-slate-400 uppercase tracking-wider mb-1">Clinical Notes (Optional)</label>
                <textarea
                  rows="2"
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="e.g. ICU Trauma emergency, Room 402"
                  className="w-full px-4 py-2 rounded-lg glass-input text-xs"
                ></textarea>
              </div>

              <div className="pt-3 flex justify-end space-x-2">
                <button
                  type="button"
                  onClick={() => setShowCreateModal(false)}
                  className="px-4 py-2 rounded-lg bg-navy-900 text-slate-400 text-xs font-semibold hover:bg-slate-800 transition-all cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={loading}
                  className="px-5 py-2 rounded-lg bg-brand-primary hover:bg-brand-hover text-white text-xs font-bold transition-all shadow-md cursor-pointer"
                >
                  {loading ? 'Submitting...' : 'Broadcast Emergency Request'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
