import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Heart, Activity, MapPin, Users, Droplet, Sparkles, CheckCircle2, ChevronDown, ChevronUp, AlertCircle, Building, Building2, ShieldCheck, ArrowRight, Shield, Compass, Bell, Clock } from 'lucide-react';

export default function LandingPage({ onOpenRoleModal }) {
  const [metrics, setMetrics] = useState({
    donorsCount: 0,
    activeRequestsCount: 0,
    fulfilledCount: 0,
    hospitalsCount: 0
  });
  const [faqOpen, setFaqOpen] = useState(null);

  useEffect(() => {
    const fetchLiveStats = async () => {
      try {
        const res = await fetch('/api/admin/metrics');
        if (res.ok) {
          const data = await res.json();
          setMetrics({
            donorsCount: data.users?.donors || 0,
            activeRequestsCount: data.requests?.activeEmergency || 0,
            fulfilledCount: data.requests?.fulfilled || 0,
            hospitalsCount: data.users?.hospitals || 0
          });
        }
      } catch (e) {
        // Handled silently
      }
    };
    fetchLiveStats();
  }, []);

  const toggleFaq = (index) => {
    setFaqOpen(faqOpen === index ? null : index);
  };

  const FAQS = [
    {
      q: "Am I eligible to donate blood under DonorSync clinical pre-screening?",
      a: "Healthy adults aged 18 to 65 weighing over 50kg (110 lbs) are eligible for pre-screening. Donors must be free of acute infections or fever, have at least a 90-day rest interval since their last donation, and have a 6-month wait period after receiving tattoos or piercings. Note: Pre-screening only. Final eligibility is determined by qualified healthcare professionals."
    },
    {
      q: "How does the explainable matching algorithm work?",
      a: "DonorSync calculates biological compatibility (e.g. O- is universal for red cells), determines Great-Circle distance using the Haversine formula, verifies the mandatory 90-day donation rest interval, and weights past reliability ratings into an explainable 100-point composite match score without fabricated metrics."
    },
    {
      q: "How is donor privacy protected?",
      a: "All public radar scans mask donor names and contact numbers. Direct communication is only authorized when an emergency request is officially confirmed by the life saver or verified clinical facility."
    },
    {
      q: "Can hospitals and NGOs integrate directly?",
      a: "Yes. Certified hospitals, trauma centers, and community NGOs register dedicated accounts to broadcast emergency calls, schedule regional donation drives, track inbound donor ETAs, and audit regional blood bank stock levels."
    }
  ];

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-10 pb-24 font-sans space-y-20 text-left">
      {/* 1. HERO SECTION */}
      <div className="relative grid grid-cols-1 lg:grid-cols-12 gap-12 items-center">
        <div className="lg:col-span-7 space-y-6">
          <div className="inline-flex items-center space-x-2 px-3.5 py-1.5 rounded-full bg-brand-primary/10 border border-brand-primary/25 text-brand-primary text-xs font-bold neon-glow-red">
            <Sparkles className="h-3.5 w-3.5 animate-spin" />
            <span>AI-Assisted Emergency Healthcare Logistics</span>
          </div>
          
          <h1 className="text-4xl sm:text-6xl font-extrabold text-white leading-tight tracking-tight">
            Bridging Emergency <br />
            <span className="text-gradient-red">Blood Supply</span> with AI
          </h1>
          
          <p className="text-slate-400 text-sm sm:text-base max-w-xl leading-relaxed">
            DonorSync bridges the crucial golden hour between emergency trauma patients, nearby compatible life savers, and hospital networks using real-time geolocation matching and deterministic scoring.
          </p>

          <div className="flex flex-wrap gap-3 pt-2">
            <Link 
              to="/search" 
              className="px-6 py-3.5 rounded-xl bg-brand-primary hover:bg-brand-hover text-white font-bold text-xs text-center transition-all shadow-lg hover:shadow-brand-primary/30 cursor-pointer flex items-center justify-center space-x-2"
            >
              <span>Find Blood</span>
              <ArrowRight className="h-4 w-4" />
            </Link>

            <button
              onClick={() => onOpenRoleModal ? onOpenRoleModal() : null}
              className="px-6 py-3.5 rounded-xl bg-navy-800 border border-clinical-border hover:border-brand-primary/50 text-slate-200 font-semibold text-xs text-center transition-all cursor-pointer flex items-center justify-center space-x-1.5"
            >
              <Droplet className="h-4 w-4 text-brand-primary" />
              <span>Request Blood</span>
            </button>

            <Link 
              to="/register-donor" 
              className="px-6 py-3.5 rounded-xl bg-slate-900 border border-slate-800 hover:border-slate-700 text-slate-300 font-semibold text-xs text-center transition-all cursor-pointer flex items-center justify-center space-x-1.5"
            >
              <Heart className="h-4 w-4 text-brand-primary" />
              <span>Become a Donor</span>
            </Link>
          </div>
        </div>

        {/* Hero Interactive Radar Card */}
        <div className="lg:col-span-5 relative flex justify-center">
          <div className="w-[320px] h-[320px] rounded-full bg-brand-primary/10 absolute filter blur-3xl"></div>
          <div className="w-full max-w-[420px] p-6 rounded-3xl glass-panel border border-clinical-border relative space-y-6 shadow-2xl">
            <div className="flex justify-between items-center border-b border-slate-800 pb-3">
              <div className="flex items-center space-x-2">
                <span className="w-2.5 h-2.5 rounded-full bg-red-500 animate-ping"></span>
                <span className="text-xs font-bold text-slate-200 uppercase tracking-wider">Live Radar Simulation</span>
              </div>
              <span className="text-[10px] text-brand-primary font-bold uppercase bg-brand-primary/10 px-2.5 py-0.5 rounded-full border border-brand-primary/20">
                Critical Priority
              </span>
            </div>

            <div className="space-y-3 text-xs">
              <div className="flex justify-between">
                <span className="text-slate-400">Required Group:</span>
                <span className="text-white font-bold flex items-center space-x-1">
                  <Droplet className="h-4 w-4 text-brand-primary animate-pulse" />
                  <span>O- (Universal Red Cell)</span>
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">Clinical Facility:</span>
                <span className="text-slate-300 font-semibold">St. Jude General Hospital</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">Dispatch Radius:</span>
                <span className="text-emerald-400 font-bold">15 km Active Range</span>
              </div>
            </div>

            <div className="p-3.5 rounded-2xl bg-slate-900/80 border border-slate-800 text-[11px] text-slate-400 leading-relaxed">
              Nearby registered life savers receive instantaneous in-app and SMS alerts with route transit calculations.
            </div>
          </div>
        </div>
      </div>

      {/* 2. LIVE REAL DATABASE METRICS */}
      <div className="p-8 rounded-3xl glass-panel border border-clinical-border">
        <div className="text-center mb-8 space-y-1">
          <h3 className="text-xl font-extrabold text-white">Live Network Statistics</h3>
          <p className="text-xs text-slate-400">Verified counts pulled directly from our active PostgreSQL database.</p>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-6 text-center">
          <div className="space-y-1">
            <h4 className="text-3xl font-extrabold text-white">{metrics.donorsCount}</h4>
            <p className="text-xs text-slate-400 font-semibold">Registered Donors</p>
          </div>
          <div className="space-y-1">
            <h4 className="text-3xl font-extrabold text-brand-primary">{metrics.activeRequestsCount}</h4>
            <p className="text-xs text-slate-400 font-semibold">Active Emergencies</p>
          </div>
          <div className="space-y-1">
            <h4 className="text-3xl font-extrabold text-emerald-400">{metrics.fulfilledCount}</h4>
            <p className="text-xs text-slate-400 font-semibold">Fulfilled Transfusions</p>
          </div>
          <div className="space-y-1">
            <h4 className="text-3xl font-extrabold text-blue-400">{metrics.hospitalsCount}</h4>
            <p className="text-xs text-slate-400 font-semibold">Connected Hospitals</p>
          </div>
        </div>
      </div>

      {/* 3. HOW DONORSYNC WORKS */}
      <div className="space-y-10">
        <div className="text-center space-y-2">
          <h2 className="text-2xl sm:text-3xl font-extrabold text-white">How DonorSync Works</h2>
          <p className="text-xs text-slate-400 max-w-xl mx-auto">
            From critical clinical request to life-saving transfusion in four deterministic steps.
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          <div className="p-6 rounded-2xl glass-card border border-clinical-border space-y-3">
            <div className="w-10 h-10 rounded-xl bg-red-500/10 text-brand-primary flex items-center justify-center font-black">
              1
            </div>
            <h4 className="text-sm font-bold text-white">Emergency Request</h4>
            <p className="text-xs text-slate-400 leading-relaxed">
              Patient or Hospital issues request specifying patient name, required units, and urgency level.
            </p>
          </div>

          <div className="p-6 rounded-2xl glass-card border border-clinical-border space-y-3">
            <div className="w-10 h-10 rounded-xl bg-blue-500/10 text-blue-400 flex items-center justify-center font-black">
              2
            </div>
            <h4 className="text-sm font-bold text-white">Radar AI Matching</h4>
            <p className="text-xs text-slate-400 leading-relaxed">
              Our algorithm evaluates blood compatibility, GPS proximity, and donor rest intervals to rank matches.
            </p>
          </div>

          <div className="p-6 rounded-2xl glass-card border border-clinical-border space-y-3">
            <div className="w-10 h-10 rounded-xl bg-amber-500/10 text-amber-400 flex items-center justify-center font-black">
              3
            </div>
            <h4 className="text-sm font-bold text-white">Multi-Channel Alerts</h4>
            <p className="text-xs text-slate-400 leading-relaxed">
              Ranked donors immediately receive in-app notifications and urgent SMS alerts with transit estimates.
            </p>
          </div>

          <div className="p-6 rounded-2xl glass-card border border-clinical-border space-y-3">
            <div className="w-10 h-10 rounded-xl bg-emerald-500/10 text-emerald-400 flex items-center justify-center font-black">
              4
            </div>
            <h4 className="text-sm font-bold text-white">Rapid Dispatch & Care</h4>
            <p className="text-xs text-slate-400 leading-relaxed">
              Donor accepts the dispatch, the hospital is notified, and life-saving transfusion is completed.
            </p>
          </div>
        </div>
      </div>

      {/* 4. FIVE COMMUNITY ROLE PORTALS */}
      <div className="space-y-8">
        <div className="text-center space-y-2">
          <h3 className="text-2xl sm:text-3xl font-extrabold text-white">Supported Healthcare Roles</h3>
          <p className="text-xs text-slate-400 max-w-xl mx-auto">
            Dedicated digital workflows for life savers, patients, healthcare facilities, and NGOs.
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
          <div className="p-5 rounded-2xl glass-card border border-clinical-border space-y-3">
            <Heart className="h-6 w-6 text-brand-primary" />
            <h4 className="text-sm font-bold text-white">Life Saver / Donor</h4>
            <p className="text-[11px] text-slate-400 leading-relaxed">
              Set availability, respond to radius calls, and generate verifiable digital QR check-in passes.
            </p>
            <Link to="/register-donor" className="text-xs text-brand-primary font-semibold flex items-center space-x-1 hover:underline pt-1">
              <span>Register</span>
              <ArrowRight className="h-3 w-3" />
            </Link>
          </div>

          <div className="p-5 rounded-2xl glass-card border border-clinical-border space-y-3">
            <Users className="h-6 w-6 text-blue-400" />
            <h4 className="text-sm font-bold text-white">Patient / Receiver</h4>
            <p className="text-[11px] text-slate-400 leading-relaxed">
              Post emergency requests, monitor matched donors in real-time, and track fulfillment history.
            </p>
            <Link to="/register" className="text-xs text-blue-400 font-semibold flex items-center space-x-1 hover:underline pt-1">
              <span>Register</span>
              <ArrowRight className="h-3 w-3" />
            </Link>
          </div>

          <div className="p-5 rounded-2xl glass-card border border-clinical-border space-y-3">
            <Building className="h-6 w-6 text-emerald-400" />
            <h4 className="text-sm font-bold text-white">Hospital Center</h4>
            <p className="text-[11px] text-slate-400 leading-relaxed">
              Broadcast critical OR trauma calls, audit compatible donors, and coordinate dispatches.
            </p>
            <Link to="/login?role=Hospital" className="text-xs text-emerald-400 font-semibold flex items-center space-x-1 hover:underline pt-1">
              <span>Login</span>
              <ArrowRight className="h-3 w-3" />
            </Link>
          </div>

          <div className="p-5 rounded-2xl glass-card border border-clinical-border space-y-3">
            <Building2 className="h-6 w-6 text-amber-400" />
            <h4 className="text-sm font-bold text-white">Blood Bank</h4>
            <p className="text-[11px] text-slate-400 leading-relaxed">
              Manage live available & reserved units across 8 blood groups and prevent expiry waste.
            </p>
            <Link to="/login?role=Blood%20Bank" className="text-xs text-amber-400 font-semibold flex items-center space-x-1 hover:underline pt-1">
              <span>Login</span>
              <ArrowRight className="h-3 w-3" />
            </Link>
          </div>

          <div className="p-5 rounded-2xl glass-card border border-clinical-border space-y-3">
            <Users className="h-6 w-6 text-purple-400" />
            <h4 className="text-sm font-bold text-white">NGO / Org</h4>
            <p className="text-[11px] text-slate-400 leading-relaxed">
              Launch regional donation drives, coordinate volunteer teams, and track target quotas.
            </p>
            <Link to="/login?role=NGO" className="text-xs text-purple-400 font-semibold flex items-center space-x-1 hover:underline pt-1">
              <span>Login</span>
              <ArrowRight className="h-3 w-3" />
            </Link>
          </div>
        </div>
      </div>

      {/* 5. FREQUENTLY ASKED QUESTIONS */}
      <div className="max-w-3xl mx-auto space-y-6">
        <div className="text-center space-y-1">
          <h3 className="text-2xl font-extrabold text-white">Clinical & Technical Questions</h3>
          <p className="text-xs text-slate-400">Everything you need to know about safety, matching, and data privacy.</p>
        </div>

        <div className="space-y-3">
          {FAQS.map((faq, idx) => (
            <div key={idx} className="rounded-2xl glass-panel border border-clinical-border overflow-hidden">
              <button
                onClick={() => toggleFaq(idx)}
                className="w-full p-4 text-left flex justify-between items-center text-xs sm:text-sm font-bold text-white hover:text-brand-primary transition-colors cursor-pointer"
              >
                <span>{faq.q}</span>
                {faqOpen === idx ? <ChevronUp className="h-4 w-4 shrink-0 text-brand-primary" /> : <ChevronDown className="h-4 w-4 shrink-0 text-slate-500" />}
              </button>
              {faqOpen === idx && (
                <div className="p-4 pt-0 text-xs text-slate-400 leading-relaxed border-t border-slate-800/40">
                  {faq.a}
                </div>
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
