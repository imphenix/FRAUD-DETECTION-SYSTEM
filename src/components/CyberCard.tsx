import React, { useState } from 'react';
import { cyberSound } from '../utils/cyberSound';

interface CyberCardProps extends React.HTMLAttributes<HTMLDivElement> {
  children: React.ReactNode;
  className?: string;
  glow?: boolean;
  interactive?: boolean;
  cornerAccents?: boolean;
  dangerGlow?: boolean;
}

export const CyberCard: React.FC<CyberCardProps> = ({
  children,
  className = '',
  glow = true,
  interactive = true,
  cornerAccents = true,
  dangerGlow = false,
  onClick,
  ...props
}) => {
  const [sweeping, setSweeping] = useState<boolean>(false);

  const handleClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (interactive) {
      setSweeping(true);
      cyberSound.playClick();
      setTimeout(() => setSweeping(false), 1200);
    }
    if (onClick) {
      onClick(e);
    }
  };

  return (
    <div
      {...props}
      onClick={handleClick}
      className={`relative overflow-hidden rounded-2xl bg-[#0D1828]/90 backdrop-blur-xl transition-all duration-300 ${
        dangerGlow
          ? 'border-2 border-red-500/80 shadow-[0_0_35px_rgba(239,68,68,0.45)] animate-pulse'
          : 'border border-cyan-900/40'
      } ${
        interactive
          ? dangerGlow
            ? 'cursor-pointer hover:-translate-y-1 hover:border-red-400 hover:shadow-[0_0_40px_rgba(239,68,68,0.6)] active:scale-[0.995]'
            : 'cursor-pointer hover:-translate-y-1 hover:border-cyan-400/60 hover:shadow-[0_0_30px_rgba(0,217,255,0.22)] active:scale-[0.995]'
          : ''
      } ${className}`}
    >
      {/* Corner Tech Accents */}
      {cornerAccents && (
        <>
          <span className={`absolute top-0 left-0 w-2.5 h-2.5 border-t-2 border-l-2 pointer-events-none ${dangerGlow ? 'border-red-500' : 'border-cyan-400/60'}`} />
          <span className={`absolute top-0 right-0 w-2.5 h-2.5 border-t-2 border-r-2 pointer-events-none ${dangerGlow ? 'border-red-500' : 'border-cyan-400/60'}`} />
          <span className={`absolute bottom-0 left-0 w-2.5 h-2.5 border-b-2 border-l-2 pointer-events-none ${dangerGlow ? 'border-red-500' : 'border-cyan-400/60'}`} />
          <span className={`absolute bottom-0 right-0 w-2.5 h-2.5 border-b-2 border-r-2 pointer-events-none ${dangerGlow ? 'border-red-500' : 'border-cyan-400/60'}`} />
        </>
      )}

      {/* Internal light sweep beam on click or hover */}
      {sweeping && (
        <div className="absolute inset-0 pointer-events-none z-10 overflow-hidden">
          <div className={`w-1/2 h-full bg-gradient-to-r from-transparent ${dangerGlow ? 'via-red-500/30' : 'via-cyan-400/25'} to-transparent animate-card-sweep`} />
        </div>
      )}

      {children}
    </div>
  );
};
