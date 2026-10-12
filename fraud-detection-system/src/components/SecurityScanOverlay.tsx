import React, { useEffect, useState } from 'react';
import { ShieldCheck, Lock, Terminal, Cpu } from 'lucide-react';

interface SecurityScanOverlayProps {
  onComplete: () => void;
  username: string;
}

export const SecurityScanOverlay: React.FC<SecurityScanOverlayProps> = ({ onComplete, username }) => {
  const [stepIndex, setStepIndex] = useState(0);

  const steps = [
    { label: 'AUTHENTICATING SECURE CHANNEL...', icon: Lock },
    { label: 'VERIFYING CREDENTIALS & SHA-256 HASH...', icon: Terminal },
    { label: 'SECURITY INTEGRITY CHECK: PASS', icon: Cpu },
    { label: 'SESSION AUTHORIZED // ACCESS GRANTED', icon: ShieldCheck }
  ];

  useEffect(() => {
    const timer1 = setTimeout(() => setStepIndex(1), 240);
    const timer2 = setTimeout(() => setStepIndex(2), 520);
    const timer3 = setTimeout(() => setStepIndex(3), 800);
    const timer4 = setTimeout(() => {
      onComplete();
    }, 1100);

    return () => {
      clearTimeout(timer1);
      clearTimeout(timer2);
      clearTimeout(timer3);
      clearTimeout(timer4);
    };
  }, [onComplete]);

  const CurrentIcon = steps[stepIndex].icon;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[#050B14]/90 backdrop-blur-xl font-mono text-[#F8FAFC]">
      <div className="max-w-sm w-full bg-[#0D1828]/95 border border-[#00D9FF]/50 rounded-2xl p-6 shadow-[0_0_50px_rgba(0,217,255,0.25)] text-center relative overflow-hidden">
        {/* Animated Scanning Beam */}
        <div className="absolute inset-0 pointer-events-none overflow-hidden">
          <div className="w-full h-1 bg-gradient-to-r from-transparent via-[#00D9FF] to-transparent animate-scanline" />
        </div>

        <div className="w-14 h-14 rounded-2xl bg-[#1677FF]/20 border border-[#00D9FF]/50 text-[#00D9FF] flex items-center justify-center mx-auto mb-4 shadow-[0_0_20px_rgba(0,217,255,0.3)] animate-pulse">
          <CurrentIcon className="w-7 h-7" />
        </div>

        <div className="text-[10px] text-[#94A3B8] uppercase tracking-widest mb-1">
          SOC Terminal Authorization
        </div>

        <h3 className="text-sm font-bold text-[#F8FAFC] tracking-tight mb-4 min-h-[22px]">
          {steps[stepIndex].label}
        </h3>

        {/* Progress Bar */}
        <div className="w-full bg-[#07111F] rounded-full h-2 overflow-hidden border border-blue-900/60 mb-3">
          <div 
            className="h-full bg-gradient-to-r from-[#1677FF] via-[#2495FF] to-[#00D9FF] transition-all duration-300 shadow-[0_0_10px_#00D9FF]"
            style={{ width: `${((stepIndex + 1) / steps.length) * 100}%` }}
          />
        </div>

        <div className="flex justify-between items-center text-[10px] text-[#64748B]">
          <span>TARGET: ENCRYPTED-SESSION [SHA-256]</span>
          <span className="text-[#00D9FF] font-bold">{Math.round(((stepIndex + 1) / steps.length) * 100)}%</span>
        </div>
      </div>
    </div>
  );
};
