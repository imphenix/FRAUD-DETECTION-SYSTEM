import React, { useEffect, useState, useRef } from 'react';
import { ShieldAlert, AlertOctagon, XCircle, FileText, CheckCircle2, Volume2, VolumeX } from 'lucide-react';
import { cyberSound } from '../utils/cyberSound';
import { formatINR } from '../App';

export interface FraudAlertState {
  active: boolean;
  riskLevel: string;
  riskScore: number;
  amount: number;
  status: string;
  reasons: string[];
  referenceId?: string;
  timestamp?: string;
}

interface FraudEmergencyOverlayProps {
  alert: FraudAlertState;
  onDismiss: () => void;
  onViewAuditLog: () => void;
  soundEnabled: boolean;
}

export const FraudEmergencyOverlay: React.FC<FraudEmergencyOverlayProps> = ({
  alert,
  onDismiss,
  onViewAuditLog,
  soundEnabled
}) => {
  const [countdown, setCountdown] = useState<number>(10);
  const [isMuted, setIsMuted] = useState<boolean>(!soundEnabled);
  const timerRef = useRef<any>(null);

  // Play sound strictly when real backend analysis returns HIGH or CRITICAL risk, or BLOCKED status
  const isHighOrCriticalOrBlocked =
    alert.riskLevel === 'HIGH' ||
    alert.riskLevel === 'CRITICAL' ||
    alert.status === 'BLOCKED' ||
    (alert.riskScore !== undefined && alert.riskScore >= 70);

  // Start cybersecurity SOC fraud threat alert and 10-second countdown (audio capped at max 3s)
  useEffect(() => {
    let soundCutoffTimer: any = null;

    if (alert.active) {
      setCountdown(10);
      if (!isMuted && soundEnabled && isHighOrCriticalOrBlocked) {
        cyberSound.startEmergencyAlarm(alert.riskLevel || 'CRITICAL');
        // Guaranteed automatic cutoff of all audio after maximum 3 seconds
        soundCutoffTimer = setTimeout(() => {
          cyberSound.stopEmergencyAlarm();
        }, 3000);
      } else {
        cyberSound.stopEmergencyAlarm();
      }

      timerRef.current = setInterval(() => {
        setCountdown((prev) => {
          if (prev <= 1) {
            clearInterval(timerRef.current);
            cyberSound.stopEmergencyAlarm();
            onDismiss();
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    }

    return () => {
      if (soundCutoffTimer) clearTimeout(soundCutoffTimer);
      if (timerRef.current) clearInterval(timerRef.current);
      cyberSound.stopEmergencyAlarm();
    };
  }, [alert.active, isMuted, soundEnabled, isHighOrCriticalOrBlocked]);

  const handleDismiss = () => {
    cyberSound.stopEmergencyAlarm();
    cyberSound.playClick();
    onDismiss();
  };

  const handleAuditClick = () => {
    cyberSound.stopEmergencyAlarm();
    cyberSound.playClick();
    onViewAuditLog();
  };

  const toggleSound = () => {
    setIsMuted((prev) => !prev);
  };

  if (!alert.active) return null;

  const isCritical = alert.riskLevel === 'CRITICAL' || alert.riskScore >= 75 || alert.status === 'BLOCKED';

  return (
    <div
      role="alertdialog"
      aria-modal="true"
      className="fixed inset-0 z-[9999] flex items-center justify-center p-3 sm:p-6 overflow-y-auto"
      style={{ backgroundColor: 'rgba(8, 1, 3, 0.92)' }}
    >
      {/* Red Strobe & Pulsing Emergency Glow Background */}
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_70%_70%_at_50%_50%,rgba(239,68,68,0.35),transparent)] animate-pulse pointer-events-none" />

      {/* Warning Hazard Stripes Layer */}
      <div
        className="absolute inset-0 pointer-events-none opacity-15"
        style={{
          backgroundImage:
            'repeating-linear-gradient(45deg, #EF4444 0px, #EF4444 15px, transparent 15px, transparent 30px)'
        }}
      />

      {/* Scanning Red Laser Line */}
      <div className="absolute inset-x-0 h-1 bg-gradient-to-r from-transparent via-red-500 to-transparent top-0 animate-scanner-beam pointer-events-none shadow-[0_0_15px_#EF4444]" />

      {/* Central Emergency Modal Card */}
      <div className="relative w-full max-w-xl bg-[#120407]/95 border-2 border-red-500 rounded-3xl p-5 sm:p-7 shadow-[0_0_70px_rgba(239,68,68,0.7)] backdrop-blur-xl text-white font-sans overflow-hidden my-auto">
        {/* Top Hazard Border Strip */}
        <div className="absolute top-0 left-0 right-0 h-2 bg-gradient-to-r from-red-600 via-rose-500 to-red-600 animate-pulse" />

        {/* Audio Mute & Close shortcuts */}
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <span className="flex h-3 w-3 relative">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75" />
              <span className="relative inline-flex rounded-full h-3 w-3 bg-red-500" />
            </span>
            <span className="text-[11px] font-mono tracking-widest text-red-400 uppercase font-bold">
              SOC EMERGENCY LOCKDOWN // ANOMALY INTERCEPT
            </span>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={toggleSound}
              title={isMuted ? 'Unmute Alarm' : 'Silence Siren'}
              className="p-1.5 rounded-lg bg-red-950/80 border border-red-800/80 text-red-300 hover:text-white hover:bg-red-900 transition cursor-pointer"
            >
              {isMuted ? <VolumeX className="w-4 h-4" /> : <Volume2 className="w-4 h-4 animate-bounce" />}
            </button>
            <button
              onClick={handleDismiss}
              className="p-1.5 rounded-lg bg-red-950/80 border border-red-800/80 text-red-400 hover:text-white hover:bg-red-900 transition cursor-pointer"
              title="Acknowledge and Close"
            >
              <XCircle className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Main Header / Flashing Siren Title */}
        <div className="text-center mb-5">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-red-600/20 border-2 border-red-500 text-red-500 shadow-[0_0_30px_rgba(239,68,68,0.6)] mb-3 animate-emergency-icon">
            <ShieldAlert className="w-9 h-9" />
          </div>

          <h2 className="text-2xl sm:text-3xl font-black tracking-tight text-white font-mono uppercase text-shadow-red">
            CRITICAL THREAT / FRAUD DETECTED
          </h2>
          <p className="text-xs text-red-300/90 font-medium mt-1">
            Real-time FraudDetectionEngine intercepted an anomalous transaction. Security quarantine engaged.
          </p>
        </div>

        {/* Core Parameters Matrix */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 mb-4 font-mono text-center">
          <div className="bg-red-950/50 p-2.5 rounded-xl border border-red-700/60">
            <span className="text-[10px] text-red-300/80 uppercase block">Risk Level</span>
            <span className="text-base font-black text-red-400">{alert.riskLevel}</span>
          </div>

          <div className="bg-red-950/50 p-2.5 rounded-xl border border-red-700/60">
            <span className="text-[10px] text-red-300/80 uppercase block">Risk Score</span>
            <span className="text-base font-black text-rose-300">{alert.riskScore} / 100</span>
          </div>

          <div className="bg-red-950/50 p-2.5 rounded-xl border border-red-700/60">
            <span className="text-[10px] text-red-300/80 uppercase block">Action Status</span>
            <span className="text-base font-black text-red-400 uppercase">{alert.status}</span>
          </div>

          <div className="bg-red-950/50 p-2.5 rounded-xl border border-red-700/60">
            <span className="text-[10px] text-red-300/80 uppercase block">Auto-Dismiss</span>
            <span className="text-base font-black text-white">{countdown}s</span>
          </div>
        </div>

        {/* Transaction Amount Highlight */}
        <div className="bg-red-950/40 border border-red-700/70 rounded-2xl p-3.5 mb-4 flex items-center justify-between">
          <div>
            <span className="text-[10px] font-mono text-red-300/80 uppercase block">Intercepted Amount</span>
            <span className="text-xl sm:text-2xl font-black text-white font-mono tracking-tight">
              {formatINR(alert.amount)}
            </span>
          </div>
          {alert.referenceId && (
            <div className="text-right font-mono text-xs text-red-300">
              <span className="text-[10px] text-red-400/80 uppercase block">Reference</span>
              <span className="font-semibold">{alert.referenceId}</span>
            </div>
          )}
        </div>

        {/* Fraud Reasons Triggered */}
        <div className="bg-red-950/60 border border-red-800/80 rounded-2xl p-3.5 mb-5 font-mono">
          <div className="flex items-center gap-2 mb-2 text-red-400 text-xs font-bold uppercase tracking-wider">
            <AlertOctagon className="w-4 h-4 shrink-0" />
            <span>Fraud Engine Rule Violations:</span>
          </div>
          <ul className="space-y-1.5 text-xs text-red-200">
            {alert.reasons && alert.reasons.length > 0 ? (
              alert.reasons.map((reason, idx) => (
                <li key={idx} className="flex items-start gap-2 bg-red-900/30 p-2 rounded-lg border border-red-800/40">
                  <span className="text-red-400 font-bold shrink-0">&bull;</span>
                  <span className="leading-relaxed">{reason}</span>
                </li>
              ))
            ) : (
              <li className="flex items-start gap-2 bg-red-900/30 p-2 rounded-lg border border-red-800/40">
                <span className="text-red-400 font-bold shrink-0">&bull;</span>
                <span>Transaction amount exceeds security policy limits & baseline velocity.</span>
              </li>
            )}
          </ul>
        </div>

        {/* 10-Second Countdown Visual Progress Bar */}
        <div className="mb-5 space-y-1.5">
          <div className="flex items-center justify-between text-[11px] font-mono text-red-300/80">
            <span>ALARM COUNTDOWN: {countdown} SECONDS</span>
            <span>{Math.round((countdown / 10) * 100)}%</span>
          </div>
          <div className="w-full bg-red-950/90 rounded-full h-2 overflow-hidden border border-red-800/70">
            <div
              className="h-full bg-gradient-to-r from-red-500 via-rose-400 to-red-500 transition-all duration-1000 ease-linear shadow-[0_0_10px_#EF4444]"
              style={{ width: `${(countdown / 10) * 100}%` }}
            />
          </div>
        </div>

        {/* Action Buttons */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 font-mono">
          <button
            onClick={handleDismiss}
            className="w-full py-3 px-4 rounded-xl font-bold text-xs uppercase tracking-wider bg-red-600 hover:bg-red-500 text-white shadow-[0_0_20px_rgba(239,68,68,0.5)] active:scale-95 transition cursor-pointer flex items-center justify-center gap-2 border border-red-400/80"
          >
            <CheckCircle2 className="w-4 h-4" />
            DISMISS ALARM ({countdown}s)
          </button>

          <button
            onClick={handleAuditClick}
            className="w-full py-3 px-4 rounded-xl font-bold text-xs uppercase tracking-wider bg-[#07111F] hover:bg-[#101D30] text-[#00D9FF] border border-[#00D9FF]/40 hover:border-[#00D9FF] active:scale-95 transition cursor-pointer flex items-center justify-center gap-2 shadow-sm"
          >
            <FileText className="w-4 h-4" />
            VIEW IN AUDIT LOG
          </button>
        </div>
      </div>
    </div>
  );
};
