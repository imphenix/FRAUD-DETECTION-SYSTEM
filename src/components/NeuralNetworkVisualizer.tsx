import React from 'react';
import { RiskFactorsBreakdown, SystemConfiguration } from '../types/fraud';

interface NeuralNetworkVisualizerProps {
  breakdown?: RiskFactorsBreakdown;
  config: SystemConfiguration;
  isAnalyzing?: boolean;
}

export const NeuralNetworkVisualizer: React.FC<NeuralNetworkVisualizerProps> = ({
  breakdown,
  config,
  isAnalyzing = false
}) => {
  const inputs = [
    { label: 'Amount Anomaly', value: breakdown?.amountAnomalyScore ?? 0.15, weight: config.amountAnomalyWeight, color: '#38bdf8' },
    { label: 'Location Risk', value: breakdown?.locationDiscrepancyScore ?? 0.05, weight: config.locationDiscrepancyWeight, color: '#818cf8' },
    { label: 'Velocity Burst', value: breakdown?.velocityScore ?? 0.02, weight: config.velocityWeight, color: '#a78bfa' },
    { label: 'Off-Hours Time', value: breakdown?.timeAnomalyScore ?? 0.05, weight: config.timeAnomalyWeight, color: '#c084fc' },
    { label: 'Merchant Risk', value: breakdown?.merchantRiskScore ?? 0.05, weight: config.merchantRiskWeight, color: '#00F0FF' },
  ];

  const finalScore = breakdown?.finalRiskScore ?? 0.12;
  const isHighRisk = finalScore > config.fraudThreshold;

  return (
    <div className="rounded-xl border border-slate-800/80 bg-[#0d1322]/90 p-5 shadow-xl relative overflow-hidden backdrop-blur-md">
      {/* Decorative neural grid glow */}
      <div className="absolute -top-16 -right-16 w-48 h-48 bg-violet-600/10 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute -bottom-16 -left-16 w-48 h-48 bg-cyan-500/10 rounded-full blur-3xl pointer-events-none" />

      <div className="flex items-center justify-between mb-4 border-b border-slate-800 pb-3">
        <div>
          <h4 className="text-sm font-semibold tracking-wide text-slate-200 flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-cyan-400 animate-pulse" />
            Neural Inference Architecture
          </h4>
          <p className="text-xs text-slate-400 mt-0.5">
            Calibrated Perceptron · Logistic Activation: <span className="font-mono text-cyan-300">σ(z) = 1/(1+e^-z)</span>
          </p>
        </div>
        <div className="text-right">
          <span className="text-[11px] text-slate-400 block">Threshold Limit</span>
          <span className="font-mono text-xs font-semibold text-violet-300">{config.fraudThreshold.toFixed(2)}</span>
        </div>
      </div>

      {/* SVG Synaptic Map */}
      <div className="relative py-2">
        <svg className="w-full h-44 overflow-visible" viewBox="0 0 540 180">
          <defs>
            <linearGradient id="synapseGradient" x1="0%" y1="0%" x2="100%" y2="0%">
              <stop offset="0%" stopColor="#38bdf8" stopOpacity="0.4" />
              <stop offset="50%" stopColor="#8b5cf6" stopOpacity="0.7" />
              <stop offset="100%" stopColor={isHighRisk ? '#ef4444' : '#00F0FF'} stopOpacity="0.8" />
            </linearGradient>
            <filter id="glow">
              <feGaussianBlur stdDeviation="2.5" result="coloredBlur" />
              <feMerge>
                <feMergeNode in="coloredBlur" />
                <feMergeNode in="SourceGraphic" />
              </feMerge>
            </filter>
          </defs>

          {/* Synaptic connecting lines */}
          {inputs.map((input, idx) => {
            const startY = 24 + idx * 32;
            const endY = 90;
            const strokeOpacity = Math.max(0.2, input.value * 0.9);
            const strokeWidth = 1 + input.weight * 3.5;

            return (
              <g key={idx}>
                <path
                  d={`M 140 ${startY} C 220 ${startY}, 220 ${endY}, 290 ${endY}`}
                  fill="none"
                  stroke={input.color}
                  strokeWidth={strokeWidth}
                  strokeOpacity={strokeOpacity}
                  strokeDasharray={isAnalyzing ? '4 2' : 'none'}
                  className={isAnalyzing ? 'animate-pulse' : ''}
                />
              </g>
            );
          })}

          {/* Connection to final output */}
          <path
            d="M 330 90 L 410 90"
            fill="none"
            stroke={isHighRisk ? '#f87171' : '#38bdf8'}
            strokeWidth="3"
            filter="url(#glow)"
            strokeOpacity={isAnalyzing ? '0.4' : '0.9'}
          />

          {/* Input Nodes Column */}
          {inputs.map((input, idx) => {
            const y = 24 + idx * 32;
            const activeIntensity = Math.min(1, Math.max(0.15, input.value));
            return (
              <g key={idx}>
                {/* Node box */}
                <rect
                  x="6"
                  y={y - 12}
                  width="132"
                  height="24"
                  rx="4"
                  fill="#0b101c"
                  stroke={input.color}
                  strokeOpacity={activeIntensity > 0.6 ? 0.9 : 0.4}
                  strokeWidth="1"
                />
                <circle
                  cx="16"
                  cy={y}
                  r="4"
                  fill={input.color}
                  filter={activeIntensity > 0.6 ? 'url(#glow)' : undefined}
                />
                <text x="26" y={y + 3.5} fill="#cbd5e1" fontSize="9.5" fontWeight="500">
                  {input.label}
                </text>
                <text x="130" y={y + 3.5} textAnchor="end" fill={input.color} fontSize="9.5" fontFamily="monospace" fontWeight="600">
                  {input.value.toFixed(2)}
                </text>
              </g>
            );
          })}

          {/* Hidden/Summing Perceptron Junction */}
          <g transform="translate(290, 70)">
            <rect
              x="0"
              y="0"
              width="44"
              height="40"
              rx="8"
              fill="#131c33"
              stroke="#8b5cf6"
              strokeWidth="1.5"
              filter="url(#glow)"
            />
            <text x="22" y="24" textAnchor="middle" fill="#c4b5fd" fontSize="14" fontWeight="700">
              Σ
            </text>
            <text x="22" y="34" textAnchor="middle" fill="#94a3b8" fontSize="7" fontFamily="monospace">
              z={breakdown?.weightedSumZ?.toFixed(2) ?? '0.00'}
            </text>
          </g>

          {/* Output Node: Risk Score */}
          <g transform="translate(410, 66)">
            <rect
              x="0"
              y="0"
              width="100"
              height="48"
              rx="8"
              fill={isHighRisk ? '#220b12' : '#071e28'}
              stroke={isHighRisk ? '#ef4444' : '#00F0FF'}
              strokeWidth="1.5"
              filter="url(#glow)"
            />
            <text x="50" y="16" textAnchor="middle" fill="#94a3b8" fontSize="8" fontWeight="600">
              RISK SCORE σ(z)
            </text>
            <text
              x="50"
              y="38"
              textAnchor="middle"
              fill={isHighRisk ? '#f87171' : '#38bdf8'}
              fontSize="18"
              fontFamily="monospace"
              fontWeight="700"
            >
              {finalScore.toFixed(3)}
            </text>
          </g>
        </svg>
      </div>

      {/* Feature contribution breakdown bar */}
      <div className="mt-2 space-y-1.5 pt-2 border-t border-slate-800/80">
        <div className="flex items-center justify-between text-[11px] text-slate-400">
          <span>Feature Weights Contribution (Σ w_i · x_i)</span>
          <span className="font-mono text-cyan-300">
            {isHighRisk ? 'Threshold Exceeded' : 'Within Normal Bounds'}
          </span>
        </div>
        <div className="w-full bg-slate-900 h-2 rounded-full overflow-hidden flex">
          {inputs.map((input, idx) => {
            const share = (input.weight * input.value) * 100;
            return (
              <div
                key={idx}
                style={{ width: `${Math.max(2, share)}%`, backgroundColor: input.color }}
                title={`${input.label}: weight ${(input.weight * 100).toFixed(0)}%, score ${input.value.toFixed(2)}`}
                className="h-full transition-all duration-300"
              />
            );
          })}
        </div>
      </div>
    </div>
  );
};
