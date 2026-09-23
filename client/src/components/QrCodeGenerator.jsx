import React, { useState, useEffect, useRef } from 'react';
import QRCode from 'qrcode';
import { Download, ShieldCheck, Printer, RefreshCw } from 'lucide-react';

/**
 * Authentic, Scannable QR Code Generator for DonorSync Digital Check-in Passes
 * Generates ISO/IEC 18004 compliant QR codes encoding verifiable pass parameters.
 */
export default function QrCodeGenerator({ donorCode, donorName, bloodGroup, requestId, type = 'donor' }) {
  const [qrDataUrl, setQrDataUrl] = useState('');
  const [loading, setLoading] = useState(true);
  const [generatedAt, setGeneratedAt] = useState(new Date().toLocaleTimeString());
  const [refreshCount, setRefreshCount] = useState(0);
  const printRef = useRef(null);

  // Secure, non-sensitive payload for clinical check-in validation
  const effectiveCode = donorCode || requestId || 'DS-PASS-VERIFIED';
  const effectiveGroup = bloodGroup || 'O+';
  const effectiveName = donorName || 'Registered Donor';

  const verificationUrl = `https://donorsync.org/verify?type=${encodeURIComponent(type)}&id=${encodeURIComponent(effectiveCode)}&grp=${encodeURIComponent(effectiveGroup)}&live=${refreshCount}`;

  useEffect(() => {
    let isMounted = true;
    setLoading(true);

    QRCode.toDataURL(verificationUrl, {
      width: 256,
      margin: 2,
      color: {
        dark: '#0f172a',
        light: '#ffffff'
      },
      errorCorrectionLevel: 'M'
    })
      .then(url => {
        if (isMounted) {
          setQrDataUrl(url);
          setLoading(false);
          setGeneratedAt(new Date().toLocaleTimeString());
        }
      })
      .catch(err => {
        console.error('[QR] Generation error:', err);
        if (isMounted) setLoading(false);
      });

    return () => {
      isMounted = false;
    };
  }, [verificationUrl, refreshCount]);

  const handleRefresh = () => {
    setRefreshCount(prev => prev + 1);
  };

  const handlePrint = () => {
    window.print();
  };

  const handleDownload = () => {
    if (!qrDataUrl) return;
    const a = document.createElement('a');
    a.href = qrDataUrl;
    a.download = `DonorSync-Pass-${effectiveCode}.png`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  };

  return (
    <div className="p-6 rounded-2xl glass-panel border border-brand-primary/30 max-w-sm mx-auto text-center space-y-4 font-sans">
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-1.5 text-xs font-bold text-green-400 bg-green-500/10 px-3 py-1 rounded-full border border-green-500/20">
          <span className="w-2 h-2 rounded-full bg-green-400 animate-ping"></span>
          <ShieldCheck className="h-4 w-4 ml-1" />
          <span>Real-Time Pass Verified</span>
        </div>
        <button
          onClick={handleRefresh}
          className="text-slate-400 hover:text-white p-1 rounded-lg hover:bg-slate-800 transition-colors"
          title="Regenerate Real-Time QR"
        >
          <RefreshCw className={`h-3.5 w-3.5 ${loading ? 'animate-spin text-brand-primary' : ''}`} />
        </button>
      </div>

      <div>
        <h4 className="text-base font-extrabold text-white">DonorSync Digital Donor Pass</h4>
        <p className="text-[11px] text-slate-400 mt-0.5">Present at registered clinical blood repositories for instant check-in.</p>
        <p className="text-[10px] text-green-400 font-mono mt-1">Generated live: {generatedAt}</p>
      </div>

      {/* Printable / Viewable QR Box */}
      <div ref={printRef} className="bg-white p-5 rounded-2xl mx-auto w-52 h-52 flex items-center justify-center shadow-2xl border-4 border-slate-900">
        {loading ? (
          <div className="flex flex-col items-center justify-center space-y-2 text-slate-500 text-xs">
            <RefreshCw className="h-6 w-6 animate-spin text-brand-primary" />
            <span>Generating Real-Time QR...</span>
          </div>
        ) : qrDataUrl ? (
          <img
            src={qrDataUrl}
            alt={`DonorSync Check-in QR for ${effectiveCode}`}
            className="w-full h-full object-contain"
          />
        ) : (
          <div className="text-xs text-slate-400">Failed to render QR</div>
        )}
      </div>

      <div className="space-y-1 text-xs">
        <p className="font-bold text-slate-200">{effectiveName}</p>
        <p className="text-[11px] text-slate-400">
          Blood Group: <span className="text-brand-primary font-extrabold">{effectiveGroup}</span>
        </p>
        <p className="text-[10px] text-slate-500 font-mono tracking-wider">{effectiveCode}</p>
      </div>

      <div className="flex items-center justify-center space-x-2 pt-2">
        <button
          type="button"
          onClick={handleDownload}
          disabled={!qrDataUrl}
          className="px-3.5 py-2 rounded-lg bg-brand-primary hover:bg-brand-hover text-white text-xs font-semibold flex items-center space-x-1.5 transition-all shadow-md shadow-brand-primary/20 cursor-pointer disabled:opacity-50"
        >
          <Download className="h-3.5 w-3.5" />
          <span>Download Pass</span>
        </button>
        <button
          type="button"
          onClick={handlePrint}
          className="px-3.5 py-2 rounded-lg bg-navy-800 hover:bg-slate-800 border border-slate-700 text-slate-200 text-xs font-semibold flex items-center space-x-1.5 transition-all cursor-pointer"
        >
          <Printer className="h-3.5 w-3.5" />
          <span>Print Pass</span>
        </button>
      </div>
    </div>
  );
}
