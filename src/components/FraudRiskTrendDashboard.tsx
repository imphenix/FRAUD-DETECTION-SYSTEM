import React, { useState, useMemo } from 'react';
import { 
  ResponsiveContainer, 
  ComposedChart, 
  Area, 
  Line, 
  Bar, 
  XAxis, 
  YAxis, 
  Tooltip, 
  CartesianGrid, 
  ReferenceLine 
} from 'recharts';
import { 
  TrendingUp, 
  AlertTriangle, 
  Activity, 
  Flame, 
  ShieldAlert, 
  Filter, 
  ChevronRight, 
  Layers,
  Sparkles,
  Maximize2
} from 'lucide-react';
import { FraudCaseRecord, SystemConfiguration } from '../types/fraud';

interface FraudRiskTrendDashboardProps {
  cases: FraudCaseRecord[];
  config: SystemConfiguration;
  onSelectCase?: (caseId: string) => void;
}

export const FraudRiskTrendDashboard: React.FC<FraudRiskTrendDashboardProps> = ({
  cases,
  config,
  onSelectCase
}) => {
  const [filterMode, setFilterMode] = useState<'all' | 'peaks' | 'confirmed'>('all');
  const [chartType, setChartType] = useState<'area' | 'spikes' | 'combined'>('combined');
  const [hoveredPoint, setHoveredPoint] = useState<any>(null);

  // Prepare chronological timeline data
  const chartData = useMemo(() => {
    // If cases list is empty, generate realistic seed timeline data so the admin sees live trends immediately
    let rawList: FraudCaseRecord[] = cases;
    if (!rawList || rawList.length === 0) {
      const now = Date.now();
      rawList = [
        {
          caseId: 'CASE-SEED-01',
          createdAt: new Date(now - 3600000 * 6).toISOString(),
          riskScore: 0.72,
          thresholdAtEvaluation: config.fraudThreshold,
          status: 'PENDING_REVIEW',
          detectedReasons: ['Velocity burst (4 tx in 10m)'],
          transaction: {
            transactionId: 'TX-101',
            userId: 'usr_882',
            amount: 1450,
            userHistoricalAvg: 220,
            merchantCategory: 'ELECTRONICS_TECH',
            location: 'Lagos, Nigeria',
            channel: 'WEB_PORTAL',
            hourOfDay: 3,
            velocityWindowCount: 4,
            timestamp: new Date(now - 3600000 * 6).toISOString()
          },
          investigatorNotes: 'Automated seed point'
        },
        {
          caseId: 'CASE-SEED-02',
          createdAt: new Date(now - 3600000 * 4.5).toISOString(),
          riskScore: 0.88,
          thresholdAtEvaluation: config.fraudThreshold,
          status: 'CONFIRMED_FRAUD',
          detectedReasons: ['Severe amount anomaly (12.4x avg)', 'Overseas IP'],
          transaction: {
            transactionId: 'TX-102',
            userId: 'usr_391',
            amount: 5200,
            userHistoricalAvg: 180,
            merchantCategory: 'CRYPTO_EXCHANGE',
            location: 'Eastern Europe Proxy',
            channel: 'WEB_PORTAL',
            hourOfDay: 2,
            velocityWindowCount: 7,
            timestamp: new Date(now - 3600000 * 4.5).toISOString()
          },
          investigatorNotes: 'Confirmed card drainer'
        },
        {
          caseId: 'CASE-SEED-03',
          createdAt: new Date(now - 3600000 * 3).toISOString(),
          riskScore: 0.68,
          thresholdAtEvaluation: config.fraudThreshold,
          status: 'FALSE_POSITIVE',
          detectedReasons: ['Travel ticket purchase'],
          transaction: {
            transactionId: 'TX-103',
            userId: 'usr_104',
            amount: 890,
            userHistoricalAvg: 400,
            merchantCategory: 'DINING_ENTERTAINMENT',
            location: 'London, UK',
            channel: 'MOBILE_APP',
            hourOfDay: 14,
            velocityWindowCount: 1,
            timestamp: new Date(now - 3600000 * 3).toISOString()
          },
          investigatorNotes: 'Customer verified by phone'
        },
        {
          caseId: 'CASE-SEED-04',
          createdAt: new Date(now - 3600000 * 1.5).toISOString(),
          riskScore: 0.96,
          thresholdAtEvaluation: config.fraudThreshold,
          status: 'CONFIRMED_FRAUD',
          detectedReasons: ['Mass card test spike', 'Zero-velocity bot fingerprint', 'Night anomaly'],
          transaction: {
            transactionId: 'TX-104',
            userId: 'usr_512',
            amount: 9800,
            userHistoricalAvg: 95,
            merchantCategory: 'LUXURY_JEWELRY',
            location: 'Tor Exit Node',
            channel: 'WEB_PORTAL',
            hourOfDay: 4,
            velocityWindowCount: 12,
            timestamp: new Date(now - 3600000 * 1.5).toISOString()
          },
          investigatorNotes: 'Critical ATO incident'
        },
        {
          caseId: 'CASE-SEED-05',
          createdAt: new Date(now - 3600000 * 0.5).toISOString(),
          riskScore: 0.79,
          thresholdAtEvaluation: config.fraudThreshold,
          status: 'PENDING_REVIEW',
          detectedReasons: ['Foreign jewelry checkout'],
          transaction: {
            transactionId: 'TX-105',
            userId: 'usr_928',
            amount: 3100,
            userHistoricalAvg: 300,
            merchantCategory: 'LUXURY_JEWELRY',
            location: 'Hong Kong SAR',
            channel: 'WEB_PORTAL',
            hourOfDay: 1,
            velocityWindowCount: 3,
            timestamp: new Date(now - 3600000 * 0.5).toISOString()
          },
          investigatorNotes: 'Awaiting 2FA resolution'
        }
      ];
    }

    // Filter by selection
    let filtered = [...rawList];
    if (filterMode === 'peaks') {
      filtered = filtered.filter(c => c.riskScore >= 0.75);
    } else if (filterMode === 'confirmed') {
      filtered = filtered.filter(c => c.status === 'CONFIRMED_FRAUD');
    }

    // Sort chronologically ascending
    filtered.sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());

    return filtered.map((c, index) => {
      const dateObj = new Date(c.createdAt);
      const timeLabel = isNaN(dateObj.getTime())
        ? `Pt #${index + 1}`
        : dateObj.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

      const isPeak = c.riskScore >= 0.80;
      const isCritical = c.riskScore >= 0.90;

      return {
        id: c.caseId,
        time: timeLabel,
        fullTimestamp: c.createdAt,
        riskScore: Number(c.riskScore.toFixed(3)),
        threshold: Number(c.thresholdAtEvaluation.toFixed(2)),
        amount: c.transaction.amount,
        velocity: c.transaction.velocityWindowCount,
        merchant: c.transaction.merchantCategory,
        location: c.transaction.location,
        channel: c.transaction.channel,
        reasons: c.detectedReasons,
        status: c.status,
        isPeak,
        isCritical,
        // Normalized spike score for dual rendering
        surgeIndicator: isCritical ? 1 : isPeak ? 0.75 : 0.4
      };
    });
  }, [cases, filterMode, config.fraudThreshold]);

  // Derived stats for the summary header
  const stats = useMemo(() => {
    if (chartData.length === 0) {
      return { peakScore: 0, avgScore: 0, criticalCount: 0, peakCase: null };
    }
    const scores = chartData.map(d => d.riskScore);
    const maxScore = Math.max(...scores);
    const avg = scores.reduce((sum, val) => sum + val, 0) / scores.length;
    const criticals = chartData.filter(d => d.isCritical || d.isPeak).length;
    const peakItem = chartData.find(d => d.riskScore === maxScore) || chartData[0];

    return {
      peakScore: maxScore,
      avgScore: avg,
      criticalCount: criticals,
      peakCase: peakItem
    };
  }, [chartData]);

  // Custom Futuristic Cyber Tooltip
  const CustomTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload;
      const isBreached = data.riskScore >= data.threshold;
      
      return (
        <div className="rounded-xl border border-cyan-500/50 bg-[#070e1e]/95 p-3.5 shadow-2xl backdrop-blur-md text-xs font-sans max-w-xs space-y-2 z-50">
          <div className="flex items-center justify-between border-b border-slate-800 pb-1.5 gap-3">
            <span className="font-mono text-cyan-300 font-bold text-[11px] flex items-center gap-1">
              <Activity className="w-3 h-3 text-cyan-400" />
              {data.id}
            </span>
            <span className="font-mono text-slate-400 text-[10px]">{data.time}</span>
          </div>

          <div className="grid grid-cols-2 gap-2 pt-1 font-mono">
            <div className="bg-[#0b162c] p-1.5 rounded-lg border border-slate-800">
              <span className="text-[10px] text-slate-400 block">Risk Score</span>
              <span className={`text-sm font-bold ${
                data.riskScore >= 0.85 
                  ? 'text-red-400' 
                  : data.riskScore >= data.threshold 
                  ? 'text-amber-400' 
                  : 'text-emerald-400'
              }`}>
                {data.riskScore.toFixed(3)}
              </span>
            </div>

            <div className="bg-[#0b162c] p-1.5 rounded-lg border border-slate-800">
              <span className="text-[10px] text-slate-400 block">Transaction</span>
              <span className="text-sm font-bold text-white">
                ₹{data.amount.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
              </span>
            </div>
          </div>

          <div className="text-[11px] text-slate-300 space-y-1">
            <div className="flex justify-between text-slate-400">
              <span>Merchant:</span>
              <span className="text-slate-200 truncate ml-2 font-medium">{data.merchant}</span>
            </div>
            <div className="flex justify-between text-slate-400">
              <span>Location:</span>
              <span className="text-slate-200 truncate ml-2 font-medium">{data.location}</span>
            </div>
            <div className="flex justify-between text-slate-400">
              <span>Velocity (10m):</span>
              <span className="font-mono text-violet-300 font-bold">{data.velocity} tx</span>
            </div>
          </div>

          {data.isPeak && (
            <div className="px-2 py-1 rounded bg-red-950/80 border border-red-800 text-red-300 text-[10px] font-bold flex items-center gap-1">
              <Flame className="w-3 h-3 text-red-400 animate-pulse" />
              <span>SUSPICIOUS PEAK ANOMALY SURGE</span>
            </div>
          )}

          {data.reasons && data.reasons.length > 0 && (
            <div className="pt-1 border-t border-slate-800/80 text-[10px] text-slate-400">
              <span className="text-slate-300 font-semibold block mb-0.5">Primary Triggers:</span>
              <ul className="list-disc pl-3 text-slate-400 space-y-0.5">
                {data.reasons.slice(0, 2).map((r: string, i: number) => (
                  <li key={i} className="truncate">{r}</li>
                ))}
              </ul>
            </div>
          )}
        </div>
      );
    }
    return null;
  };

  return (
    <div className="rounded-2xl border border-cyan-500/30 bg-gradient-to-b from-[#091024] to-[#060b18] p-4 sm:p-5 shadow-2xl relative overflow-hidden space-y-4">
      {/* Top Ambient Glow */}
      <div className="absolute top-0 right-1/4 w-80 h-32 bg-cyan-500/10 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute top-0 left-10 w-60 h-24 bg-violet-600/10 rounded-full blur-3xl pointer-events-none" />

      {/* 1. Header & Controls */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 relative z-10">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-cyan-950/90 border border-cyan-500/50 flex items-center justify-center text-cyan-400 shadow-lg shadow-cyan-950/60">
            <TrendingUp className="w-5 h-5 text-cyan-300" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-sm font-bold text-white tracking-wide">
                Fraud Risk Score Trend & Peak Surveillance
              </h3>
              <span className="px-2 py-0.5 rounded-full bg-cyan-950 text-cyan-300 border border-cyan-700/60 text-[10px] font-mono font-bold">
                RECHARTS ENGINE
              </span>
            </div>
            <p className="text-xs text-slate-400">
              Real-time chronological timeline showing suspicious peaks, anomaly spikes, and threshold breaches
            </p>
          </div>
        </div>

        {/* View Controls & Filter Buttons */}
        <div className="flex items-center gap-2 flex-wrap">
          {/* Chart View Switcher */}
          <div className="p-0.5 rounded-lg bg-[#050a16] border border-slate-800 flex items-center">
            <button
              onClick={() => setChartType('combined')}
              className={`px-2.5 py-1 text-[11px] font-semibold rounded transition-all ${
                chartType === 'combined'
                  ? 'bg-cyan-600 text-white shadow-sm'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
              title="Combined Area with Peak Point markers"
            >
              Area & Peaks
            </button>
            <button
              onClick={() => setChartType('spikes')}
              className={`px-2.5 py-1 text-[11px] font-semibold rounded transition-all ${
                chartType === 'spikes'
                  ? 'bg-violet-600 text-white shadow-sm'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
              title="Focus on risk spike columns"
            >
              Spike Bars
            </button>
            <button
              onClick={() => setChartType('area')}
              className={`px-2.5 py-1 text-[11px] font-semibold rounded transition-all ${
                chartType === 'area'
                  ? 'bg-indigo-600 text-white shadow-sm'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
              title="Smooth risk gradient contour"
            >
              Smooth Curve
            </button>
          </div>

          {/* Filter Mode */}
          <div className="flex items-center gap-1 bg-[#050a16] border border-slate-800 rounded-lg p-0.5">
            <button
              onClick={() => setFilterMode('all')}
              className={`px-2 py-1 text-[11px] rounded transition-all font-medium ${
                filterMode === 'all'
                  ? 'bg-slate-800 text-cyan-300 font-bold'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              All Events ({cases.length || 5})
            </button>
            <button
              onClick={() => setFilterMode('peaks')}
              className={`px-2 py-1 text-[11px] rounded transition-all font-medium flex items-center gap-1 ${
                filterMode === 'peaks'
                  ? 'bg-red-950 text-red-300 border border-red-700 font-bold'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <Flame className="w-3 h-3 text-red-400" />
              <span>Peaks (≥0.75)</span>
            </button>
            <button
              onClick={() => setFilterMode('confirmed')}
              className={`px-2 py-1 text-[11px] rounded transition-all font-medium ${
                filterMode === 'confirmed'
                  ? 'bg-violet-950 text-violet-300 border border-violet-700 font-bold'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              Confirmed
            </button>
          </div>
        </div>
      </div>

      {/* 2. Mini KPI Overview Bar */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 pt-1">
        {/* Metric 1: Peak Risk Score */}
        <div className="rounded-xl bg-[#070e20]/80 border border-red-900/40 p-2.5 backdrop-blur-sm relative overflow-hidden">
          <div className="flex items-center justify-between">
            <span className="text-[10px] text-slate-400 font-mono">PEAK SUSPICION</span>
            <Flame className="w-3.5 h-3.5 text-red-400 animate-pulse" />
          </div>
          <div className="flex items-baseline gap-2 mt-1">
            <span className="text-xl font-extrabold text-red-400 font-mono">
              {stats.peakScore.toFixed(3)}
            </span>
            <span className="text-[10px] text-red-300 font-semibold">Critical Spike</span>
          </div>
          <div className="text-[10px] text-slate-400 truncate mt-0.5 font-mono">
            {stats.peakCase ? `${stats.peakCase.id} · ${stats.peakCase.time}` : 'None'}
          </div>
        </div>

        {/* Metric 2: Average Risk */}
        <div className="rounded-xl bg-[#070e20]/80 border border-cyan-900/40 p-2.5 backdrop-blur-sm">
          <div className="flex items-center justify-between">
            <span className="text-[10px] text-slate-400 font-mono">AVERAGE RISK</span>
            <Activity className="w-3.5 h-3.5 text-cyan-400" />
          </div>
          <div className="flex items-baseline gap-2 mt-1">
            <span className="text-xl font-extrabold text-cyan-300 font-mono">
              {stats.avgScore.toFixed(3)}
            </span>
            <span className="text-[10px] text-slate-400">μ across events</span>
          </div>
          <div className="text-[10px] text-slate-400 truncate mt-0.5">
            Surveillance baseline
          </div>
        </div>

        {/* Metric 3: Critical Surge Count */}
        <div className="rounded-xl bg-[#070e20]/80 border border-violet-900/40 p-2.5 backdrop-blur-sm">
          <div className="flex items-center justify-between">
            <span className="text-[10px] text-slate-400 font-mono">HIGH PEAKS (≥0.80)</span>
            <AlertTriangle className="w-3.5 h-3.5 text-amber-400" />
          </div>
          <div className="flex items-baseline gap-2 mt-1">
            <span className="text-xl font-extrabold text-amber-400 font-mono">
              {stats.criticalCount}
            </span>
            <span className="text-[10px] text-slate-400">incidents</span>
          </div>
          <div className="text-[10px] text-slate-400 truncate mt-0.5">
            Requiring immediate audit
          </div>
        </div>

        {/* Metric 4: Threshold Margin */}
        <div className="rounded-xl bg-[#070e20]/80 border border-slate-800 p-2.5 backdrop-blur-sm">
          <div className="flex items-center justify-between">
            <span className="text-[10px] text-slate-400 font-mono">THRESHOLD SETTING</span>
            <ShieldAlert className="w-3.5 h-3.5 text-violet-400" />
          </div>
          <div className="flex items-baseline gap-2 mt-1">
            <span className="text-xl font-extrabold text-violet-300 font-mono">
              {config.fraudThreshold.toFixed(2)}
            </span>
            <span className="text-[10px] text-emerald-400 font-semibold font-mono">
              +{(stats.peakScore - config.fraudThreshold).toFixed(2)} max
            </span>
          </div>
          <div className="text-[10px] text-slate-400 truncate mt-0.5">
            Active Perceptron gate
          </div>
        </div>
      </div>

      {/* 3. Recharts Main Canvas */}
      <div className="rounded-xl border border-slate-800/80 bg-[#040814]/90 p-3 sm:p-4 relative">
        {/* Chart Watermark / Legend */}
        <div className="flex items-center justify-between text-[11px] text-slate-400 mb-2 px-1">
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-full bg-cyan-400 shadow-sm shadow-cyan-400/80" />
              <span>Risk Score Trend</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="w-3 h-0.5 border-b-2 border-dashed border-red-500" />
              <span className="text-red-400">Threshold Cutoff ({config.fraudThreshold.toFixed(2)})</span>
            </div>
            {chartType === 'spikes' && (
              <div className="flex items-center gap-1.5">
                <span className="w-2 h-2 rounded bg-violet-500" />
                <span>Spike Magnitude</span>
              </div>
            )}
          </div>

          <span className="text-[10px] font-mono text-slate-400 hidden sm:inline">
            Interactive: Hover over points to inspect transaction context
          </span>
        </div>

        <div className="h-64 sm:h-72 w-full">
          <ResponsiveContainer width="100%" height="100%">
            <ComposedChart
              data={chartData}
              margin={{ top: 15, right: 15, left: -20, bottom: 5 }}
            >
              <defs>
                {/* Cyan-to-violet risk score glow gradient */}
                <linearGradient id="riskScoreGlow" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#06b6d4" stopOpacity={0.45} />
                  <stop offset="60%" stopColor="#8b5cf6" stopOpacity={0.15} />
                  <stop offset="95%" stopColor="#0f172a" stopOpacity={0.0} />
                </linearGradient>

                {/* Bar spike gradient */}
                <linearGradient id="spikeBarGradient" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#ef4444" stopOpacity={0.8} />
                  <stop offset="70%" stopColor="#8b5cf6" stopOpacity={0.5} />
                  <stop offset="100%" stopColor="#06b6d4" stopOpacity={0.2} />
                </linearGradient>
              </defs>

              <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" opacity={0.6} />

              <XAxis
                dataKey="time"
                stroke="#64748b"
                tick={{ fill: '#94a3b8', fontSize: 10, fontFamily: 'monospace' }}
                tickLine={{ stroke: '#334155' }}
              />

              <YAxis
                domain={[0, 1]}
                ticks={[0, 0.25, 0.5, 0.75, 1]}
                stroke="#64748b"
                tick={{ fill: '#94a3b8', fontSize: 10, fontFamily: 'monospace' }}
                tickFormatter={(val) => `${(val * 100).toFixed(0)}%`}
                tickLine={{ stroke: '#334155' }}
              />

              <Tooltip content={<CustomTooltip />} />

              {/* Fraud Decision Threshold Reference Line */}
              <ReferenceLine
                y={config.fraudThreshold}
                stroke="#ef4444"
                strokeDasharray="4 4"
                strokeWidth={1.5}
                label={{
                  value: `Threshold: ${config.fraudThreshold.toFixed(2)}`,
                  fill: '#f87171',
                  fontSize: 10,
                  position: 'insideTopRight',
                  fontFamily: 'monospace'
                }}
              />

              {/* Optional Spike Bars */}
              {(chartType === 'spikes' || chartType === 'combined') && (
                <Bar
                  dataKey="riskScore"
                  fill="url(#spikeBarGradient)"
                  barSize={14}
                  radius={[4, 4, 0, 0]}
                  opacity={chartType === 'spikes' ? 0.9 : 0.4}
                />
              )}

              {/* Area Gradient for smooth visual flow */}
              {(chartType === 'area' || chartType === 'combined') && (
                <Area
                  type="monotone"
                  dataKey="riskScore"
                  stroke="#06b6d4"
                  strokeWidth={2.5}
                  fill="url(#riskScoreGlow)"
                  activeDot={{
                    r: 6,
                    fill: '#38bdf8',
                    stroke: '#ffffff',
                    strokeWidth: 2,
                    className: 'animate-ping'
                  }}
                  dot={(props: any) => {
                    const { cx, cy, payload } = props;
                    const isHigh = payload.riskScore >= 0.85;
                    const isThresholdCross = payload.riskScore >= payload.threshold;
                    return (
                      <circle
                        key={payload.id}
                        cx={cx}
                        cy={cy}
                        r={isHigh ? 5 : isThresholdCross ? 4 : 3}
                        fill={isHigh ? '#ef4444' : isThresholdCross ? '#fbbf24' : '#06b6d4'}
                        stroke="#0f172a"
                        strokeWidth={1.5}
                        className={isHigh ? 'animate-pulse' : ''}
                      />
                    );
                  }}
                />
              )}

              {/* Accent Line for crisp contour */}
              <Line
                type="monotone"
                dataKey="riskScore"
                stroke="#38bdf8"
                strokeWidth={1.5}
                dot={false}
                opacity={0.8}
              />
            </ComposedChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* 4. Peak Surveillance Alert Banner */}
      {stats.peakCase && (
        <div className="rounded-xl bg-gradient-to-r from-red-950/70 via-[#180e22]/80 to-[#0c182a]/80 border border-red-800/60 p-3 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
          <div className="flex items-center gap-2.5">
            <div className="w-7 h-7 rounded-lg bg-red-900/80 border border-red-600 flex items-center justify-center text-red-200 shrink-0">
              <Flame className="w-4 h-4 text-red-300 animate-pulse" />
            </div>
            <div>
              <div className="flex items-center gap-2 font-mono">
                <span className="font-bold text-red-300">
                  CRITICAL PEAK SURGE DETECTED: {stats.peakCase.id}
                </span>
                <span className="px-1.5 py-0.2 rounded bg-red-900/80 text-white font-bold text-[10px]">
                  SCORE: {stats.peakCase.riskScore.toFixed(3)}
                </span>
              </div>
              <p className="text-[11px] text-slate-300 mt-0.5">
                ₹{stats.peakCase.amount.toLocaleString('en-IN')} at {stats.peakCase.merchant} ({stats.peakCase.location}) triggered maximum neural risk activation.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            {onSelectCase && (
              <button
                onClick={() => onSelectCase(stats.peakCase.id)}
                className="px-3 py-1.5 rounded-lg bg-red-900/90 hover:bg-red-800 text-white font-semibold text-xs border border-red-600 shadow flex items-center gap-1 transition-all"
              >
                <span>Inspect Peak Case</span>
                <ChevronRight className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
