import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { Check, MapPin, Compass, ShieldAlert, Heart, ArrowRight, UserCheck, AlertTriangle } from 'lucide-react';

export default function DonorRegistration() {
  const navigate = useNavigate();
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [geoLocating, setGeoLocating] = useState(false);
  const [registeredDonor, setRegisteredDonor] = useState(null);

  // Form state
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '',
    bloodGroup: 'O-',
    age: '26',
    weight: '65',
    gender: 'Male',
    city: 'Bengaluru',
    state: 'Karnataka',
    pincode: '560001',
    latitude: 12.9716,
    longitude: 77.5946,
    lastDonationDate: '',
    tattooRecent: 'no',
    feverRecent: 'no',
    medicationRecent: 'no'
  });

  const BLOOD_GROUPS = ['O-', 'O+', 'A-', 'A+', 'B-', 'B+', 'AB-', 'AB+'];

  const handleChange = (e) => {
    setFormData(prev => ({ ...prev, [e.target.name]: e.target.value }));
    setError('');
  };

  const handleUseCurrentLocation = () => {
    if (!navigator.geolocation) {
      setError('Geolocation is not supported by your browser. Please enter your city manually.');
      return;
    }

    setGeoLocating(true);
    setError('');

    navigator.geolocation.getCurrentPosition(
      (position) => {
        setFormData(prev => ({
          ...prev,
          latitude: parseFloat(position.coords.latitude.toFixed(6)),
          longitude: parseFloat(position.coords.longitude.toFixed(6))
        }));
        setGeoLocating(false);
      },
      (err) => {
        setGeoLocating(false);
        setError('Location permission denied or unavailable. Using manual address settings.');
      },
      { timeout: 10000 }
    );
  };

  const handleNext = () => {
    setError('');

    if (step === 1) {
      if (!formData.name.trim() || !formData.email.trim() || !formData.phone.trim()) {
        setError('Please fill in your name, email, and mobile phone number.');
        return;
      }
      const ageNum = parseInt(formData.age, 10);
      const weightNum = parseFloat(formData.weight);
      if (isNaN(ageNum) || ageNum < 18 || ageNum > 65) {
        setError('Age validation: Donors must be between 18 and 65 years old.');
        return;
      }
      if (isNaN(weightNum) || weightNum < 50) {
        setError('Weight validation: Donors must weigh at least 50 kg (110 lbs).');
        return;
      }
    }

    if (step === 2) {
      if (!formData.city.trim()) {
        setError('Please enter your current city or district.');
        return;
      }
    }

    setStep(prev => prev + 1);
  };

  const handlePrev = () => {
    setError('');
    setStep(prev => prev - 1);
  };

  const handleSubmit = async () => {
    setError('');

    // PHASE 7 BUG FIX: Strictly validate blocking deferral criteria and RETURN if triggered!
    if (formData.tattooRecent === 'yes') {
      setError('Temporary Clinical Deferral: Regulations require a 6-month wait period after receiving a tattoo or piercing before blood donation.');
      return; // CRITICAL: Stop submission!
    }

    if (formData.feverRecent === 'yes') {
      setError('Temporary Clinical Deferral: You must be free of active fever, infection, or acute flu symptoms for at least 14 days before donating.');
      return; // CRITICAL: Stop submission!
    }

    setLoading(true);

    try {
      const res = await fetch('/api/donors/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: formData.name.trim(),
          bloodGroup: formData.bloodGroup,
          email: formData.email.trim(),
          phone: formData.phone.trim(),
          age: parseInt(formData.age, 10),
          weight: parseFloat(formData.weight),
          city: formData.city.trim(),
          state: formData.state.trim(),
          pincode: formData.pincode.trim(),
          latitude: formData.latitude,
          longitude: formData.longitude,
          lastDonationDate: formData.lastDonationDate || null
        })
      });

      const data = await res.json();

      // PHASE 7 BUG FIX: If registration failed, show failure error and DO NOT advance to success!
      if (!res.ok) {
        throw new Error(data.error || 'Failed to complete donor registration. Please try again.');
      }

      setRegisteredDonor(data.donor);
      setStep(4); // Advance to confirmation only on genuine success!
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-2xl mx-auto my-12 p-8 rounded-2xl glass-panel border border-clinical-border font-sans text-left relative">
      {/* Visual Step Progress Indicator */}
      <div className="flex items-center justify-between border-b border-slate-800 pb-6 mb-8">
        {[1, 2, 3].map((num) => (
          <div key={num} className="flex items-center space-x-2">
            <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold transition-all ${
              step >= num 
                ? 'bg-brand-primary text-white neon-glow-red' 
                : 'bg-navy-900 text-slate-500 border border-slate-800'
            }`}>
              {step > num ? <Check className="h-4 w-4" /> : num}
            </div>
            <span className={`text-xs font-semibold ${step >= num ? 'text-white' : 'text-slate-500'}`}>
              {num === 1 ? 'Personal' : num === 2 ? 'Location' : 'Pre-Screening'}
            </span>
            {num < 3 && <div className="w-12 h-[1px] bg-slate-800 hidden sm:block"></div>}
          </div>
        ))}
      </div>

      {/* Error Message Display */}
      {error && (
        <div className="p-3 mb-6 rounded-lg bg-red-500/10 border border-red-500/20 text-xs text-red-400 flex items-start space-x-2 animate-in fade-in duration-150">
          <ShieldAlert className="h-4 w-4 shrink-0 mt-0.5" />
          <span className="leading-relaxed">{error}</span>
        </div>
      )}

      {/* STEP 1: Personal Credentials & Blood Type */}
      {step === 1 && (
        <div className="space-y-6">
          <div className="space-y-1">
            <h3 className="text-xl font-extrabold text-white">Step 1: Personal Credentials</h3>
            <p className="text-xs text-slate-400">Provide verified contact details and select your confirmed blood type.</p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1.5">Full Name</label>
              <input
                type="text"
                name="name"
                value={formData.name}
                onChange={handleChange}
                placeholder="e.g. John Doe"
                className="w-full px-4 py-2.5 rounded-lg glass-input text-xs"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1.5">Email Address</label>
              <input
                type="email"
                name="email"
                value={formData.email}
                onChange={handleChange}
                placeholder="e.g. john@gmail.com"
                className="w-full px-4 py-2.5 rounded-lg glass-input text-xs"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1.5">Phone Number</label>
              <input
                type="tel"
                name="phone"
                value={formData.phone}
                onChange={handleChange}
                placeholder="+1 555-0192"
                className="w-full px-4 py-2.5 rounded-lg glass-input text-xs"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1.5">Age (Years)</label>
              <input
                type="number"
                name="age"
                min="18"
                max="65"
                value={formData.age}
                onChange={handleChange}
                className="w-full px-4 py-2.5 rounded-lg glass-input text-xs"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1.5">Weight (kg)</label>
              <input
                type="number"
                name="weight"
                min="50"
                value={formData.weight}
                onChange={handleChange}
                className="w-full px-4 py-2.5 rounded-lg glass-input text-xs"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">Blood Group</label>
            <div className="grid grid-cols-4 sm:grid-cols-8 gap-2">
              {BLOOD_GROUPS.map(grp => (
                <button
                  key={grp}
                  type="button"
                  onClick={() => setFormData(prev => ({ ...prev, bloodGroup: grp }))}
                  className={`py-2 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                    formData.bloodGroup === grp
                      ? 'bg-brand-primary text-white neon-glow-red border border-red-500/40'
                      : 'bg-navy-900 text-slate-400 border border-slate-800 hover:text-white'
                  }`}
                >
                  {grp}
                </button>
              ))}
            </div>
          </div>

          <div className="pt-4 flex justify-end">
            <button
              type="button"
              onClick={handleNext}
              className="px-6 py-2.5 rounded-lg bg-brand-primary hover:bg-brand-hover text-white text-xs font-bold transition-all flex items-center space-x-1 cursor-pointer"
            >
              <span>Continue to Location</span>
              <ArrowRight className="h-4 w-4" />
            </button>
          </div>
        </div>
      )}

      {/* STEP 2: Real Location & Coordinates */}
      {step === 2 && (
        <div className="space-y-6">
          <div className="space-y-1">
            <h3 className="text-xl font-extrabold text-white">Step 2: Location & Emergency Radius</h3>
            <p className="text-xs text-slate-400">Accurate coordinates ensure hospitals find you during critical-time trauma dispatches.</p>
          </div>

          {/* GPS Coordinate Button */}
          <div className="p-4 rounded-xl bg-navy-900/40 border border-slate-800 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
            <div className="space-y-0.5">
              <p className="text-xs font-bold text-slate-200 flex items-center space-x-1.5">
                <Compass className="h-4 w-4 text-brand-primary" />
                <span>Browser GPS Auto-Detect</span>
              </p>
              <p className="text-[10px] text-slate-500">Uses your device's geolocation sensors to calibrate coordinates.</p>
            </div>
            <button
              type="button"
              onClick={handleUseCurrentLocation}
              disabled={geoLocating}
              className="px-4 py-2 rounded-lg bg-navy-800 hover:bg-slate-800 border border-slate-700 text-slate-200 text-xs font-semibold flex items-center space-x-1.5 transition-all cursor-pointer shrink-0"
            >
              <MapPin className={`h-3.5 w-3.5 ${geoLocating ? 'animate-bounce text-brand-primary' : ''}`} />
              <span>{geoLocating ? 'Locating...' : 'Use My Current Location'}</span>
            </button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1.5">City / District</label>
              <input
                type="text"
                name="city"
                value={formData.city}
                onChange={handleChange}
                placeholder="e.g. Bengaluru"
                className="w-full px-4 py-2.5 rounded-lg glass-input text-xs"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1.5">State / Province</label>
              <input
                type="text"
                name="state"
                value={formData.state}
                onChange={handleChange}
                placeholder="e.g. Karnataka"
                className="w-full px-4 py-2.5 rounded-lg glass-input text-xs"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1.5">Pincode</label>
              <input
                type="text"
                name="pincode"
                value={formData.pincode}
                onChange={handleChange}
                placeholder="e.g. 560001"
                className="w-full px-4 py-2.5 rounded-lg glass-input text-xs"
              />
            </div>
          </div>

          <div className="p-3 rounded-lg bg-slate-900/60 border border-slate-800 flex items-center justify-between text-xs text-slate-400">
            <span>Calibrated Radar Coordinates:</span>
            <span className="font-mono text-slate-200 font-bold">{formData.latitude}° N, {formData.longitude}° E</span>
          </div>

          <div className="pt-4 flex justify-between">
            <button
              type="button"
              onClick={handlePrev}
              className="px-5 py-2.5 rounded-lg bg-navy-900 hover:bg-slate-800 text-slate-400 text-xs font-semibold transition-all cursor-pointer"
            >
              Back
            </button>
            <button
              type="button"
              onClick={handleNext}
              className="px-6 py-2.5 rounded-lg bg-brand-primary hover:bg-brand-hover text-white text-xs font-bold transition-all flex items-center space-x-1 cursor-pointer"
            >
              <span>Continue to Pre-Screening</span>
              <ArrowRight className="h-4 w-4" />
            </button>
          </div>
        </div>
      )}

      {/* STEP 3: Pre-Screening Questionnaire with Medical Notice */}
      {step === 3 && (
        <div className="space-y-6">
          <div className="space-y-1">
            <h3 className="text-xl font-extrabold text-white">Step 3: Medical Pre-Screening</h3>
            <p className="text-xs text-slate-400">Clinical regulations protect both the donor and the receiving patient.</p>
          </div>

          {/* Mandatory Clinical Disclaimer */}
          <div className="p-3.5 rounded-xl bg-yellow-500/10 border border-yellow-500/20 text-xs text-yellow-400/90 flex items-start space-x-2">
            <AlertTriangle className="h-4 w-4 text-yellow-500 shrink-0 mt-0.5" />
            <p className="leading-relaxed">
              <strong>Clinical Notice:</strong> Pre-screening only. Final eligibility is determined by qualified healthcare professionals.
            </p>
          </div>

          <div className="space-y-4 text-xs">
            <div>
              <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1.5">Date of Last Blood Donation (if applicable)</label>
              <input
                type="date"
                name="lastDonationDate"
                value={formData.lastDonationDate}
                onChange={handleChange}
                className="w-full px-4 py-2.5 rounded-lg glass-input text-xs"
              />
              <p className="text-[10px] text-slate-500 mt-1">Leave empty if you are a first-time life saver.</p>
            </div>

            <div className="p-3.5 rounded-xl bg-navy-900/40 border border-slate-800 flex justify-between items-center">
              <div>
                <p className="font-bold text-slate-200">Recent Tattoos or Piercings</p>
                <p className="text-[10px] text-slate-400">Have you received a tattoo or body piercing within the last 6 months?</p>
              </div>
              <div className="flex space-x-2">
                <button
                  type="button"
                  onClick={() => setFormData(prev => ({ ...prev, tattooRecent: 'no' }))}
                  className={`px-3 py-1 rounded text-xs font-bold ${formData.tattooRecent === 'no' ? 'bg-green-500/20 text-green-400 border border-green-500/40' : 'bg-slate-800 text-slate-400'}`}
                >
                  No
                </button>
                <button
                  type="button"
                  onClick={() => setFormData(prev => ({ ...prev, tattooRecent: 'yes' }))}
                  className={`px-3 py-1 rounded text-xs font-bold ${formData.tattooRecent === 'yes' ? 'bg-red-500/20 text-red-400 border border-red-500/40' : 'bg-slate-800 text-slate-400'}`}
                >
                  Yes
                </button>
              </div>
            </div>

            <div className="p-3.5 rounded-xl bg-navy-900/40 border border-slate-800 flex justify-between items-center">
              <div>
                <p className="font-bold text-slate-200">Active Fever or Acute Illness</p>
                <p className="text-[10px] text-slate-400">Do you currently feel unwell, feverish, or taking acute antibiotics?</p>
              </div>
              <div className="flex space-x-2">
                <button
                  type="button"
                  onClick={() => setFormData(prev => ({ ...prev, feverRecent: 'no' }))}
                  className={`px-3 py-1 rounded text-xs font-bold ${formData.feverRecent === 'no' ? 'bg-green-500/20 text-green-400 border border-green-500/40' : 'bg-slate-800 text-slate-400'}`}
                >
                  No
                </button>
                <button
                  type="button"
                  onClick={() => setFormData(prev => ({ ...prev, feverRecent: 'yes' }))}
                  className={`px-3 py-1 rounded text-xs font-bold ${formData.feverRecent === 'yes' ? 'bg-red-500/20 text-red-400 border border-red-500/40' : 'bg-slate-800 text-slate-400'}`}
                >
                  Yes
                </button>
              </div>
            </div>
          </div>

          <div className="pt-4 flex justify-between">
            <button
              type="button"
              onClick={handlePrev}
              className="px-5 py-2.5 rounded-lg bg-navy-900 hover:bg-slate-800 text-slate-400 text-xs font-semibold transition-all cursor-pointer"
            >
              Back
            </button>
            <button
              type="button"
              onClick={handleSubmit}
              disabled={loading}
              className="px-6 py-2.5 rounded-lg bg-brand-primary hover:bg-brand-hover text-white text-xs font-bold transition-all flex items-center space-x-1.5 cursor-pointer shadow-lg hover:shadow-brand-primary/20"
            >
              <UserCheck className="h-4 w-4" />
              <span>{loading ? 'Submitting...' : 'Register as Active Donor'}</span>
            </button>
          </div>
        </div>
      )}

      {/* STEP 4: Genuine Success Confirmation Screen */}
      {step === 4 && (
        <div className="py-8 text-center space-y-6 animate-in zoom-in-95 duration-200">
          <div className="w-16 h-16 rounded-full bg-green-500/10 border border-green-500/30 flex items-center justify-center mx-auto text-green-400 neon-glow-green">
            <Check className="h-8 w-8" />
          </div>

          <div className="space-y-2">
            <h3 className="text-2xl font-extrabold text-white">Registration Confirmed!</h3>
            <p className="text-xs text-slate-400 max-w-md mx-auto">
              Your profile has been entered into the active DonorSync emergency radar network. You will receive notifications when matching patients need critical care.
            </p>
          </div>

          {registeredDonor && (
            <div className="p-4 rounded-xl bg-slate-900/60 border border-slate-800 max-w-sm mx-auto space-y-2 text-xs">
              <div className="flex justify-between">
                <span className="text-slate-400">Donor Name:</span>
                <span className="text-slate-200 font-bold">{registeredDonor.name}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">Blood Type:</span>
                <span className="text-brand-primary font-bold">{registeredDonor.bloodGroup}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">Assigned Donor ID:</span>
                <span className="font-mono text-slate-300">{registeredDonor.donorCode}</span>
              </div>
            </div>
          )}

          <div className="flex flex-col sm:flex-row justify-center gap-3 pt-4">
            <Link
              to="/dashboard/donor"
              className="px-6 py-2.5 rounded-lg bg-brand-primary hover:bg-brand-hover text-white text-xs font-bold transition-all"
            >
              Go to Donor Dashboard
            </Link>
            <Link
              to="/"
              className="px-6 py-2.5 rounded-lg bg-navy-800 hover:bg-slate-800 border border-slate-700 text-slate-300 text-xs font-semibold transition-all"
            >
              Return Home
            </Link>
          </div>
        </div>
      )}
    </div>
  );
}
