import React, { useState } from 'react';
import { 
  Lock, 
  User, 
  ArrowRight, 
  KeyRound, 
  ShieldCheck
} from 'lucide-react';
import { AuthSession } from '../types/auth';

interface FrontPageProps {
  onLogin: (session: AuthSession) => void;
}

export const FrontPage: React.FC<FrontPageProps> = ({ onLogin }) => {
  const [activeLoginType, setActiveLoginType] = useState<'user' | 'admin'>('user');
  const [imageLoaded, setImageLoaded] = useState<boolean>(true);
  const [isAuthenticating, setIsAuthenticating] = useState<boolean>(false);

  const handleSwitchType = (type: 'user' | 'admin') => {
    setActiveLoginType(type);
  };

  const handleFormSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setIsAuthenticating(true);

    setTimeout(() => {
      setIsAuthenticating(false);
      if (activeLoginType === 'admin') {
        onLogin({
          role: 'admin',
          username: 'Admin',
          name: 'System Administrator',
          loginTime: new Date().toISOString()
        });
      } else {
        onLogin({
          role: 'user',
          username: 'Customer',
          name: 'Customer Portal',
          loginTime: new Date().toISOString()
        });
      }
    }, 200);
  };

  return (
    <div className="relative min-h-[calc(100vh-8rem)] flex flex-col justify-between rounded-3xl overflow-hidden border border-cyan-500/40 shadow-2xl shadow-cyan-950/70 bg-[#070b14]">
      {/* ========================================================================= */}
      {/* 1. HIGH-FIDELITY CYBERSECURITY HERO BACKGROUND VISUAL                      */}
      {/* ========================================================================= */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden">
        {imageLoaded ? (
          <img
            src="/cybersecurity_hero.jpg"
            alt="Cybersecurity Defense Shield"
            referrerPolicy="no-referrer"
            onError={() => setImageLoaded(false)}
            className="w-full h-full object-cover object-center filter brightness-[0.92] contrast-[1.15]"
          />
        ) : (
          <div className="w-full h-full bg-gradient-to-br from-[#020617] via-[#070b14] to-[#0a1226]" />
        )}

        {/* Subtle cinematic gradient scrim so text stays readable while keeping the glowing shield vivid */}
        <div className="absolute inset-0 bg-gradient-to-r from-[#050914]/90 via-transparent to-[#050914]/85" />
        <div className="absolute inset-0 bg-gradient-to-t from-[#050914] via-transparent to-[#050914]/40" />

        {/* Electric-blue cyber glow ambient effects */}
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[520px] h-[520px] bg-cyan-500/10 rounded-full blur-3xl pointer-events-none" />
      </div>

      {/* ========================================================================= */}
      {/* 2. TOP HUD BAR: CHEVRONS & TELEMETRY STREAM                               */}
      {/* ========================================================================= */}
      <div className="relative z-10 p-4 sm:p-6 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="flex items-center text-cyan-300 font-mono tracking-tighter text-base sm:text-lg animate-pulse">
            <span>&gt;&gt;&gt;&gt;</span>
          </div>
          <span className="text-xs font-mono text-cyan-300/90 font-semibold tracking-wider uppercase ml-1">
            CYBER-SHIELD SURVEILLANCE ACTIVE
          </span>
        </div>

        <div className="hidden sm:flex items-center gap-3 text-xs font-mono">
          <div className="px-3 py-1 rounded-full bg-[#081022]/80 border border-cyan-500/40 text-cyan-300 backdrop-blur-md flex items-center gap-1.5 shadow-md shadow-cyan-950/50">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-ping" />
            <span>AI FRAUD DEFENSE: ONLINE</span>
          </div>
          <div className="px-3 py-1 rounded-full bg-[#081022]/80 border border-slate-700/80 text-slate-300 backdrop-blur-md">
            <span>LATENCY: &lt;14ms</span>
          </div>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* 3. MAIN INTERACTIVE CONTENT: LEFT BRANDING & RIGHT PORTAL ACCESS CONSOLE  */}
      {/* ========================================================================= */}
      <div className="relative z-10 px-4 sm:px-8 lg:px-12 py-4 grid grid-cols-1 lg:grid-cols-12 gap-8 items-center flex-1">
        {/* LEFT 6 COLUMNS: "Protecting Our Digital World" & Platform Identity */}
        <div className="lg:col-span-6 space-y-6">
          <div className="inline-block">
            <div className="px-5 py-2.5 rounded-2xl bg-gradient-to-r from-blue-950/90 to-indigo-950/90 border-2 border-cyan-400 text-white font-sans text-sm sm:text-base font-semibold shadow-lg shadow-cyan-500/20 backdrop-blur-md flex items-center gap-3">
              <span className="w-2.5 h-2.5 rounded-full bg-cyan-300 animate-pulse" />
              <span>Protecting Our Digital World</span>
            </div>
          </div>

          <div className="space-y-3">
            <h1 className="text-3xl sm:text-5xl font-extrabold tracking-tight text-white font-sans leading-tight drop-shadow-md">
              AI-Powered <br />
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-cyan-300 via-sky-200 to-violet-300">
                Fraud Detection System
              </span>
            </h1>
            <p className="text-sm sm:text-base text-slate-300 leading-relaxed font-sans max-w-lg drop-shadow">
              Autonomous neural perception and real-time transaction screening. Safeguarding financial assets with Java 21 core architecture and adaptive machine learning.
            </p>
          </div>

          {/* Quick HUD Metrics matching the futuristic design */}
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5 max-w-md pt-1 font-mono text-xs">
            <div className="p-2.5 rounded-xl bg-[#060c1c]/80 border border-cyan-500/30 backdrop-blur-md">
              <span className="text-[10px] text-slate-400 block font-sans">Shield Precision</span>
              <span className="text-sm font-bold text-cyan-300">98.9%</span>
            </div>
            <div className="p-2.5 rounded-xl bg-[#060c1c]/80 border border-cyan-500/30 backdrop-blur-md">
              <span className="text-[10px] text-slate-400 block font-sans">Perceptron Weights</span>
              <span className="text-sm font-bold text-emerald-400">σ(W·X + b)</span>
            </div>
            <div className="p-2.5 rounded-xl bg-[#060c1c]/80 border border-cyan-500/30 backdrop-blur-md col-span-2 sm:col-span-1">
              <span className="text-[10px] text-slate-400 block font-sans">Encryption</span>
              <span className="text-sm font-bold text-violet-300">AES-256</span>
            </div>
          </div>
        </div>

        {/* RIGHT 6 COLUMNS: SLEEK GLASSMORPHIC PORTAL GATEWAY (NO USERNAME/PASSWORD) */}
        <div className="lg:col-span-6 flex justify-center lg:justify-end">
          <div className="w-full max-w-md rounded-2xl border border-cyan-500/40 bg-[#090f20]/90 shadow-2xl shadow-cyan-950/80 backdrop-blur-xl p-6 sm:p-7 space-y-5 relative overflow-hidden">
            {/* Top scanning accent line */}
            <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-cyan-400 via-sky-400 to-violet-500 animate-pulse" />

            {/* Console Header */}
            <div>
              <div className="flex items-center justify-between mb-3">
                <span className="text-[11px] font-mono font-bold tracking-wider text-cyan-300 flex items-center gap-1.5 uppercase">
                  <ShieldCheck className="w-3.5 h-3.5 text-cyan-400" />
                  PORTAL ACCESS GATEWAY
                </span>
                <span className="text-[10px] font-mono text-emerald-400 bg-emerald-950/80 border border-emerald-800/80 px-2 py-0.5 rounded-full font-semibold">
                  256-BIT ENCRYPTED
                </span>
              </div>

              {/* Dual Role Selector Tabs */}
              <div className="grid grid-cols-2 gap-1.5 p-1 bg-[#050a16] rounded-xl border border-slate-800">
                <button
                  type="button"
                  onClick={() => handleSwitchType('user')}
                  className={`py-2 px-3 text-xs font-semibold rounded-lg transition-all flex items-center justify-center gap-1.5 ${
                    activeLoginType === 'user'
                      ? 'bg-gradient-to-r from-cyan-600 to-blue-600 text-white shadow-md shadow-cyan-900/40 border border-cyan-400/30'
                      : 'text-slate-400 hover:text-slate-200'
                  }`}
                >
                  <User className="w-3.5 h-3.5" />
                  <span>Customer Dashboard</span>
                </button>

                <button
                  type="button"
                  onClick={() => handleSwitchType('admin')}
                  className={`py-2 px-3 text-xs font-semibold rounded-lg transition-all flex items-center justify-center gap-1.5 ${
                    activeLoginType === 'admin'
                      ? 'bg-gradient-to-r from-violet-600 to-purple-600 text-white shadow-md shadow-violet-900/40 border border-violet-400/30'
                      : 'text-slate-400 hover:text-slate-200'
                  }`}
                >
                  <KeyRound className="w-3.5 h-3.5" />
                  <span>Secret Admin Panel</span>
                </button>
              </div>
            </div>

            {/* Selected Mode Description Card */}
            <div className="p-4 rounded-xl bg-[#050a16]/90 border border-slate-800 space-y-2 text-xs">
              <div className="flex items-center gap-2 font-semibold text-slate-200">
                {activeLoginType === 'admin' ? (
                  <>
                    <Lock className="w-4 h-4 text-violet-400" />
                    <span>Secret Admin Risk Control Center</span>
                  </>
                ) : (
                  <>
                    <User className="w-4 h-4 text-cyan-400" />
                    <span>Customer Banking & Transfer Portal</span>
                  </>
                )}
              </div>
              <p className="text-slate-400 leading-relaxed text-[11px]">
                {activeLoginType === 'admin'
                  ? 'Access real-time fraud threshold calibration, perceptron feature weight tuning, forensic case investigation, and Java 21 runtime console.'
                  : 'Submit instant bank transfers, monitor real-time AI fraud screening scores, and review your transaction history.'}
              </p>
            </div>

            {/* Direct Launch Form (No Username or Password Required) */}
            <form onSubmit={handleFormSubmit} className="space-y-4">
              <button
                type="submit"
                disabled={isAuthenticating}
                className={`w-full py-3 px-4 rounded-xl text-white font-semibold text-xs shadow-xl flex items-center justify-center gap-2 transition-all disabled:opacity-50 ${
                  activeLoginType === 'admin'
                    ? 'bg-gradient-to-r from-violet-600 via-indigo-600 to-purple-600 hover:from-violet-500 hover:to-purple-500 shadow-violet-900/50'
                    : 'bg-gradient-to-r from-cyan-500 via-sky-600 to-blue-600 hover:from-cyan-400 hover:to-blue-500 shadow-cyan-900/40'
                }`}
              >
                {isAuthenticating ? (
                  <span>Opening Portal...</span>
                ) : (
                  <>
                    <span>
                      {activeLoginType === 'admin'
                        ? 'Enter Secret Admin Panel'
                        : 'Enter Customer Dashboard'}
                    </span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </>
                )}
              </button>
            </form>

            <div className="pt-1 text-center">
              <span className="text-[10px] text-slate-400 font-mono">
                Protected by NeuralBank CyberGuard · Level 4 Threat Intelligence
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* 4. BOTTOM TELEMETRY DOCK                                                  */}
      {/* ========================================================================= */}
      <div className="relative z-10 p-3 sm:p-4 border-t border-cyan-500/20 bg-[#060a16]/70 backdrop-blur-md flex flex-col sm:flex-row items-center justify-between text-[11px] text-slate-400 gap-2">
        <div className="flex items-center gap-3">
          <span className="text-slate-300 font-semibold">NeuralBank PerceptronNet</span>
          <span>·</span>
          <span>5-Feature Risk Vector</span>
          <span>·</span>
          <span className="font-mono text-cyan-400">Sigmoid Engine σ(z)</span>
        </div>
        <div className="flex items-center gap-3 font-mono text-[10px] text-slate-400">
          <span>HOST: ais-dev</span>
          <span>·</span>
          <span>IP: SECURE</span>
          <span>·</span>
          <span>PWA CACHE: ACTIVE</span>
        </div>
      </div>
    </div>
  );
};
