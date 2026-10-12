import React, { useState, useEffect } from 'react';
import { Shield, Cpu, Activity, Database, CheckCircle, Zap } from 'lucide-react';
import { cyberSound } from '../utils/cyberSound';

interface SocBootSequenceProps {
  onComplete: () => void;
  enableSound?: boolean;
}

interface BootStep {
  timeMs: number;
  label: string;
  code: string;
  icon: any;
}

const BOOT_STEPS: BootStep[] = [
  { timeMs: 0, label: 'DARK SCREEN / SYSTEM STANDBY', code: 'KERNEL_INITIALIZE', icon: Cpu },
  { timeMs: 200, label: 'CYBERSECURITY GRID ENGAGED', code: 'GRID_ONLINE', icon: Zap },
  { timeMs: 400, label: 'TELEMETRY NETWORK NODES SYNCED', code: 'NODES_SYNCHRONIZED', icon: Activity },
  { timeMs: 600, label: 'SECURITY COMMAND SIDEBAR POWERED', code: 'HUD_NAVIGATION_LOCK', icon: Shield },
  { timeMs: 800, label: 'DASHBOARD DEFENSE PROTOCOLS MOUNTED', code: 'HEADER_ONLINE', icon: Shield },
  { timeMs: 1000, label: 'FRAUD HEURISTICS & STATS CALCULATED', code: 'METRICS_PRIMED', icon: Database },
  { timeMs: 1200, label: 'TRANSACTION RADAR STREAM ACTIVE', code: 'RADAR_ACTIVE', icon: Activity },
  { timeMs: 1400, label: 'THREAT & ANOMALY DETECTOR ARMED', code: 'RISK_MATRIX_ARMED', icon: Shield },
  { timeMs: 1600, label: 'REAL-TIME TELEMETRY SENSORS ONLINE', code: 'SENSORS_SYNCHRONIZED', icon: Zap },
  { timeMs: 2000, label: 'SOC DEFENSE SYSTEM FULLY OPERATIONAL', code: 'SOC_OPERATIONAL', icon: CheckCircle }
];

