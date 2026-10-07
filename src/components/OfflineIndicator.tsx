import React from 'react';
import { useOnlineStatus } from '../hooks/useOnlineStatus';
import { WifiOff, Database } from 'lucide-react';

export const OfflineIndicator: React.FC = () => {
  const isOnline = useOnlineStatus();

  if (isOnline) return null;

  return (
    <div className="fixed top-18 right-4 z-50 flex items-center gap-2.5 rounded-lg bg-amber-950/95 border border-amber-600/60 px-3.5 py-2 text-xs font-medium text-amber-200 shadow-2xl backdrop-blur-md animate-bounce-subtle">
      <WifiOff className="w-4 h-4 text-amber-400 shrink-0 animate-pulse" />
      <div>
        <span className="font-semibold text-amber-300 block">Offline Mode Active</span>
        <span className="text-[11px] text-amber-300/80 font-sans flex items-center gap-1">
          <Database className="w-3 h-3 text-cyan-400" />
          Local Java & AI engine running with local storage persistence
        </span>
      </div>
    </div>
  );
};
