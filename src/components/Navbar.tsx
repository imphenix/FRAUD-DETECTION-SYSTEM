import React from 'react';
import { PWAInstallButton } from './PWAInstallButton';
import { 
  ShieldAlert, 
  Cpu, 
  Lock, 
  LogOut, 
  User, 
  KeyRound 
} from 'lucide-react';
import { UserRole } from '../types/auth';

interface NavbarProps {
  role: UserRole;
  username: string;
  onLogout: () => void;
  onOpenSecretAdmin: () => void;
  onOpenUserLogin: () => void;
  threshold: number;
  flaggedCount: number;
}

export const Navbar: React.FC<NavbarProps> = ({
  role,
  username,
  onLogout,
  onOpenSecretAdmin,
  onOpenUserLogin,
  threshold,
  flaggedCount
}) => {
  return (
    <header className="sticky top-0 z-50 border-b border-slate-800/80 bg-[#090e1a]/95 backdrop-blur-md">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Brand zone */}
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-violet-600 via-indigo-600 to-cyan-400 p-0.5 flex items-center justify-center shadow-lg shadow-cyan-500/10">
              <div className="w-full h-full bg-[#080d19] rounded-[10px] flex items-center justify-center">
                <Cpu className="w-5 h-5 text-cyan-400" />
              </div>
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-lg font-bold tracking-tight text-white font-sans flex items-center gap-1.5">
                  NeuralBank <span className="text-xs text-cyan-400 font-normal">AI</span>
                </span>
                {role === 'admin' ? (
                  <span className="text-[10px] font-mono text-violet-300 bg-violet-950/80 border border-violet-700/80 px-2 py-0.5 rounded font-bold flex items-center gap-1">
                    <KeyRound className="w-3 h-3 text-cyan-400" />
                    SECRET ADMIN
                  </span>
                ) : role === 'user' ? (
                  <span className="text-[10px] font-mono text-cyan-300 bg-cyan-950/80 border border-cyan-800/60 px-2 py-0.5 rounded font-semibold">
                    CUSTOMER PORTAL
                  </span>
                ) : (
                  <span className="text-[10px] font-mono text-slate-400 bg-slate-900 border border-slate-800 px-2 py-0.5 rounded">
                    GATEWAY
                  </span>
                )}
              </div>
              <p className="text-[11px] text-slate-400 hidden sm:block">
                Autonomous Risk Scoring & Transaction Governance
              </p>
            </div>
          </div>

          {/* Navigation Controls / Right Zone */}
          <div className="flex items-center gap-3">
            <PWAInstallButton />

            {/* If Logged in (User or Admin): Prominent Log Out button in corner */}
            {role !== 'guest' ? (
              <div className="flex items-center gap-2 pl-2 border-l border-slate-800">
                {role === 'user' && (
                  <button
                    onClick={onOpenSecretAdmin}
                    className="px-2.5 py-1.5 rounded-lg bg-violet-950/60 hover:bg-violet-900/80 text-violet-300 border border-violet-800/60 text-xs font-semibold flex items-center gap-1.5 transition-colors"
                    title="Switch to Secret Admin Panel (Password required)"
                  >
                    <Lock className="w-3.5 h-3.5 text-violet-400" />
                    <span className="hidden sm:inline">Secret Admin</span>
                  </button>
                )}

                {role === 'admin' && (
                  <div className="hidden md:flex items-center gap-2 text-xs text-slate-400 mr-1">
                    <span>Threshold:</span>
                    <span className="font-mono text-violet-300 font-bold">{threshold.toFixed(2)}</span>
                    <span>·</span>
                    <span>Flagged:</span>
                    <span className="font-mono text-red-400 font-bold">{flaggedCount}</span>
                  </div>
                )}

                <button
                  onClick={onLogout}
                  className="px-3.5 py-1.5 rounded-lg bg-red-950/90 hover:bg-red-900 text-red-200 hover:text-white border border-red-600/70 text-xs font-bold shadow-md shadow-red-950/50 flex items-center gap-1.5 transition-all group"
                  title="Log out of current account and return to login"
                >
                  <LogOut className="w-3.5 h-3.5 text-red-400 group-hover:text-white transition-colors" />
                  <span>Log Out</span>
                </button>
              </div>
            ) : (
              /* If Guest (on Front page) */
              <div className="flex items-center gap-2">
                <button
                  onClick={onOpenSecretAdmin}
                  className="px-3 py-1.5 rounded-lg bg-violet-950/50 hover:bg-violet-900/60 text-violet-300 border border-violet-800/40 text-xs font-medium flex items-center gap-1.5 transition-colors"
                >
                  <Lock className="w-3.5 h-3.5" />
                  <span>Secret Admin Login</span>
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </header>
  );
};
