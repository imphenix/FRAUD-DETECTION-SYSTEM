import React from 'react';
import { ArrowRight, Cpu, CheckCircle, AlertTriangle, XCircle, Database, Shield, Zap } from 'lucide-react';

interface TransactionPipelineVisualizerProps {
  isEvaluating: boolean;
  resultStatus?: 'APPROVED' | 'FLAGGED' | 'BLOCKED' | null;
  riskScore?: number | null;
  riskLevel?: string | null;
  triggeredRules?: string[];
}

export const TransactionPipelineVisualizer: React.FC<TransactionPipelineVisualizerProps> = ({
  isEvaluating,
  resultStatus,
  riskScore,
  riskLevel,
  triggeredRules = []
}) => {
  const isDanger = resultStatus === 'BLOCKED' || riskLevel === 'CRITICAL' || riskLevel === 'HIGH';
  const isWarning = resultStatus === 'FLAGGED' || riskLevel === 'MEDIUM';

  const accentColor = isDanger 
    ? 'text-red-400 border-red-500/60 bg-red-950/40' 
    : isWarning 
    ? 'text-amber-400 border-amber-500/60 bg-amber-950/40' 
    : 'text-[#00D9FF] border-[#1677FF]/60 bg-[#0D1828]';

  const pipelineColor = isDanger 
    ? 'from-red-600 via-rose-500 to-red-400' 
    : isWarning 
    ? 'from-blue-600 via-amber-500 to-amber-400' 
    : 'from-[#1677FF] via-[#2495FF] to-[#00D9FF]';

  return (
    <div className="bg-[#07111F]/90 border border-blue-900/60 rounded-2xl p-4 sm:p-5 relative overflow-hidden font-mono shadow-[0_0_20px_rgba(22,119,255,0.08)]">
      {/* Top Telemetry Header */}
      <div className="flex items-center justify-between pb-3 mb-4 border-b border-blue-900/40 text-xs">
        <div className="flex items-center gap-2">
          <div className={`w-2 h-2 rounded-full ${isEvaluating ? 'bg-cyan-400 animate-ping' : resultStatus ? (isDanger ? 'bg-red-500' : isWarning ? 'bg-amber-400' : 'bg-emerald-400') : 'bg-blue-400'}`} />
          <span className="font-bold text-[#F8FAFC] tracking-wider uppercase text-[11px]">
            Real-Time Threat Evaluation Pipeline
          </span>
        </div>
        <span className="text-[10px] text-[#94A3B8]">
          {isEvaluating ? 'STREAMING THROUGH ENGINE...' : resultStatus ? `EVALUATION COMPLETE // ${resultStatus}` : 'IDLE // LISTENING FOR CANDIDATE'}
        </span>
      </div>

      {/* 5-Stage Visual Pipeline */}
      <div className="grid grid-cols-2 sm:grid-cols-5 gap-2 relative z-10 text-center">
        {/* Stage 1: Transaction Ingestion */}
        <div className={`p-2.5 rounded-xl border transition-all duration-300 ${isEvaluating || resultStatus ? 'bg-[#0D1828] border-cyan-500/50 shadow-[0_0_12px_rgba(0,217,255,0.15)] text-[#F8FAFC]' : 'bg-[#07111F] border-blue-900/40 text-slate-500'}`}>
          <div className="text-[9px] uppercase tracking-wider text-[#94A3B8] mb-1">Stage 01</div>
          <div className="w-6 h-6 rounded-lg bg-blue-500/20 text-[#36C8FF] flex items-center justify-center mx-auto mb-1.5">
            <Database className="w-3.5 h-3.5" />
          </div>
          <div className="text-[11px] font-bold truncate">Candidate Tx</div>
          <div className="text-[9px] text-[#64748B] mt-0.5">Payload Read</div>
        </div>

        {/* Stage 2: Risk Signals */}
        <div className={`p-2.5 rounded-xl border transition-all duration-300 ${isEvaluating || resultStatus ? 'bg-[#0D1828] border-cyan-500/50 shadow-[0_0_12px_rgba(0,217,255,0.15)] text-[#F8FAFC]' : 'bg-[#07111F] border-blue-900/40 text-slate-500'}`}>
          <div className="text-[9px] uppercase tracking-wider text-[#94A3B8] mb-1">Stage 02</div>
          <div className="w-6 h-6 rounded-lg bg-blue-500/20 text-[#36C8FF] flex items-center justify-center mx-auto mb-1.5">
            <Zap className="w-3.5 h-3.5" />
          </div>
          <div className="text-[11px] font-bold truncate">Signal Extract</div>
          <div className="text-[9px] text-[#64748B] mt-0.5">Geoloc / Odd Hour</div>
        </div>

        {/* Stage 3: Fraud Engine Rules */}
        <div className={`p-2.5 rounded-xl border transition-all duration-300 ${isEvaluating || resultStatus ? 'bg-[#0D1828] border-cyan-500/50 shadow-[0_0_12px_rgba(0,217,255,0.15)] text-[#F8FAFC]' : 'bg-[#07111F] border-blue-900/40 text-slate-500'}`}>
          <div className="text-[9px] uppercase tracking-wider text-[#94A3B8] mb-1">Stage 03</div>
          <div className="w-6 h-6 rounded-lg bg-blue-500/20 text-[#36C8FF] flex items-center justify-center mx-auto mb-1.5">
            <Cpu className="w-3.5 h-3.5" />
          </div>
          <div className="text-[11px] font-bold truncate">Fraud Engine</div>
          <div className="text-[9px] text-[#64748B] mt-0.5">Matrix Evaluation</div>
        </div>

        {/* Stage 4: Risk Score */}
        <div className={`p-2.5 rounded-xl border transition-all duration-300 ${isEvaluating || resultStatus ? (isDanger ? 'border-red-500/50 bg-red-950/30 text-red-300' : isWarning ? 'border-amber-500/50 bg-amber-950/30 text-amber-300' : 'border-cyan-500/50 bg-[#0D1828] text-[#F8FAFC]') : 'bg-[#07111F] border-blue-900/40 text-slate-500'}`}>
          <div className="text-[9px] uppercase tracking-wider text-[#94A3B8] mb-1">Stage 04</div>
          <div className="w-6 h-6 rounded-lg bg-blue-500/20 text-[#36C8FF] flex items-center justify-center mx-auto mb-1.5">
            <Shield className="w-3.5 h-3.5" />
          </div>
          <div className="text-[11px] font-bold truncate">Risk Score</div>
          <div className="text-[9px] text-[#64748B] mt-0.5">{riskScore !== null && riskScore !== undefined ? `${riskScore} pts` : 'Scoring'}</div>
        </div>

        {/* Stage 5: Final Decision */}
        <div className={`p-2.5 rounded-xl border col-span-2 sm:col-span-1 transition-all duration-300 ${
          resultStatus === 'BLOCKED' 
            ? 'bg-red-950/40 border-red-500 shadow-[0_0_15px_rgba(239,68,68,0.4)] text-red-400' 
            : resultStatus === 'FLAGGED' 
            ? 'bg-amber-950/40 border-amber-500 shadow-[0_0_15px_rgba(245,158,11,0.3)] text-amber-400' 
            : resultStatus === 'APPROVED' 
            ? 'bg-emerald-950/40 border-emerald-500 shadow-[0_0_15px_rgba(34,197,94,0.3)] text-emerald-400' 
            : 'bg-[#07111F] border-blue-900/40 text-slate-500'
        }`}>
          <div className="text-[9px] uppercase tracking-wider mb-1">Stage 05</div>
          <div className="w-6 h-6 rounded-lg flex items-center justify-center mx-auto mb-1.5">
            {resultStatus === 'BLOCKED' ? <XCircle className="w-4 h-4 text-red-400" /> : resultStatus === 'FLAGGED' ? <AlertTriangle className="w-4 h-4 text-amber-400" /> : <CheckCircle className="w-4 h-4 text-emerald-400" />}
          </div>
          <div className="text-[11px] font-black uppercase truncate">
            {resultStatus || 'DECISION'}
          </div>
          <div className="text-[9px] opacity-80 mt-0.5">{riskLevel || 'Pending'}</div>
        </div>
      </div>

      {/* Animated Light Flow Rail */}
      <div className="mt-3 relative h-1.5 bg-[#0D1828] rounded-full overflow-hidden border border-blue-900/50">
        <div 
          className={`h-full bg-gradient-to-r ${pipelineColor} transition-all duration-700 ${isEvaluating ? 'w-full animate-shimmer' : resultStatus ? 'w-full' : 'w-1/5'}`}
        />
      </div>

      {/* Rules fired indicators */}
      {triggeredRules.length > 0 && (
        <div className="mt-3 pt-2.5 border-t border-blue-900/40 flex items-center gap-1.5 flex-wrap text-[10px]">
          <span className="text-[#94A3B8]">Intercepted Rules:</span>
          {triggeredRules.map(r => (
            <span key={r} className="px-1.5 py-0.5 rounded bg-blue-950 border border-blue-800 text-[#00D9FF]">
              {r}
            </span>
          ))}
        </div>
      )}
    </div>
  );
};
