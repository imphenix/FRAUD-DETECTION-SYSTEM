import React, { useEffect, useState } from 'react';
import { TransactionEvaluationResult } from '../types/fraud';
import { AlertOctagon, X, ShieldAlert, ArrowRight, Lock, Check } from 'lucide-react';

export interface FraudToastData {
  id: string;
  result: TransactionEvaluationResult;
}

interface FraudAlertToastProps {
  toast: FraudToastData | null;
  onDismiss: () => void;
  onReviewCase?: (caseId?: string) => void;
}

export const FraudAlertToast: React.FC<FraudAlertToastProps> = ({
  toast,
  onDismiss,
  onReviewCase
}) => {
  const [progress, setProgress] = useState<number>(100);
  const [isCardFrozen, setIsCardFrozen] = useState<boolean>(false);

  useEffect(() => {
    if (!toast) {
      setProgress(100);
      setIsCardFrozen(false);
      return;
    }

    setIsCardFrozen(false);
    setProgress(100);

    // Auto-dismiss countdown over 8 seconds
    const duration = 8000;
    const intervalTime = 50;
    const step = (intervalTime / duration) * 100;

    const timer = setInterval(() => {
      setProgress((prev) => {
        if (prev <= 0) {
          clearInterval(timer);
          onDismiss();
          return 0;
        }
        return prev - step;
      });
    }, intervalTime);

    return () => clearInterval(timer);
  }, [toast, onDismiss]);

  if (!toast) return null;

  const { result } = toast;
  const tx = result.transaction;

  const handleFreezeCard = () => {
    setIsCardFrozen(true);
    // Notification remains briefly to show confirmation
    setTimeout(() => {
      onDismiss();
    }, 2500);
  };

  return (
    <aside 
      aria-label="High risk fraud alert notification"
      className="fixed bottom-6 right-6 z-50 max-w-md w-full animate-slide-up shadow-2xl"
    >
      <div className="rounded-xl border border-red-500/80 bg-[#160b13]/95 backdrop-blur-xl p-4 shadow-red-950/60 shadow-2xl overflow-hidden relative">
        {/* Pulsing red accent line */}
        <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-red-600 via-violet-600 to-amber-500" />

        {/* Progress bar countdown */}
        <div
          className="absolute bottom-0 left-0 h-0.5 bg-red-500/60 transition-all duration-75 ease-linear"
          style={{ width: `${progress}%` }}
        />

        <div className="flex items-start justify-between gap-3">
          {/* Alert Icon with radar pulse */}
          <div className="relative shrink-0 mt-0.5">
            <div className="w-10 h-10 rounded-lg bg-red-950 border border-red-600/80 flex items-center justify-center text-red-400 shadow-lg shadow-red-900/40">
              <AlertOctagon className="w-5 h-5 animate-pulse" />
            </div>
            <span className="absolute -top-1 -right-1 flex h-3 w-3">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75" />
              <span className="relative inline-flex rounded-full h-3 w-3 bg-red-500" />
            </span>
          </div>

          {/* Toast Content */}
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2">
              <span className="text-[11px] font-bold uppercase tracking-wider text-red-400 flex items-center gap-1 font-mono">
                <ShieldAlert className="w-3.5 h-3.5" />
                HIGH RISK TRANSACTION MARKED
              </span>
              <span className="text-[10px] font-mono text-red-300/80 bg-red-950/80 px-1.5 py-0.2 rounded border border-red-800/60">
                Score: {result.riskScore.toFixed(3)}
              </span>
            </div>

            <h4 className="text-sm font-bold text-white mt-1 flex items-center justify-between">
              <span>{tx.transactionId} · ₹{tx.amount.toFixed(2)}</span>
              <span className="text-xs font-mono text-slate-400 font-normal">
                Limit: {result.threshold.toFixed(2)}
              </span>
            </h4>

            {/* Triggers preview */}
            <p className="text-xs text-red-200/90 mt-1 line-clamp-2 leading-snug font-sans">
              {result.breakdown.triggeredAlerts[0] || 'Unusual deviation detected against user profile.'}
            </p>

            {/* Action buttons */}
            <div className="flex items-center gap-2 mt-3 pt-2.5 border-t border-red-900/50">
              {isCardFrozen ? (
                <div className="flex items-center gap-1.5 text-xs text-emerald-400 font-semibold py-1">
                  <Check className="w-4 h-4" />
                  <span>Card Temporarily Frozen & Flagged</span>
                </div>
              ) : (
                <>
                  <button
                    type="button"
                    onClick={handleFreezeCard}
                    className="px-2.5 py-1.5 rounded-lg bg-red-900/80 hover:bg-red-800 text-red-200 text-xs font-semibold flex items-center gap-1.5 border border-red-700/60 transition-colors"
                  >
                    <Lock className="w-3.5 h-3.5" />
                    <span>Emergency Freeze</span>
                  </button>

                  {onReviewCase && (
                    <button
                      type="button"
                      onClick={() => onReviewCase(result.caseId)}
                      className="px-2.5 py-1.5 rounded-lg bg-slate-800/90 hover:bg-slate-700 text-slate-200 text-xs font-medium flex items-center gap-1 transition-colors"
                    >
                      <span>Review Details</span>
                      <ArrowRight className="w-3 h-3 text-cyan-400" />
                    </button>
                  )}
                </>
              )}
            </div>
          </div>

          {/* Dismiss button */}
          <button
            type="button"
            onClick={onDismiss}
            className="text-slate-400 hover:text-white p-1 rounded-lg hover:bg-red-950 transition-colors"
            title="Dismiss notification"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>
    </aside>
  );
};
