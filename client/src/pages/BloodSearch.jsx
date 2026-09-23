import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Search, MapPin, Compass, AlertCircle, Droplet, Phone, Star, ShieldAlert, Navigation } from 'lucide-react';

export default function BloodSearch() {
  const [selectedGroup, setSelectedGroup] = useState('O-');
  const [radius, setRadius] = useState(15);
  const [city, setCity] = useState('Bengaluru');
  const [pincode, setPincode] = useState('');
  const [latitude, setLatitude] = useState(12.9716);
  const [longitude, setLongitude] = useState(77.5946);
  const [donors, setDonors] = useState([]);
  const [loading, setLoading] = useState(false);
  const [locating, setLocating] = useState(false);
  const [scanPulse, setScanPulse] = useState(false);
  const [statusBanner, setStatusBanner] = useState('');

  const BLOOD_GROUPS = ['O-', 'O+', 'A-', 'A+', 'B-', 'B+', 'AB-', 'AB+'];
  const RADIUS_OPTIONS = [5, 10, 15, 25, 50];

  const handleUseLocation = () => {
    if (!navigator.geolocation) {
      setStatusBanner('Geolocation is not supported by your current browser.');
      return;
    }

    setLocating(true);
    setStatusBanner('Calibrating coordinates via device GPS...');

    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const lat = parseFloat(pos.coords.latitude.toFixed(4));
        const lon = parseFloat(pos.coords.longitude.toFixed(4));
        setLatitude(lat);
        setLongitude(lon);
        setCity('Device GPS Location');
        setLocating(false);
        setStatusBanner(`Location calibrated: ${lat}° N, ${lon}° E`);
        fetchDonors(lat, lon);
      },
      () => {
        setLocating(false);
        setStatusBanner('Location permission denied. You can search by city name or pincode.');
      },
      { timeout: 8000 }
    );
  };

  const fetchDonors = async (lat = latitude, lon = longitude) => {
    setLoading(true);
    setScanPulse(true);
    try {
      const res = await fetch(`/api/matching/donors?lat=${lat}&lon=${lon}&bloodGroup=${encodeURIComponent(selectedGroup)}&radius=${radius}`);
      if (res.ok) {
        const data = await res.json();
        setDonors(data.matches || []);
      }
    } catch (err) {
      console.warn('Matching query error:', err.message);
    } finally {
      setLoading(false);
      setTimeout(() => setScanPulse(false), 1200);
    }
  };

  useEffect(() => {
    fetchDonors();
  }, [selectedGroup, radius]);

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 font-sans space-y-8 text-left">
      <div className="space-y-2">
        <h2 className="text-3xl font-extrabold text-white">Live Blood Availability Radar</h2>
        <p className="text-xs text-slate-400">Search compatible donors and check nearby inventory stocks using real GPS coordinate scans.</p>
      </div>

      {statusBanner && (
        <div className="p-3 rounded-xl bg-blue-500/10 border border-blue-500/30 text-xs text-blue-400 flex items-center justify-between">
          <span>{statusBanner}</span>
          <button onClick={() => setStatusBanner('')} className="text-slate-400 hover:text-white cursor-pointer">✕</button>
        </div>
      )}

      {/* Filter Panel */}
      <div className="p-6 rounded-2xl glass-panel border border-clinical-border space-y-5">
        {/* Blood Group Selector */}
        <div>
          <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">Blood Group Required</label>
          <div className="grid grid-cols-4 sm:grid-cols-8 gap-2">
            {BLOOD_GROUPS.map(grp => (
              <button
                key={grp}
                onClick={() => setSelectedGroup(grp)}
                className={`py-2.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                  selectedGroup === grp 
                    ? 'bg-brand-primary text-white neon-glow-red border border-red-500/30 shadow-md' 
                    : 'bg-slate-900 text-slate-400 border border-slate-800 hover:text-white'
                }`}
              >
                {grp}
              </button>
            ))}
          </div>
        </div>

        {/* Search Coordinates & Location Inputs */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 items-end">
          <div>
            <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1.5">Search City</label>
            <div className="relative">
              <MapPin className="absolute left-3 top-3 h-4 w-4 text-slate-500" />
              <input
                type="text"
                value={city}
                onChange={(e) => setCity(e.target.value)}
                placeholder="e.g. Bengaluru, IN"
                className="w-full pl-9 pr-10 py-2.5 rounded-xl glass-input text-xs"
              />
              <button
                onClick={handleUseLocation}
                title="Use GPS Coordinates"
                className="absolute right-2.5 top-2.5 text-slate-400 hover:text-brand-primary cursor-pointer p-0.5"
              >
                <Navigation className={`h-4 w-4 ${locating ? 'animate-spin text-brand-primary' : ''}`} />
              </button>
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1.5">Pincode (Optional)</label>
            <input
              type="text"
              value={pincode}
              onChange={(e) => setPincode(e.target.value)}
              placeholder="e.g. 560001"
              className="w-full px-4 py-2.5 rounded-xl glass-input text-xs"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1.5">Scanning Radius</label>
            <div className="grid grid-cols-5 gap-1.5">
              {RADIUS_OPTIONS.map(r => (
                <button
                  key={r}
                  type="button"
                  onClick={() => setRadius(r)}
                  className={`py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                    radius === r
                      ? 'bg-brand-primary text-white shadow-md'
                      : 'bg-slate-900 text-slate-400 border border-slate-800 hover:text-white'
                  }`}
                >
                  {r} km
                </button>
              ))}
            </div>
          </div>
        </div>

        <div className="flex justify-end pt-2">
          <button
            onClick={() => fetchDonors()}
            disabled={loading}
            className="px-6 py-2.5 rounded-xl bg-navy-800 border border-slate-700 hover:border-brand-primary/50 text-white font-bold text-xs tracking-wide transition-all cursor-pointer flex items-center space-x-2 shadow-md"
          >
            <Compass className={`h-4 w-4 ${scanPulse ? 'animate-spin text-brand-primary' : ''}`} />
            <span>{loading ? 'Scanning Radar...' : 'Trigger Radar Sweep'}</span>
          </button>
        </div>
      </div>

      {/* Grid: Donors List & Radar Visualization */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        {/* Left: Donor Matches */}
        <div className="lg:col-span-7 space-y-4">
          <div className="flex justify-between items-center px-1">
            <h3 className="text-lg font-bold text-white flex items-center space-x-2">
              <span>Matching Donors Scanned</span>
              <span className="px-2 py-0.5 text-[10px] rounded-full bg-navy-800 border border-slate-800 text-slate-400">
                {donors.length}
              </span>
            </h3>
            {selectedGroup === 'O-' && (
              <span className="text-[10px] text-yellow-500 font-bold bg-yellow-500/10 px-2 py-1 rounded-md border border-yellow-500/20 flex items-center space-x-1 animate-pulse">
                <AlertCircle className="h-3 w-3" />
                <span>O- is critical universal red cell stock</span>
              </span>
            )}
          </div>

          {loading ? (
            <div className="space-y-3">
              {[1, 2, 3].map(n => (
                <div key={n} className="h-24 rounded-xl bg-navy-900/40 border border-slate-900 animate-pulse"></div>
              ))}
            </div>
          ) : donors.length === 0 ? (
            <div className="p-12 text-center rounded-2xl border border-dashed border-slate-800 bg-navy-950/20 space-y-2">
              <Compass className="h-10 w-10 text-slate-600 mx-auto" />
              <p className="text-sm text-slate-400 font-semibold">No compatible donors inside the {radius}km scanning radius.</p>
              <p className="text-xs text-slate-500">Try expanding the range up to 50 km or selecting another compatible blood group.</p>
            </div>
          ) : (
            <div className="space-y-3">
              {donors.map(donor => (
                <div key={donor.id} className="p-4 rounded-2xl glass-card border border-clinical-border flex items-center justify-between hover:border-brand-primary/30 transition-all">
                  <div className="space-y-1.5">
                    <div className="flex items-center space-x-2">
                      <span className="w-2.5 h-2.5 rounded-full bg-brand-primary"></span>
                      <span className="text-xs font-bold text-slate-200">{donor.name}</span>
                      <span className="px-1.5 py-0.5 rounded bg-brand-primary/10 text-brand-primary text-[10px] font-bold">
                        {donor.bloodGroup}
                      </span>
                    </div>

                    <div className="flex items-center space-x-4 text-[10px] text-slate-500 font-medium">
                      <span className="flex items-center space-x-1">
                        <MapPin className="h-3.5 w-3.5" />
                        <span>{donor.distanceKm} km away (~{donor.routeEtaMinutes} min transit)</span>
                      </span>
                      <span>Last donation: {donor.lastDonationDate || 'First-time'}</span>
                    </div>

                    {donor.scoringExplanation && (
                      <p className="text-[9px] text-slate-400">{donor.scoringExplanation}</p>
                    )}
                  </div>

                  <div className="flex items-center space-x-4">
                    <div className="text-right">
                      <div className="text-[10px] text-slate-500 uppercase font-bold tracking-wider">Match Score</div>
                      <div className="text-xs font-bold text-brand-primary flex items-center justify-end space-x-0.5">
                        <Star className="h-3.5 w-3.5 fill-brand-primary text-brand-primary" />
                        <span>{donor.matchScore}%</span>
                      </div>
                    </div>

                    <Link
                      to="/login?role=Receiver"
                      className="px-3.5 py-2 rounded-xl bg-navy-800 border border-slate-700 hover:bg-slate-800 text-[11px] text-slate-300 font-bold transition-all flex items-center space-x-1 shrink-0"
                    >
                      <Phone className="h-3 w-3" />
                      <span>Request</span>
                    </Link>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Right: Vector Radar Display */}
        <div className="lg:col-span-5 rounded-2xl border border-clinical-border bg-slate-900/60 p-5 space-y-4">
          <div className="flex justify-between items-center border-b border-slate-800 pb-3">
            <span className="text-xs font-bold text-slate-300 uppercase tracking-wider flex items-center space-x-1.5">
              <Compass className={`h-4 w-4 ${scanPulse ? 'animate-spin text-brand-primary' : ''}`} />
              <span>Live GPS Compass Radar</span>
            </span>
            <span className="text-[9px] text-green-500 font-medium bg-green-500/10 px-2 py-0.5 rounded border border-green-500/20">
              Sensors Calibrated
            </span>
          </div>

          <div className="w-full aspect-square bg-navy-950/80 rounded-xl relative overflow-hidden border border-slate-850 flex items-center justify-center">
            <div className={`w-[90%] h-[90%] rounded-full border border-slate-800/40 absolute ${scanPulse ? 'animate-ping' : ''}`}></div>
            <div className="w-[70%] h-[70%] rounded-full border border-slate-800/60 absolute"></div>
            <div className="w-[40%] h-[40%] rounded-full border border-slate-800/80 absolute"></div>
            
            {/* Center target */}
            <div className="w-6 h-6 rounded-full bg-blue-500/20 border border-blue-500 flex items-center justify-center absolute z-10 animate-pulse">
              <div className="w-2.5 h-2.5 bg-blue-400 rounded-full"></div>
            </div>

            {/* Sweep Ray */}
            <div className="w-[50%] h-[2px] bg-gradient-to-r from-transparent to-brand-primary/40 origin-left absolute left-[50%] top-[50%] rotate-[45deg] animate-[spin_8s_linear_infinite]"></div>

            {/* Donor markers */}
            {donors.slice(0, 5).map((d, index) => {
              const positioning = [
                { top: '35%', left: '30%' },
                { top: '65%', left: '70%' },
                { top: '20%', left: '60%' },
                { top: '75%', left: '35%' },
                { top: '40%', left: '80%' }
              ];
              const pos = positioning[index % positioning.length];
              return (
                <div 
                  key={d.id} 
                  style={{ top: pos.top, left: pos.left }}
                  className="absolute flex flex-col items-center group cursor-pointer z-20"
                >
                  <div className="w-5 h-5 rounded-full bg-brand-primary/20 border border-brand-primary flex items-center justify-center animate-bounce">
                    <Droplet className="h-2.5 w-2.5 text-brand-primary fill-brand-primary" />
                  </div>
                  <div className="opacity-0 group-hover:opacity-100 bg-slate-900 border border-slate-800 p-1.5 rounded text-[9px] text-slate-300 absolute top-6 pointer-events-none transition-opacity whitespace-nowrap z-30">
                    {d.name} ({d.bloodGroup}) • {d.matchScore}% Match
                  </div>
                </div>
              );
            })}
          </div>

          <div className="p-3 bg-slate-900/60 rounded-lg text-[10px] text-slate-400 text-center flex items-center justify-center space-x-1.5">
            <ShieldAlert className="h-3.5 w-3.5 text-brand-primary shrink-0" />
            <span>Donor names are masked for HIPAA privacy. Log in as Hospital/Receiver to contact.</span>
          </div>
        </div>
      </div>
    </div>
  );
}