export const SocBootSequence: React.FC<SocBootSequenceProps> = ({ onComplete, enableSound = true }) => {
  const [elapsedMs, setElapsedMs] = useState<number>(0);
  const [activeStepIndex, setActiveStepIndex] = useState<number>(0);

  useEffect(() => {
    const startTime = Date.now();
    const totalDuration = 2200;

    const interval = setInterval(() => {
      const now = Date.now();
      const diff = now - startTime;
      setElapsedMs(Math.min(diff, totalDuration));

      // Calculate step
      const stepIdx = BOOT_STEPS.reduce((acc, step, idx) => {
        return diff >= step.timeMs ? idx : acc;
      }, 0);

      setActiveStepIndex(stepIdx);

      if (diff >= totalDuration) {
        clearInterval(interval);
        setTimeout(() => {
          onComplete();
        }, 150);
      }
    }, 50);

    return () => clearInterval(interval);
  }, [onComplete]);

  const progressPercent = Math.min(100, Math.floor((elapsedMs / 2000) * 100));

  return (
    <div className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-[#050B14] text-slate-100 select-none overflow-hidden">
      {/* Background Cyber Grid */}
      <div 
        className="absolute inset-0 bg-cyber-grid opacity-30 transition-opacity duration-700" 
        style={{ opacity: elapsedMs >= 200 ? 0.35 : 0 }} 
      />

      {/* Radial ambient glow */}
      <div className="absolute w-[600px] h-[600px] rounded-full bg-blue-600/10 blur-[130px] pointer-events-none" />

      {/* Concentric Scanner Rings in Background */}
      <div className="absolute inset-0 flex items-center justify-center pointer-events-none opacity-20">
        <div className="w-96 h-96 rounded-full border border-cyan-400/30 animate-scanner-cw" />
        <div className="absolute w-72 h-72 rounded-full border border-dashed border-blue-500/40 animate-scanner-ccw" />
        <div className="absolute w-48 h-48 rounded-full border border-cyan-300/40 animate-pulse" />
      </div>

      {/* Central Initialization Console */}
      <div className="relative z-10 w-full max-w-xl mx-4 p-8 rounded-2xl bg-[#0D1828]/95 border border-cyan-500/50 shadow-[0_0_50px_rgba(0,217,255,0.25)] backdrop-blur-2xl">
        {/* Header telemetry badge */}
        <div className="flex items-center justify-between border-b border-cyan-900/60 pb-4 mb-6">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-cyan-500/10 border border-cyan-400/40 text-cyan-400 animate-pulse">
              <Shield className="w-6 h-6" />
            </div>
            <div>
              <h2 className="text-lg font-bold tracking-wider text-white font-mono flex items-center gap-2">
                FRAUDGUARD SOC <span className="text-xs px-2 py-0.5 rounded bg-cyan-500/20 text-cyan-300 border border-cyan-500/30">v4.2.0</span>
              </h2>
              <p className="text-xs text-slate-400 font-mono tracking-widest uppercase">
                Enterprise Threat Intelligence Initialization
              </p>
            </div>
          </div>
          <div className="text-right font-mono text-xs text-cyan-400">
            <div>BOOT CLOCK</div>
            <div className="text-base font-bold text-white">{(elapsedMs / 1000).toFixed(2)}s / 2.00s</div>
          </div>
        </div>

        {/* Progress Bar */}
        <div className="mb-6">
          <div className="flex justify-between items-center text-xs font-mono text-slate-400 mb-2">
            <span>DEFENSE SUBSYSTEMS LOADING</span>
            <span className="text-cyan-400 font-bold">{progressPercent}%</span>
          </div>
          <div className="h-2 w-full bg-[#07111F] rounded-full overflow-hidden border border-cyan-950 p-[1px]">
            <div 
              className="h-full rounded-full bg-gradient-to-r from-blue-600 via-cyan-400 to-cyan-300 transition-all duration-75 shadow-[0_0_15px_rgba(0,217,255,0.7)]"
              style={{ width: `${progressPercent}%` }}
            />
          </div>
        </div>

        {/* Dynamic Boot Steps Checklist */}
        <div className="space-y-2 mb-6 max-h-48 overflow-hidden font-mono text-xs">
          {BOOT_STEPS.slice(0, activeStepIndex + 1).map((step, idx) => {
            const isLatest = idx === activeStepIndex;
            return (
              <div 
                key={step.code}
                className={`flex items-center justify-between p-2 rounded-lg border transition-all duration-300 ${
                  isLatest 
                    ? 'bg-cyan-950/40 border-cyan-400/60 text-cyan-300 shadow-[0_0_12px_rgba(0,217,255,0.2)]' 
                    : 'bg-[#07111F]/60 border-cyan-900/30 text-slate-400'
                }`}
              >
                <div className="flex items-center gap-2">
                  <span className={isLatest ? 'text-cyan-400 animate-spin' : 'text-emerald-400'}>
                    {isLatest ? '▶' : '✔'}
                  </span>
                  <span className="tracking-wide">{step.label}</span>
                </div>
                <span className="text-[10px] text-slate-500 uppercase">{step.code}</span>
              </div>
            );
          })}
        </div>

        {/* Footer Actions */}
        <div className="flex items-center justify-between pt-4 border-t border-cyan-900/50">
          <div className="text-[11px] font-mono text-slate-500 flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping" />
            ESTABLISHING ENCRYPTED SECURE CHANNEL
          </div>
          <button
            onClick={() => {
              cyberSound.playClick();
              onComplete();
            }}
            className="px-3 py-1.5 rounded-lg text-xs font-mono font-medium text-slate-400 hover:text-cyan-300 hover:bg-cyan-950/40 border border-slate-700/50 hover:border-cyan-500/50 transition-colors"
          >
            SKIP SEQUENCE ⏭
          </button>
        </div>
      </div>
    </div>
  );
};
