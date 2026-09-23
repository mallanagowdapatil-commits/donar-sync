import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { Droplet, AlertTriangle, ArrowUpRight, BarChart3, Edit, Save, Plus, Minus, CheckCircle2, PackagePlus, Trash2, Calendar } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts';

export default function BloodBankDashboard() {
  const { user, token } = useAuth();
  const [stocks, setStocks] = useState({});
  const [expiringPackets, setExpiringPackets] = useState([]);
  const [editGroup, setEditGroup] = useState('O-');
  const [editQuantity, setEditQuantity] = useState('');
  const [editReason, setEditReason] = useState('Routine intake collection');
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');

  // Expiry packet creation form state
  const [newGroup, setNewGroup] = useState('O-');
  const [newUnits, setNewUnits] = useState('1');
  const [newExpiryDate, setNewExpiryDate] = useState('');
  const [showAddPacket, setShowAddPacket] = useState(false);

  const BLOOD_GROUPS = ['O-', 'O+', 'A-', 'A+', 'B-', 'B+', 'AB-', 'AB+'];

  const fetchInventory = async () => {
    try {
      const res = await fetch('/api/inventory/stocks');
      if (res.ok) {
        const data = await res.json();
        setStocks(data.stocks || {});
        setExpiringPackets(data.expiringPackets || []);
      }
    } catch (err) {
      console.warn('Failed to load blood inventory:', err.message);
    }
  };

  useEffect(() => {
    fetchInventory();
  }, [token]);

  const handleUpdateStock = async (e) => {
    e.preventDefault();
    if (editQuantity === '') return;

    const qty = parseInt(editQuantity, 10);
    if (isNaN(qty) || qty < 0) {
      setMessage('Error: Stock quantity cannot be negative.');
      return;
    }

    setLoading(true);
    try {
      const res = await fetch('/api/inventory/update', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          bloodGroup: editGroup,
          quantity: qty,
          reason: editReason
        })
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error);

      setMessage(`Inventory for ${editGroup} updated to ${qty} units.`);
      setStocks(data.stocks || {});
      setEditQuantity('');
      fetchInventory();
    } catch (err) {
      setMessage(`Update failed: ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  const handleAddExpiryPacket = async (e) => {
    e.preventDefault();
    if (!newExpiryDate) return;

    try {
      const res = await fetch('/api/inventory/expiry/add', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          bloodGroup: newGroup,
          units: parseInt(newUnits, 10),
          expiryDate: newExpiryDate
        })
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error);

      setShowAddPacket(false);
      setMessage(`Blood packet for ${newGroup} added to shelf-life tracking.`);
      fetchInventory();
    } catch (err) {
      setMessage(`Failed: ${err.message}`);
    }
  };

  const handleUpdatePacketStatus = async (packetId, newStatus) => {
    try {
      await fetch(`/api/inventory/expiry/${packetId}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ status: newStatus })
      });
      fetchInventory();
    } catch (err) {}
  };

  const chartData = BLOOD_GROUPS.map(grp => ({
    name: grp,
    Units: stocks[grp] || 0
  }));

  if (!user) return null;

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 font-sans text-left space-y-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div className="space-y-1">
          <div className="inline-flex items-center space-x-1.5 text-xs font-semibold text-purple-400 bg-purple-500/10 px-2.5 py-0.5 rounded-full border border-purple-500/20">
            <Droplet className="h-3.5 w-3.5" />
            <span>Blood Repository Management Portal</span>
          </div>
          <h2 className="text-3xl font-extrabold text-white">{user.name}</h2>
          <p className="text-xs text-slate-400">Control active blood reserves, audit intake/transfusion transactions, and track cold-chain expiry.</p>
        </div>

        <button
          onClick={() => setShowAddPacket(true)}
          className="px-5 py-2.5 rounded-lg bg-brand-primary hover:bg-brand-hover text-white text-xs font-bold transition-all flex items-center space-x-1.5 cursor-pointer shadow-lg hover:shadow-brand-primary/25 shrink-0"
        >
          <PackagePlus className="h-4 w-4" />
          <span>Register Collected Packet</span>
        </button>
      </div>

      {message && (
        <div className="p-3 rounded-lg bg-slate-900 border border-slate-800 text-xs text-brand-primary flex items-center justify-between">
          <span>{message}</span>
          <button onClick={() => setMessage('')} className="text-slate-500 hover:text-white">✕</button>
        </div>
      )}

      {/* Real-time Inventory Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-8 gap-3">
        {BLOOD_GROUPS.map(grp => {
          const qty = stocks[grp] || 0;
          const isCritical = qty <= 5;
          return (
            <div key={grp} className={`p-4 rounded-xl border text-center space-y-1.5 transition-all ${
              isCritical
                ? 'bg-red-500/10 border-red-500/40 neon-glow-red'
                : 'glass-card border-clinical-border'
            }`}>
              <div className="flex justify-between items-center">
                <span className="text-xs font-bold text-slate-300">{grp}</span>
                {isCritical && <AlertTriangle className="h-3.5 w-3.5 text-red-500 animate-bounce" />}
              </div>
              <p className={`text-2xl font-extrabold ${isCritical ? 'text-red-400' : 'text-white'}`}>
                {qty}
              </p>
              <p className="text-[9px] text-slate-500 font-semibold uppercase tracking-wider">Available Units</p>
            </div>
          );
        })}
      </div>

      {/* Main Grid: Inventory Adjustment & Expiry Tracking */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        {/* Left: Quick Adjust & Visual Chart */}
        <div className="lg:col-span-7 space-y-6">
          {/* Visual Stock Levels Chart */}
          <div className="p-6 rounded-2xl glass-panel border border-clinical-border space-y-4">
            <h3 className="text-base font-bold text-white flex items-center space-x-2">
              <BarChart3 className="h-5 w-5 text-brand-primary" />
              <span>Real-Time Inventory Levels by Blood Group</span>
            </h3>
            <div className="w-full h-48">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={chartData}>
                  <XAxis dataKey="name" stroke="#64748b" fontSize={11} />
                  <YAxis stroke="#64748b" fontSize={10} />
                  <Tooltip contentStyle={{ backgroundColor: '#0f172a', borderColor: '#1e293b', fontSize: 11 }} />
                  <Bar dataKey="Units" fill="#ef4444" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Direct Stock Level Adjustment Form */}
          <div className="p-6 rounded-2xl glass-panel border border-clinical-border space-y-4">
            <h3 className="text-base font-bold text-white flex items-center space-x-2">
              <Edit className="h-4 w-4 text-brand-primary" />
              <span>Record Inventory Adjustment & Transfusion Outflow</span>
            </h3>

            <form onSubmit={handleUpdateStock} className="grid grid-cols-1 sm:grid-cols-3 gap-3 items-end text-xs">
              <div>
                <label className="block font-semibold text-slate-400 uppercase tracking-wider mb-1">Select Blood Group</label>
                <select
                  value={editGroup}
                  onChange={(e) => setEditGroup(e.target.value)}
                  className="w-full px-3 py-2.5 rounded-lg glass-input bg-slate-900 text-white"
                >
                  {BLOOD_GROUPS.map(g => <option key={g} value={g}>{g} (Current: {stocks[g] || 0})</option>)}
                </select>
              </div>

              <div>
                <label className="block font-semibold text-slate-400 uppercase tracking-wider mb-1">New Total Available Units</label>
                <input
                  type="number"
                  min="0"
                  required
                  value={editQuantity}
                  onChange={(e) => setEditQuantity(e.target.value)}
                  placeholder="e.g. 15"
                  className="w-full px-3 py-2.5 rounded-lg glass-input text-xs"
                />
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full py-2.5 rounded-lg bg-brand-primary hover:bg-brand-hover text-white font-bold transition-all flex items-center justify-center space-x-1 cursor-pointer"
              >
                <Save className="h-3.5 w-3.5" />
                <span>{loading ? 'Saving...' : 'Confirm & Log Audit'}</span>
              </button>
            </form>
          </div>
        </div>

        {/* Right: Cold-Chain Expiry Packets */}
        <div className="lg:col-span-5 p-6 rounded-2xl glass-panel border border-clinical-border space-y-4">
          <div className="flex justify-between items-center border-b border-slate-800 pb-3">
            <h3 className="text-base font-bold text-white flex items-center space-x-2">
              <Calendar className="h-4 w-4 text-brand-primary" />
              <span>Shelf-Life & Expiry Tracking</span>
            </h3>
            <span className="text-[10px] text-slate-400">{expiringPackets.length} Packets Monitored</span>
          </div>

          <div className="space-y-3 max-h-96 overflow-y-auto">
            {expiringPackets.map(packet => {
              const isUrgent = packet.status === 'EXPIRING_SOON';
              return (
                <div key={packet.id} className={`p-3.5 rounded-xl border flex justify-between items-center text-xs ${
                  isUrgent ? 'bg-red-500/10 border-red-500/30' : 'bg-navy-900/40 border-slate-800'
                }`}>
                  <div className="space-y-0.5">
                    <div className="flex items-center space-x-2">
                      <span className="font-bold text-slate-200">{packet.units} Unit ({packet.bloodGroup})</span>
                      <span className={`px-2 py-0.5 rounded text-[9px] font-bold ${
                        isUrgent ? 'bg-red-500/20 text-red-400' : 'bg-green-500/10 text-green-400'
                      }`}>
                        {packet.status.replace('_', ' ')}
                      </span>
                    </div>
                    <p className="text-[10px] text-slate-400">Expires: {packet.expiryDate}</p>
                  </div>

                  <div className="flex items-center space-x-2">
                    {packet.status !== 'DISCARDED' && (
                      <button
                        onClick={() => handleUpdatePacketStatus(packet.id, 'DISCARDED')}
                        title="Mark as Safely Discarded / Transfused"
                        className="px-2.5 py-1 rounded bg-slate-800 hover:bg-slate-750 text-[10px] text-slate-300 font-semibold transition-colors cursor-pointer"
                      >
                        Discard
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Add Expiry Packet Modal */}
      {showAddPacket && (
        <div className="fixed inset-0 bg-black/75 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="w-full max-w-md rounded-2xl glass-panel border border-clinical-border p-6 space-y-5 animate-in zoom-in-95 duration-150">
            <div className="flex justify-between items-center border-b border-slate-800 pb-3">
              <h3 className="text-base font-bold text-white flex items-center space-x-2">
                <PackagePlus className="h-4 w-4 text-brand-primary" />
                <span>Register New Blood Packet</span>
              </h3>
              <button onClick={() => setShowAddPacket(false)} className="text-slate-400 hover:text-white p-1">✕</button>
            </div>

            <form onSubmit={handleAddExpiryPacket} className="space-y-4 text-xs">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-400 uppercase tracking-wider mb-1">Blood Group</label>
                  <select
                    value={newGroup}
                    onChange={(e) => setNewGroup(e.target.value)}
                    className="w-full px-3 py-2.5 rounded-lg glass-input bg-slate-900 text-white"
                  >
                    {BLOOD_GROUPS.map(g => <option key={g} value={g}>{g}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block font-semibold text-slate-400 uppercase tracking-wider mb-1">Units (Pints)</label>
                  <input
                    type="number"
                    min="1"
                    required
                    value={newUnits}
                    onChange={(e) => setNewUnits(e.target.value)}
                    className="w-full px-3 py-2.5 rounded-lg glass-input"
                  />
                </div>
              </div>

              <div>
                <label className="block font-semibold text-slate-400 uppercase tracking-wider mb-1">Expiry Date (35-day red cell shelf life)</label>
                <input
                  type="date"
                  required
                  value={newExpiryDate}
                  onChange={(e) => setNewExpiryDate(e.target.value)}
                  className="w-full px-3 py-2.5 rounded-lg glass-input"
                />
              </div>

              <div className="pt-2 flex justify-end space-x-2">
                <button
                  type="button"
                  onClick={() => setShowAddPacket(false)}
                  className="px-4 py-2 rounded-lg bg-navy-900 text-slate-400 text-xs font-semibold hover:bg-slate-800 cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-lg bg-brand-primary hover:bg-brand-hover text-white text-xs font-bold shadow-md cursor-pointer"
                >
                  Save to Cold-Chain
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
