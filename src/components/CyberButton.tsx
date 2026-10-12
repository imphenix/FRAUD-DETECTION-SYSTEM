import React, { useState } from 'react';
import { cyberSound } from '../utils/cyberSound';

interface CyberButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'danger' | 'warning' | 'outline' | 'ghost';
  size?: 'sm' | 'md' | 'lg';
  glowColor?: string;
  enableSound?: boolean;
}

interface Ripple {
  x: number;
  y: number;
  id: number;
}

export const CyberButton: React.FC<CyberButtonProps> = ({
  children,
  className = '',
  variant = 'primary',
  size = 'md',
  onClick,
  enableSound = true,
  disabled,
  ...props
}) => {
  const [ripples, setRipples] = useState<Ripple[]>([]);

  const handleClick = (e: React.MouseEvent<HTMLButtonElement>) => {
    if (disabled) return;

    // Energy ripple calculation
    const rect = e.currentTarget.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    const newRipple = { x, y, id: Date.now() };

    setRipples((prev) => [...prev.slice(-3), newRipple]);
    setTimeout(() => {
      setRipples((prev) => prev.filter((r) => r.id !== newRipple.id));
    }, 600);

    if (enableSound) {
      if (variant === 'danger') {
        cyberSound.playEmergencyKlaxon();
      } else {
        cyberSound.playEnergyRipple();
      }
    }

    if (onClick) {
      onClick(e);
    }
  };

  const sizeClasses = {
    sm: 'px-3 py-1.5 text-xs font-mono',
    md: 'px-4 py-2.5 text-sm font-medium',
    lg: 'px-6 py-3.5 text-base font-semibold'
  }[size];

  const variantClasses = {
    primary:
      'bg-gradient-to-r from-blue-600 via-blue-500 to-cyan-500 text-white border border-cyan-400/50 shadow-[0_0_20px_rgba(22,119,255,0.45)] hover:shadow-[0_0_30px_rgba(0,217,255,0.6)] hover:border-cyan-300',
    secondary:
      'bg-[#0D1828] text-cyan-300 border border-cyan-900/60 hover:bg-[#101D30] hover:border-cyan-500/60 hover:text-white shadow-[0_0_15px_rgba(0,217,255,0.1)]',
    danger:
      'bg-gradient-to-r from-red-600 to-rose-600 text-white border border-red-500/60 shadow-[0_0_22px_rgba(239,68,68,0.4)] hover:shadow-[0_0_32px_rgba(239,68,68,0.7)] hover:border-red-400',
    warning:
      'bg-gradient-to-r from-amber-600 to-yellow-600 text-white border border-amber-500/60 shadow-[0_0_20px_rgba(245,158,11,0.35)] hover:shadow-[0_0_30px_rgba(245,158,11,0.6)]',
    outline:
      'bg-transparent text-cyan-400 border border-cyan-500/40 hover:bg-cyan-500/10 hover:border-cyan-400 shadow-[0_0_12px_rgba(0,217,255,0.12)]',
    ghost:
      'bg-transparent text-slate-300 hover:text-cyan-300 hover:bg-cyan-950/30'
  }[variant];

  return (
    <button
      {...props}
      disabled={disabled}
      onClick={handleClick}
      className={`relative overflow-hidden rounded-xl transition-all duration-200 active:scale-[0.96] cursor-pointer inline-flex items-center justify-center gap-2 select-none ${sizeClasses} ${variantClasses} ${
        disabled ? 'opacity-50 cursor-not-allowed hover:shadow-none' : ''
      } ${className}`}
    >
      {/* Light sweep gleam */}
      <span className="absolute inset-0 -translate-x-full hover:translate-x-full transition-transform duration-1000 bg-gradient-to-r from-transparent via-white/10 to-transparent pointer-events-none" />

      {/* Dynamic energy ripples */}
      {ripples.map((r) => (
        <span
          key={r.id}
          className="absolute rounded-full pointer-events-none bg-cyan-400/40 animate-ripple"
          style={{
            left: r.x - 20,
            top: r.y - 20,
            width: 40,
            height: 40
          }}
        />
      ))}

      {children}
    </button>
  );
};
