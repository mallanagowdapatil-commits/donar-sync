import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { Users, Calendar, MapPin, Plus, CheckCircle2, Award, Heart, BarChart3, Clock, AlertCircle } from 'lucide-react';

export default function OrganizationDashboard() {
  const { user, token } = useAuth();
  const [campaigns, setCampaigns] = useState([]);
  const [stats, setStats] = useState({ totalDrives: 0, totalCollected: 0, totalTarget: 0, activeVolunteers: 0 });
  const [showAddModal, setShowAddModal] = useState(false);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');

  // New campaign form state
  const [title, setTitle] = useState('');
  const [venue, setVenue] = useState('');
  const [city, setCity] = useState('Bengaluru');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [targetUnits, setTargetUnits] = useState('100');
  const [description, setDescription] = useState('');

  const fetchCampaigns = async () => {
    try {
      const res = await fetch('/api/organization/campaigns');
      if (res.ok) {
        const data = await res.json();
        setCampaigns(data);
      }
      const statRes = await fetch('/api/organization/stats');
      if (statRes.ok) {
        const statData = await statRes.json();
        setStats(statData);
      }
    } catch (err) {
      console.warn('Campaign fetch error:', err.message);
    }
  };

  useEffect(() => {
    fetchCampaigns();
  }, [token]);

  const handleCreateCampaign = async (e) => {
    e.preventDefault();
    if (!title.trim() || !venue.trim() || !startDate || !endDate) {
      setMessage('Please complete all mandatory fields.');
      return;
    }

    setLoading(true);
    try {
      const res = await fetch('/api/organization/campaigns', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          title,
          venue,
          city,
          startDate,
          endDate,
          targetUnits: parseInt(targetUnits, 10),
          description
        })
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error);

      setMessage('Campaign created successfully! Notification dispatched to local donors.');
      setShowAddModal(false);
      setTitle('');
      setVenue('');
      setDescription('');
      fetchCampaigns();
    } catch (err) {
      setMessage(`Error: ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 font-sans space-y-8 text-left">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <div className="inline-flex items-center space-x-2 px-3 py-1 rounded-full bg-purple-500/10 border border-purple-500/30 text-xs text-purple-400 mb-2">
            <Users className="h-3.5 w-3.5" />
            <span>Community NGO & Organization Portal</span>
          </div>
          <h1 className="text-3xl font-extrabold text-white tracking-tight">
            {user ? user.name : 'Healthcare Alliance Network'}
          </h1>
          <p className="text-xs text-slate-400 mt-1">
            Orchestrate regional blood donation drives, mobilize volunteers, and replenish critical reserves.
          </p>
        </div>

        <button
          onClick={() => setShowAddModal(true)}
          className="px-5 py-2.5 rounded-xl bg-brand-primary hover:bg-brand-hover text-white text-xs font-bold transition-all shadow-lg shadow-brand-primary/20 flex items-center space-x-1.5 cursor-pointer shrink-0"
        >
          <Plus className="h-4 w-4" />
          <span>Launch Donation Drive</span>
        </button>
      </div>

      {message && (
        <div className="p-3.5 rounded-xl bg-blue-500/10 border border-blue-500/20 text-xs text-blue-400 flex items-center justify-between">
          <span>{message}</span>
          <button onClick={() => setMessage('')} className="text-slate-400 hover:text-white">✕</button>
        </div>
      )}

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="p-5 rounded-2xl glass-panel border border-clinical-border">
          <div className="flex justify-between items-start">
            <div>
              <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Total Campaigns</p>
              <h3 className="text-2xl font-black text-white mt-1">{stats.totalDrives || campaigns.length}</h3>
            </div>
            <div className="p-2 rounded-xl bg-purple-500/10 text-purple-400">
              <Calendar className="h-5 w-5" />
            </div>
          </div>
          <p className="text-[11px] text-slate-500 mt-3">Regional collection drives coordinated</p>
        </div>

        <div className="p-5 rounded-2xl glass-panel border border-clinical-border">
          <div className="flex justify-between items-start">
            <div>
              <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Units Collected</p>
              <h3 className="text-2xl font-black text-emerald-400 mt-1">{stats.totalCollected || 42}</h3>
            </div>
            <div className="p-2 rounded-xl bg-emerald-500/10 text-emerald-400">
              <Heart className="h-5 w-5" />
            </div>
          </div>
          <p className="text-[11px] text-slate-500 mt-3">Whole blood units funneled to hospitals</p>
        </div>

        <div className="p-5 rounded-2xl glass-panel border border-clinical-border">
          <div className="flex justify-between items-start">
            <div>
              <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Collection Target</p>
              <h3 className="text-2xl font-black text-blue-400 mt-1">{stats.totalTarget || 350}</h3>
            </div>
            <div className="p-2 rounded-xl bg-blue-500/10 text-blue-400">
              <BarChart3 className="h-5 w-5" />
            </div>
          </div>
          <p className="text-[11px] text-slate-500 mt-3">Overall seasonal quota commitment</p>
        </div>

        <div className="p-5 rounded-2xl glass-panel border border-clinical-border">
          <div className="flex justify-between items-start">
            <div>
              <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Active Volunteers</p>
              <h3 className="text-2xl font-black text-amber-400 mt-1">{stats.activeVolunteers || 128}</h3>
            </div>
            <div className="p-2 rounded-xl bg-amber-500/10 text-amber-400">
              <Users className="h-5 w-5" />
            </div>
          </div>
          <p className="text-[11px] text-slate-500 mt-3">Registered on-ground coordinators</p>
        </div>
      </div>

      {/* Campaigns List */}
      <div className="space-y-4">
        <h2 className="text-xl font-bold text-white tracking-tight">Active & Upcoming Blood Drives</h2>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {campaigns.map((c) => (
            <div key={c.id} className="p-6 rounded-2xl glass-panel border border-clinical-border space-y-4 hover:border-purple-500/40 transition-all hover:shadow-xl hover:-translate-y-0.5">
              <div className="flex justify-between items-start">
                <div>
                  <span className={`inline-block px-2.5 py-0.5 rounded-full text-[10px] font-extrabold uppercase tracking-wider mb-2 ${
                    c.status === 'ACTIVE' ? 'bg-green-500/10 text-green-400 border border-green-500/30' : 'bg-blue-500/10 text-blue-400 border border-blue-500/30'
                  }`}>
                    {c.status}
                  </span>
                  <h3 className="text-lg font-bold text-white">{c.title}</h3>
                </div>
                <div className="text-right">
                  <span className="text-xs font-bold text-purple-400">{c.collectedUnits} / {c.targetUnits}</span>
                  <p className="text-[10px] text-slate-500">Units Donated</p>
                </div>
              </div>

              <p className="text-xs text-slate-400 leading-relaxed">{c.description}</p>

              {/* Progress Bar */}
              <div>
                <div className="w-full bg-slate-800 rounded-full h-2 overflow-hidden">
                  <div 
                    className="bg-brand-primary h-2 rounded-full transition-all duration-500" 
                    style={{ width: `${Math.min(100, Math.round(((c.collectedUnits || 0) / (c.targetUnits || 1)) * 100))}%` }}
                  />
                </div>
              </div>

              <div className="pt-2 border-t border-slate-800/80 flex flex-wrap items-center justify-between text-xs text-slate-400 gap-2">
                <div className="flex items-center space-x-1.5">
                  <MapPin className="h-3.5 w-3.5 text-purple-400 shrink-0" />
                  <span className="truncate max-w-[200px]">{c.venue}, {c.city}</span>
                </div>
                <div className="flex items-center space-x-1.5">
                  <Calendar className="h-3.5 w-3.5 text-slate-500 shrink-0" />
                  <span>{c.startDate} to {c.endDate}</span>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Add Campaign Modal */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-sm animate-in fade-in">
          <div className="w-full max-w-lg p-6 sm:p-8 rounded-3xl glass-panel border border-clinical-border shadow-2xl">
            <h3 className="text-xl font-bold text-white mb-2">Schedule New Blood Drive</h3>
            <p className="text-xs text-slate-400 mb-6">
              Create a community donation drive to notify donors within a 25 km radius.
            </p>

            <form onSubmit={handleCreateCampaign} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1">Drive Title</label>
                <input
                  type="text"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="e.g. City Plaza Emergency Blood Drive"
                  required
                  className="w-full px-4 py-2.5 rounded-xl glass-input text-xs text-white"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1">Venue / Hall</label>
                  <input
                    type="text"
                    value={venue}
                    onChange={(e) => setVenue(e.target.value)}
                    placeholder="e.g. Convention Center, Hall 2"
                    required
                    className="w-full px-4 py-2.5 rounded-xl glass-input text-xs text-white"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1">City</label>
                  <input
                    type="text"
                    value={city}
                    onChange={(e) => setCity(e.target.value)}
                    required
                    className="w-full px-4 py-2.5 rounded-xl glass-input text-xs text-white"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1">Start Date</label>
                  <input
                    type="date"
                    value={startDate}
                    onChange={(e) => setStartDate(e.target.value)}
                    required
                    className="w-full px-4 py-2.5 rounded-xl glass-input text-xs text-white"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1">End Date</label>
                  <input
                    type="date"
                    value={endDate}
                    onChange={(e) => setEndDate(e.target.value)}
                    required
                    className="w-full px-4 py-2.5 rounded-xl glass-input text-xs text-white"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1">Target Units</label>
                <input
                  type="number"
                  value={targetUnits}
                  onChange={(e) => setTargetUnits(e.target.value)}
                  min="10"
                  max="1000"
                  required
                  className="w-full px-4 py-2.5 rounded-xl glass-input text-xs text-white"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1">Campaign Description</label>
                <textarea
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  rows="3"
                  placeholder="Details for life savers regarding timings, refreshments, and volunteer instructions..."
                  className="w-full px-4 py-2.5 rounded-xl glass-input text-xs text-white"
                />
              </div>

              <div className="flex justify-end space-x-3 pt-4 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="px-4 py-2 rounded-xl bg-slate-800 text-slate-300 text-xs font-bold hover:bg-slate-700 cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={loading}
                  className="px-6 py-2 rounded-xl bg-brand-primary text-white text-xs font-bold hover:bg-brand-hover shadow-lg shadow-brand-primary/20 cursor-pointer"
                >
                  {loading ? 'Publishing...' : 'Launch Drive'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
