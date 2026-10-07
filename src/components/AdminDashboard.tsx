import React, { useState } from 'react';
import { 
  SystemConfiguration, 
  FraudCaseRecord, 
  ModelPerformanceData 
} from '../types/fraud';
import { 
  Sliders, 
  FileText, 
  Cpu, 
  CheckCircle2, 
  AlertTriangle, 
  RefreshCw, 
  Eye, 
  Download, 
  Save, 
  X, 
  ShieldCheck, 
  Activity, 
  Layers,
  FileSpreadsheet
} from 'lucide-react';
import { exportFraudCasesToCSV } from '../utils/csvExport';

interface AdminDashboardProps {
  config: SystemConfiguration;
  onUpdateConfig: (
    threshold: number,
    amountW: number,
    locW: number,
    velW: number,
    timeW: number,
    merchW: number,
    adminName: string
  ) => { success: boolean; message: string };
  cases: FraudCaseRecord[];
  onUpdateCaseStatus: (caseId: string, status: FraudCaseRecord['status'], notes?: string) => void;
  performanceData: ModelPerformanceData;
  onRefineAlgorithm: (lr: number, iters: number) => {
    oldWeights: Record<string, number>;
    newWeights: Record<string, number>;
    message: string;
  };
  totalTransactionsCount: number;
}

type AdminSubTab = 'config' | 'reports' | 'algorithm';

export const AdminDashboard: React.FC<AdminDashboardProps> = ({
  config,
  onUpdateConfig,
  cases,
  onUpdateCaseStatus,
  performanceData,
  onRefineAlgorithm,
  totalTransactionsCount
}) => {
  const [subTab, setSubTab] = useState<AdminSubTab>('config');

  // Configuration Form State
  const [threshold, setThreshold] = useState<number>(config.fraudThreshold);
  const [amountWeight, setAmountWeight] = useState<number>(config.amountAnomalyWeight);
  const [locationWeight, setLocationWeight] = useState<number>(config.locationDiscrepancyWeight);
  const [velocityWeight, setVelocityWeight] = useState<number>(config.velocityWeight);
  const [timeWeight, setTimeWeight] = useState<number>(config.timeAnomalyWeight);
  const [merchantWeight, setMerchantWeight] = useState<number>(config.merchantRiskWeight);
  const [adminName] = useState<string>('Marcus Vance (Lead Risk Officer)');

  // Feedback states
  const [configConfirmation, setConfigConfirmation] = useState<string | null>(null);
  const [configError, setConfigError] = useState<string | null>(null);

  // Case details modal
  const [selectedCase, setSelectedCase] = useState<FraudCaseRecord | null>(null);
  const [investigatorNoteInput, setInvestigatorNoteInput] = useState<string>('');
  const [statusFilter, setStatusFilter] = useState<string>('ALL');

  // Algorithm refinement state
  const [learningRate, setLearningRate] = useState<number>(0.05);
  const [iterations, setIterations] = useState<number>(10);
  const [refineFeedback, setRefineFeedback] = useState<string | null>(null);
  const [weightDiff, setWeightDiff] = useState<{ oldW: Record<string, number>; newW: Record<string, number> } | null>(null);

  // Generated Report Modal / View
  const [generatedReportText, setGeneratedReportText] = useState<string | null>(null);

  // Weights sum calculation for validation
  const weightsSum = Number((amountWeight + locationWeight + velocityWeight + timeWeight + merchantWeight).toFixed(3));
  const isWeightsSumValid = Math.abs(weightsSum - 1.0) <= 0.05;

  const handleNormalizeWeights = () => {
    if (weightsSum === 0) return;
    const factor = 1.0 / weightsSum;
    setAmountWeight(Number((amountWeight * factor).toFixed(3)));
    setLocationWeight(Number((locationWeight * factor).toFixed(3)));
    setVelocityWeight(Number((velocityWeight * factor).toFixed(3)));
    setTimeWeight(Number((timeWeight * factor).toFixed(3)));
    const curSum = Number((amountWeight * factor + locationWeight * factor + velocityWeight * factor + timeWeight * factor).toFixed(3));
    setMerchantWeight(Number((1.0 - curSum).toFixed(3)));
  };

  const handleSaveConfiguration = (e: React.FormEvent) => {
    e.preventDefault();
    setConfigConfirmation(null);
    setConfigError(null);

    try {
      const res = onUpdateConfig(
        threshold,
        amountWeight,
        locationWeight,
        velocityWeight,
        timeWeight,
        merchantWeight,
        adminName
      );
      if (res.success) {
        setConfigConfirmation(res.message);
      }
    } catch (err: unknown) {
      if (err instanceof Error) {
        setConfigError(err.message);
      } else {
        setConfigError('Failed to update configuration.');
      }
    }
  };

  const handleRefineSubmit = () => {
    setRefineFeedback(null);
    const result = onRefineAlgorithm(learningRate, iterations);
    setRefineFeedback(result.message);
    setWeightDiff({ oldW: result.oldWeights, newW: result.newWeights });
    // Update local config form state with the new calibrated weights
    setAmountWeight(result.newWeights.amountAnomalyWeight);
    setLocationWeight(result.newWeights.locationDiscrepancyWeight);
    setVelocityWeight(result.newWeights.velocityWeight);
    setTimeWeight(result.newWeights.timeAnomalyWeight);
    setMerchantWeight(result.newWeights.merchantRiskWeight);
  };

  const handleGenerateReport = () => {
    const fraudRate = totalTransactionsCount > 0 ? ((cases.length / totalTransactionsCount) * 100).toFixed(2) : '0.00';
    const avgScore = cases.length > 0 ? (cases.reduce((acc, c) => acc + c.riskScore, 0) / cases.length).toFixed(3) : '0.000';
    const dateStr = new Date().toISOString();

    const lines: string[] = [
      '=========================================================================',
      '                 NEURALBANK AI FRAUD DETECTION AUDIT REPORT              ',
      '=========================================================================',
      `Report ID: REP-${Date.now()} | Timestamp: ${dateStr}`,
      `Total Transactions Analyzed : ${totalTransactionsCount}`,
      `Suspicious Cases Flagged    : ${cases.length}`,
      `Fraud Incidence Rate        : ${fraudRate}%`,
      `Average Flagged Risk Score  : ${avgScore}`,
      `Current Active Threshold    : ${config.fraudThreshold.toFixed(2)}`,
      '-------------------------------------------------------------------------',
      'DETECTED SUSPICIOUS CASES BREAKDOWN:',
      ''
    ];

    if (cases.length === 0) {
      lines.push('  [No suspicious cases recorded in the evaluation window]');
    } else {
      cases.forEach((c) => {
        lines.push(`* Case: ${c.caseId} | Tx: ${c.transaction.transactionId} | Amount: ₹${c.transaction.amount.toFixed(2)}`);
        lines.push(`  Risk Score: ${c.riskScore.toFixed(3)} (Threshold: ${c.thresholdAtEvaluation.toFixed(2)}) | Status: ${c.status}`);
        lines.push(`  Location  : ${c.transaction.location} | Category: ${c.transaction.merchantCategory}`);
        lines.push('  Forensic Triggers:');
        c.detectedReasons.forEach((r) => {
          lines.push(`    - ${r}`);
        });
        lines.push(`  Investigator Notes: ${c.investigatorNotes}`);
        lines.push('');
      });
    }

    lines.push('=========================================================================');
    lines.push('Certified by NeuralBank Risk Management Division · ISO-27001 Compliant');

    setGeneratedReportText(lines.join('\n'));
  };

  const filteredCases = cases.filter((c) => {
    if (statusFilter === 'ALL') return true;
    return c.status === statusFilter;
  });

  return (
    <div className="space-y-6">
      {/* Admin Dashboard Header */}
      <div className="rounded-xl border border-slate-800 bg-[#0c1220]/80 p-5 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold tracking-tight text-white flex items-center gap-2">
            Admin Fraud Management Console
          </h2>
          <p className="text-xs text-slate-400 mt-1">
            Logged in as <span className="text-violet-300 font-semibold">{adminName}</span> · Cyber Risk Division
          </p>
        </div>

        {/* 3 Simple Tab Controls strictly matching requirements */}
        <div className="flex items-center gap-1 p-1 bg-slate-900 border border-slate-800 rounded-lg">
          <button
            onClick={() => setSubTab('config')}
            className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-md transition-all ${
              subTab === 'config'
                ? 'bg-violet-600 text-white shadow-sm'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800'
            }`}
          >
            <Sliders className="w-3.5 h-3.5" />
            <span>Configuration Settings</span>
          </button>

          <button
            onClick={() => setSubTab('reports')}
            className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-md transition-all ${
              subTab === 'reports'
                ? 'bg-violet-600 text-white shadow-sm'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800'
            }`}
          >
            <FileText className="w-3.5 h-3.5" />
            <span>Detection Reports</span>
            <span className="font-mono text-[10px] bg-slate-950 px-1.5 rounded-full">
              {cases.length}
            </span>
          </button>

          <button
            onClick={() => setSubTab('algorithm')}
            className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-md transition-all ${
              subTab === 'algorithm'
                ? 'bg-violet-600 text-white shadow-sm'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800'
            }`}
          >
            <Cpu className="w-3.5 h-3.5" />
            <span>Algorithm Management</span>
          </button>
        </div>
      </div>

      {/* ------------------------------------------------------------- */}
      {/* 1. CONFIGURATION SETTINGS */}
      {/* ------------------------------------------------------------- */}
      {subTab === 'config' && (
        <div className="space-y-6">
          <div className="rounded-xl border border-slate-800 bg-[#0d1424] p-6 shadow-xl">
            <div className="border-b border-slate-800 pb-4 mb-6 flex items-center justify-between">
              <div>
                <h3 className="text-base font-semibold text-slate-100 flex items-center gap-2">
                  <Sliders className="w-4 h-4 text-violet-400" />
                  System Configuration & Detection Thresholds
                </h3>
                <p className="text-xs text-slate-400 mt-1">
                  Adjust the neural risk scoring boundaries and individual algorithmic feature weights.
                </p>
              </div>
              <div className="text-right text-xs text-slate-400">
                <span>Last Updated: </span>
                <span className="text-slate-200 font-mono">
                  {new Date(config.lastUpdatedAt).toLocaleTimeString()}
                </span>
              </div>
            </div>

            {/* Confirmation Banner */}
            {configConfirmation && (
              <div className="mb-5 rounded-lg border border-emerald-600/60 bg-emerald-950/40 p-4 flex items-start gap-3 text-emerald-300 text-xs">
                <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0 mt-0.5" />
                <div className="space-y-1">
                  <p className="font-semibold text-emerald-200">Configuration Update Confirmed</p>
                  <p>{configConfirmation}</p>
                </div>
              </div>
            )}

            {/* Error Banner */}
            {configError && (
              <div className="mb-5 rounded-lg border border-red-600/60 bg-red-950/40 p-4 flex items-start gap-3 text-red-300 text-xs">
                <AlertTriangle className="w-5 h-5 text-red-400 shrink-0 mt-0.5" />
                <div className="space-y-1">
                  <p className="font-semibold text-red-200">Validation Error</p>
                  <p>{configError}</p>
                </div>
              </div>
            )}

            <form onSubmit={handleSaveConfiguration} className="space-y-6">
              {/* Primary Fraud Threshold */}
              <div className="rounded-lg border border-slate-800/80 bg-slate-900/60 p-5 space-y-3">
                <div className="flex items-center justify-between">
                  <div>
                    <label className="text-sm font-semibold text-slate-200 block">
                      Fraud Detection Risk Threshold
                    </label>
                    <p className="text-xs text-slate-400 mt-0.5">
                      Risk scores above this value trigger suspicious classification and auto-generate fraud cases.
                    </p>
                  </div>
                  <div className="text-right">
                    <span className="font-mono text-2xl font-bold text-violet-400 tabular-nums">
                      {threshold.toFixed(2)}
                    </span>
                    <span className="text-[11px] text-slate-500 block">Range: 0.10 - 0.95</span>
                  </div>
                </div>

                <div className="flex items-center gap-4">
                  <span className="text-xs font-mono text-slate-400">0.10</span>
                  <input
                    type="range"
                    min="0.10"
                    max="0.95"
                    step="0.01"
                    value={threshold}
                    onChange={(e) => setThreshold(parseFloat(e.target.value))}
                    className="w-full accent-violet-500"
                  />
                  <span className="text-xs font-mono text-slate-400">0.95</span>
                </div>

                <div className="flex items-center justify-between text-[11px] text-slate-400 pt-1">
                  <span>← More Sensitive (Higher False Positives)</span>
                  <span>More Strict (Fewer Flagged Cases) →</span>
                </div>
              </div>

              {/* Algorithm Feature Weights */}
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <h4 className="text-sm font-semibold text-slate-200">
                      Algorithm Feature Weights (w_1 ... w_5)
                    </h4>
                    <p className="text-xs text-slate-400">
                      Linear combination coefficients for the neural logit formula: <span className="font-mono text-cyan-300">z = Σ w_i · x_i</span>
                    </p>
                  </div>

                  <div className="flex items-center gap-3">
                    <div className="text-right">
                      <span className="text-[11px] text-slate-400 block">Weights Sum</span>
                      <span
                        className={`font-mono text-xs font-bold ${
                          isWeightsSumValid ? 'text-emerald-400' : 'text-red-400'
                        }`}
                      >
                        {weightsSum.toFixed(3)} / 1.000
                      </span>
                    </div>

                    {!isWeightsSumValid && (
                      <button
                        type="button"
                        onClick={handleNormalizeWeights}
                        className="px-2.5 py-1 text-xs rounded bg-slate-800 hover:bg-slate-700 text-slate-200 transition-colors"
                      >
                        Normalize to 1.0
                      </button>
                    )}
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {/* Weight 1 */}
                  <div className="p-3.5 rounded-lg border border-slate-800 bg-slate-900/40 space-y-2">
                    <div className="flex justify-between text-xs">
                      <span className="font-medium text-slate-300">Amount Anomaly Weight</span>
                      <span className="font-mono text-cyan-300 font-semibold">{amountWeight.toFixed(3)}</span>
                    </div>
                    <input
                      type="range"
                      min="0.0"
                      max="0.60"
                      step="0.01"
                      value={amountWeight}
                      onChange={(e) => setAmountWeight(parseFloat(e.target.value))}
                      className="w-full accent-cyan-400"
                    />
                    <p className="text-[10px] text-slate-400">Impact of deviation from user 30-day baseline spend</p>
                  </div>

                  {/* Weight 2 */}
                  <div className="p-3.5 rounded-lg border border-slate-800 bg-slate-900/40 space-y-2">
                    <div className="flex justify-between text-xs">
                      <span className="font-medium text-slate-300">Location Discrepancy Weight</span>
                      <span className="font-mono text-indigo-300 font-semibold">{locationWeight.toFixed(3)}</span>
                    </div>
                    <input
                      type="range"
                      min="0.0"
                      max="0.60"
                      step="0.01"
                      value={locationWeight}
                      onChange={(e) => setLocationWeight(parseFloat(e.target.value))}
                      className="w-full accent-indigo-400"
                    />
                    <p className="text-[10px] text-slate-400">Impact of cross-border / anonymous proxy IP geolocation</p>
                  </div>

                  {/* Weight 3 */}
                  <div className="p-3.5 rounded-lg border border-slate-800 bg-slate-900/40 space-y-2">
                    <div className="flex justify-between text-xs">
                      <span className="font-medium text-slate-300">Velocity Burst Weight</span>
                      <span className="font-mono text-violet-300 font-semibold">{velocityWeight.toFixed(3)}</span>
                    </div>
                    <input
                      type="range"
                      min="0.0"
                      max="0.60"
                      step="0.01"
                      value={velocityWeight}
                      onChange={(e) => setVelocityWeight(parseFloat(e.target.value))}
                      className="w-full accent-violet-400"
                    />
                    <p className="text-[10px] text-slate-400">Impact of multiple transactions in 10-minute sliding window</p>
                  </div>

                  {/* Weight 4 */}
                  <div className="p-3.5 rounded-lg border border-slate-800 bg-slate-900/40 space-y-2">
                    <div className="flex justify-between text-xs">
                      <span className="font-medium text-slate-300">Off-Hours Time Weight</span>
                      <span className="font-mono text-purple-300 font-semibold">{timeWeight.toFixed(3)}</span>
                    </div>
                    <input
                      type="range"
                      min="0.0"
                      max="0.60"
                      step="0.01"
                      value={timeWeight}
                      onChange={(e) => setTimeWeight(parseFloat(e.target.value))}
                      className="w-full accent-purple-400"
                    />
                    <p className="text-[10px] text-slate-400">Impact of execution during user dormant hours (02:00 - 05:00)</p>
                  </div>

                  {/* Weight 5 */}
                  <div className="p-3.5 rounded-lg border border-slate-800 bg-slate-900/40 space-y-2 md:col-span-2">
                    <div className="flex justify-between text-xs">
                      <span className="font-medium text-slate-300">Merchant Category Risk Weight</span>
                      <span className="font-mono text-sky-300 font-semibold">{merchantWeight.toFixed(3)}</span>
                    </div>
                    <input
                      type="range"
                      min="0.0"
                      max="0.40"
                      step="0.01"
                      value={merchantWeight}
                      onChange={(e) => setMerchantWeight(parseFloat(e.target.value))}
                      className="w-full accent-sky-400"
                    />
                    <p className="text-[10px] text-slate-400">Impact of high-risk merchant categories (crypto exchanges, wire remittance, luxury jewelry)</p>
                  </div>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="pt-4 border-t border-slate-800 flex items-center justify-between">
                <button
                  type="button"
                  onClick={() => {
                    setThreshold(0.65);
                    setAmountWeight(0.30);
                    setLocationWeight(0.25);
                    setVelocityWeight(0.20);
                    setTimeWeight(0.15);
                    setMerchantWeight(0.10);
                  }}
                  className="px-3.5 py-2 text-xs font-medium text-slate-400 hover:text-slate-200 transition-colors"
                >
                  Reset Defaults
                </button>

                <button
                  type="submit"
                  className="px-5 py-2.5 rounded-lg bg-violet-600 hover:bg-violet-500 text-white text-xs font-semibold shadow-lg shadow-violet-700/20 flex items-center gap-2 transition-all"
                >
                  <Save className="w-4 h-4" />
                  <span>Validate and Save Configuration</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ------------------------------------------------------------- */}
      {/* 2. DETECTION REPORTS */}
      {/* ------------------------------------------------------------- */}
      {subTab === 'reports' && (
        <div className="space-y-6">
          {/* Summary Metric Cards */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="p-4 rounded-xl border border-slate-800 bg-[#0d1424]">
              <span className="text-xs text-slate-400">Total Analyzed</span>
              <p className="text-2xl font-bold font-mono text-slate-100 mt-1 tabular-nums">
                {totalTransactionsCount}
              </p>
              <span className="text-[10px] text-slate-500 mt-1 block">Financial events</span>
            </div>

            <div className="p-4 rounded-xl border border-slate-800 bg-[#0d1424]">
              <span className="text-xs text-slate-400">Suspicious Flagged</span>
              <p className="text-2xl font-bold font-mono text-red-400 mt-1 tabular-nums">
                {cases.length}
              </p>
              <span className="text-[10px] text-red-400/70 mt-1 block">Threshold breached</span>
            </div>

            <div className="p-4 rounded-xl border border-slate-800 bg-[#0d1424]">
              <span className="text-xs text-slate-400">Fraud Incidence Rate</span>
              <p className="text-2xl font-bold font-mono text-amber-400 mt-1 tabular-nums">
                {totalTransactionsCount > 0 ? ((cases.length / totalTransactionsCount) * 100).toFixed(1) : '0.0'}%
              </p>
              <span className="text-[10px] text-slate-500 mt-1 block">Of total screened</span>
            </div>

            <div className="p-4 rounded-xl border border-slate-800 bg-[#0d1424]">
              <span className="text-xs text-slate-400">Active Threshold</span>
              <p className="text-2xl font-bold font-mono text-violet-400 mt-1 tabular-nums">
                {config.fraudThreshold.toFixed(2)}
              </p>
              <span className="text-[10px] text-slate-500 mt-1 block">Configured limit</span>
            </div>
          </div>

          {/* Detected Cases Table */}
          <div className="rounded-xl border border-slate-800 bg-[#0d1424] p-5 shadow-xl">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-4">
              <div>
                <h3 className="text-base font-semibold text-slate-100">
                  Detected Suspicious & Fraudulent Cases
                </h3>
                <p className="text-xs text-slate-400 mt-0.5">
                  Detailed registry of transactions exceeding detection threshold ({config.fraudThreshold.toFixed(2)})
                </p>
              </div>

              <div className="flex items-center gap-2.5 flex-wrap">
                {/* Status Filter */}
                <select
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value)}
                  className="bg-slate-900 border border-slate-700 rounded-lg px-2.5 py-1.5 text-xs text-slate-200"
                >
                  <option value="ALL">All Statuses ({cases.length})</option>
                  <option value="PENDING_REVIEW">Pending Review</option>
                  <option value="CONFIRMED_FRAUD">Confirmed Fraud</option>
                  <option value="FALSE_POSITIVE">False Positive</option>
                </select>

                <button
                  onClick={() => exportFraudCasesToCSV(filteredCases)}
                  className="px-3 py-1.5 text-xs font-semibold rounded-lg bg-emerald-950/80 hover:bg-emerald-900 text-emerald-300 border border-emerald-700/60 shadow-sm flex items-center gap-1.5 transition-colors"
                  title="Download detected fraud cases report as a CSV file for offline audits"
                >
                  <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-400" />
                  <span>Download CSV ({filteredCases.length})</span>
                </button>

                <button
                  onClick={handleGenerateReport}
                  className="px-3.5 py-1.5 text-xs font-semibold rounded-lg bg-violet-600 hover:bg-violet-500 text-white flex items-center gap-1.5 transition-colors"
                >
                  <FileText className="w-3.5 h-3.5" />
                  <span>Generate Audit Report</span>
                </button>
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="border-b border-slate-800 text-slate-400 font-medium">
                    <th className="py-2.5 px-3">Case ID</th>
                    <th className="py-2.5 px-3">Transaction ID</th>
                    <th className="py-2.5 px-3">Account</th>
                    <th className="py-2.5 px-3 text-right">Amount (₹)</th>
                    <th className="py-2.5 px-3 text-right">Risk Score</th>
                    <th className="py-2.5 px-3">Status</th>
                    <th className="py-2.5 px-3 text-right">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60 font-mono">
                  {filteredCases.map((fc) => (
                    <tr key={fc.caseId} className="hover:bg-slate-800/30 transition-colors">
                      <td className="py-2.5 px-3 font-semibold text-violet-300">
                        {fc.caseId}
                      </td>
                      <td className="py-2.5 px-3 text-slate-200">
                        {fc.transaction.transactionId}
                      </td>
                      <td className="py-2.5 px-3 text-slate-300 font-sans">
                        {fc.transaction.userId}
                      </td>
                      <td className="py-2.5 px-3 text-right font-semibold text-slate-100 tabular-nums">
                        ₹{fc.transaction.amount.toFixed(2)}
                      </td>
                      <td className="py-2.5 px-3 text-right font-bold text-red-400 tabular-nums">
                        {fc.riskScore.toFixed(3)}
                      </td>
                      <td className="py-2.5 px-3 font-sans">
                        <span
                          className={`inline-block px-2 py-0.5 rounded text-[10px] font-semibold ${
                            fc.status === 'CONFIRMED_FRAUD'
                              ? 'bg-red-950 text-red-300 border border-red-800'
                              : fc.status === 'FALSE_POSITIVE'
                              ? 'bg-emerald-950 text-emerald-300 border border-emerald-800'
                              : 'bg-amber-950 text-amber-300 border border-amber-800'
                          }`}
                        >
                          {fc.status.replace(/_/g, ' ')}
                        </span>
                      </td>
                      <td className="py-2.5 px-3 text-right font-sans">
                        <button
                          onClick={() => {
                            setSelectedCase(fc);
                            setInvestigatorNoteInput(fc.investigatorNotes);
                          }}
                          className="px-2.5 py-1 text-xs rounded bg-slate-800 hover:bg-slate-700 text-slate-200 inline-flex items-center gap-1 transition-colors"
                        >
                          <Eye className="w-3 h-3 text-cyan-400" />
                          <span>Drill Down</span>
                        </button>
                      </td>
                    </tr>
                  ))}
                  {filteredCases.length === 0 && (
                    <tr>
                      <td colSpan={7} className="py-8 text-center text-slate-500 font-sans">
                        No detected cases matching the current filter.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* ------------------------------------------------------------- */}
      {/* 3. ALGORITHM MANAGEMENT */}
      {/* ------------------------------------------------------------- */}
      {subTab === 'algorithm' && (
        <div className="space-y-6">
          {/* Model Information & Architecture Card */}
          <div className="rounded-xl border border-slate-800 bg-[#0d1424] p-6 shadow-xl">
            <div className="flex items-center justify-between border-b border-slate-800 pb-4 mb-5">
              <div>
                <h3 className="text-base font-semibold text-slate-100 flex items-center gap-2">
                  <Cpu className="w-4 h-4 text-cyan-400" />
                  Active Model Information & Topology
                </h3>
                <p className="text-xs text-slate-400 mt-0.5">
                  Production machine learning model specification and inference configuration
                </p>
              </div>
              <span className="text-[11px] font-mono text-emerald-400 bg-emerald-950/80 border border-emerald-800/60 px-2 py-0.5 rounded">
                Status: ONLINE
              </span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs">
              <div className="p-3 rounded-lg border border-slate-800 bg-slate-900/60 space-y-1">
                <span className="text-slate-400">Model Identifier</span>
                <p className="font-mono font-semibold text-slate-200">{performanceData.modelName}</p>
                <span className="text-[10px] text-slate-500 font-mono">Version: {performanceData.modelVersion}</span>
              </div>

              <div className="p-3 rounded-lg border border-slate-800 bg-slate-900/60 space-y-1">
                <span className="text-slate-400">Algorithm Family</span>
                <p className="font-mono font-semibold text-slate-200">{performanceData.algorithmType}</p>
                <span className="text-[10px] text-slate-500 font-mono">Sigmoidal Logistic Unit</span>
              </div>

              <div className="p-3 rounded-lg border border-slate-800 bg-slate-900/60 space-y-1">
                <span className="text-slate-400">Last Calibrated</span>
                <p className="font-mono font-semibold text-slate-200">
                  {new Date(performanceData.lastRetrainedAt).toLocaleDateString()} {new Date(performanceData.lastRetrainedAt).toLocaleTimeString()}
                </p>
                <span className="text-[10px] text-slate-500 font-mono">Trigger: Feedback Loop</span>
              </div>
            </div>

            {/* Performance Telemetry: Confusion Matrix & Metrics */}
            <div className="mt-6 pt-5 border-t border-slate-800 space-y-4">
              <h4 className="text-sm font-semibold text-slate-200">
                System Performance Data & Evaluation Metrics
              </h4>

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                <div className="p-3.5 rounded-lg border border-slate-800 bg-slate-900/40 text-center">
                  <span className="text-[11px] text-slate-400 uppercase tracking-wider block">Accuracy</span>
                  <span className="font-mono text-2xl font-bold text-emerald-400 tabular-nums">
                    {performanceData.accuracy}%
                  </span>
                  <span className="text-[10px] text-slate-500 block mt-0.5">Overall correctness</span>
                </div>

                <div className="p-3.5 rounded-lg border border-slate-800 bg-slate-900/40 text-center">
                  <span className="text-[11px] text-slate-400 uppercase tracking-wider block">Precision</span>
                  <span className="font-mono text-2xl font-bold text-cyan-400 tabular-nums">
                    {performanceData.precision}%
                  </span>
                  <span className="text-[10px] text-slate-500 block mt-0.5">TP / (TP + FP)</span>
                </div>

                <div className="p-3.5 rounded-lg border border-slate-800 bg-slate-900/40 text-center">
                  <span className="text-[11px] text-slate-400 uppercase tracking-wider block">Recall</span>
                  <span className="font-mono text-2xl font-bold text-violet-400 tabular-nums">
                    {performanceData.recall}%
                  </span>
                  <span className="text-[10px] text-slate-500 block mt-0.5">TP / (TP + FN)</span>
                </div>

                <div className="p-3.5 rounded-lg border border-slate-800 bg-slate-900/40 text-center">
                  <span className="text-[11px] text-slate-400 uppercase tracking-wider block">F1-Score</span>
                  <span className="font-mono text-2xl font-bold text-indigo-400 tabular-nums">
                    {performanceData.f1Score}%
                  </span>
                  <span className="text-[10px] text-slate-500 block mt-0.5">Harmonic mean</span>
                </div>
              </div>

              {/* Confusion Matrix Table */}
              <div className="rounded-lg border border-slate-800 bg-slate-900/40 p-4 text-xs">
                <div className="text-slate-300 font-semibold mb-2 flex items-center justify-between">
                  <span>Confusion Matrix Telemetry</span>
                  <span className="font-mono text-slate-500 text-[11px]">
                    Total: {performanceData.totalEvaluated} events
                  </span>
                </div>
                <div className="grid grid-cols-2 gap-2 text-center font-mono">
                  <div className="p-2.5 rounded bg-emerald-950/40 border border-emerald-900/50">
                    <span className="text-[10px] text-emerald-400 block font-sans">True Positives (Detected Fraud)</span>
                    <span className="text-base font-bold text-emerald-300">{performanceData.truePositives}</span>
                  </div>
                  <div className="p-2.5 rounded bg-red-950/40 border border-red-900/50">
                    <span className="text-[10px] text-red-400 block font-sans">False Positives (Benign Flagged)</span>
                    <span className="text-base font-bold text-red-300">{performanceData.falsePositives}</span>
                  </div>
                  <div className="p-2.5 rounded bg-red-950/40 border border-red-900/50">
                    <span className="text-[10px] text-red-400 block font-sans">False Negatives (Missed Fraud)</span>
                    <span className="text-base font-bold text-red-300">{performanceData.falseNegatives}</span>
                  </div>
                  <div className="p-2.5 rounded bg-emerald-950/40 border border-emerald-900/50">
                    <span className="text-[10px] text-emerald-400 block font-sans">True Negatives (Correct Cleared)</span>
                    <span className="text-base font-bold text-emerald-300">{performanceData.trueNegatives}</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Algorithm Refinement & Parameter Update Section */}
            <div className="mt-6 pt-5 border-t border-slate-800 space-y-4">
              <div>
                <h4 className="text-sm font-semibold text-slate-200 flex items-center gap-2">
                  <RefreshCw className="w-4 h-4 text-violet-400" />
                  Algorithm Updates & Refinement Engine
                </h4>
                <p className="text-xs text-slate-400 mt-0.5">
                  Use system performance data and confirmed/false-positive feedback to automatically recalibrate feature weights.
                </p>
              </div>

              {refineFeedback && (
                <div className="p-3.5 rounded-lg border border-cyan-600/60 bg-cyan-950/40 text-cyan-300 text-xs flex items-start gap-2.5">
                  <CheckCircle2 className="w-4 h-4 text-cyan-400 shrink-0 mt-0.5" />
                  <div>
                    <p className="font-semibold text-cyan-200">Algorithm Recalibration Complete</p>
                    <p>{refineFeedback}</p>
                  </div>
                </div>
              )}

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
                <div>
                  <label className="block text-slate-300 font-medium mb-1">
                    Learning Rate η ({learningRate.toFixed(2)})
                  </label>
                  <input
                    type="range"
                    min="0.01"
                    max="0.20"
                    step="0.01"
                    value={learningRate}
                    onChange={(e) => setLearningRate(parseFloat(e.target.value))}
                    className="w-full accent-violet-500"
                  />
                  <span className="text-[10px] text-slate-500 block mt-1">Controls gradient step size per feedback iteration</span>
                </div>

                <div>
                  <label className="block text-slate-300 font-medium mb-1">
                    Feedback Batch Size ({iterations} iterations)
                  </label>
                  <input
                    type="range"
                    min="5"
                    max="50"
                    step="5"
                    value={iterations}
                    onChange={(e) => setIterations(parseInt(e.target.value))}
                    className="w-full accent-violet-500"
                  />
                  <span className="text-[10px] text-slate-500 block mt-1">Number of confirmed case outcomes used for weight refinement</span>
                </div>
              </div>

              {weightDiff && (
                <div className="p-3.5 rounded-lg border border-slate-800 bg-slate-900/50 text-xs space-y-2">
                  <span className="text-slate-300 font-semibold block">Weight Adjustments Applied:</span>
                  <div className="grid grid-cols-2 sm:grid-cols-5 gap-2 font-mono">
                    <div className="p-2 rounded bg-slate-800/80">
                      <span className="text-[10px] text-slate-400 block font-sans">Amount Anomaly</span>
                      <span className="text-slate-400 line-through mr-1.5">{weightDiff.oldW.amountAnomalyWeight.toFixed(3)}</span>
                      <span className="text-cyan-300 font-bold">{weightDiff.newW.amountAnomalyWeight.toFixed(3)}</span>
                    </div>
                    <div className="p-2 rounded bg-slate-800/80">
                      <span className="text-[10px] text-slate-400 block font-sans">Location Risk</span>
                      <span className="text-slate-400 line-through mr-1.5">{weightDiff.oldW.locationDiscrepancyWeight.toFixed(3)}</span>
                      <span className="text-indigo-300 font-bold">{weightDiff.newW.locationDiscrepancyWeight.toFixed(3)}</span>
                    </div>
                    <div className="p-2 rounded bg-slate-800/80">
                      <span className="text-[10px] text-slate-400 block font-sans">Velocity Burst</span>
                      <span className="text-slate-400 line-through mr-1.5">{weightDiff.oldW.velocityWeight.toFixed(3)}</span>
                      <span className="text-violet-300 font-bold">{weightDiff.newW.velocityWeight.toFixed(3)}</span>
                    </div>
                    <div className="p-2 rounded bg-slate-800/80">
                      <span className="text-[10px] text-slate-400 block font-sans">Off-Hours Time</span>
                      <span className="text-slate-400 line-through mr-1.5">{weightDiff.oldW.timeAnomalyWeight.toFixed(3)}</span>
                      <span className="text-purple-300 font-bold">{weightDiff.newW.timeAnomalyWeight.toFixed(3)}</span>
                    </div>
                    <div className="p-2 rounded bg-slate-800/80">
                      <span className="text-[10px] text-slate-400 block font-sans">Merchant Risk</span>
                      <span className="text-slate-400 line-through mr-1.5">{weightDiff.oldW.merchantRiskWeight.toFixed(3)}</span>
                      <span className="text-sky-300 font-bold">{weightDiff.newW.merchantRiskWeight.toFixed(3)}</span>
                    </div>
                  </div>
                </div>
              )}

              <button
                type="button"
                onClick={handleRefineSubmit}
                className="w-full sm:w-auto px-5 py-2.5 rounded-lg bg-gradient-to-r from-violet-600 to-indigo-600 hover:from-violet-500 hover:to-indigo-500 text-white text-xs font-semibold shadow-md flex items-center justify-center gap-2 transition-all"
              >
                <RefreshCw className="w-3.5 h-3.5" />
                <span>Refine Algorithm with Performance Data</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Drill-down Modal for Case Details */}
      {selectedCase && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4">
          <div className="w-full max-w-xl rounded-xl border border-slate-700 bg-[#0d1424] p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div>
                <h4 className="text-base font-bold text-slate-100 flex items-center gap-2">
                  <span className="text-violet-400 font-mono">{selectedCase.caseId}</span>
                  <span>Forensic Case Investigation</span>
                </h4>
                <p className="text-xs text-slate-400">
                  Detected on {new Date(selectedCase.createdAt).toLocaleString()}
                </p>
              </div>
              <button
                onClick={() => setSelectedCase(null)}
                className="text-slate-400 hover:text-white p-1 rounded-lg"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Transaction specs */}
            <div className="grid grid-cols-2 gap-3 text-xs font-mono">
              <div className="p-2.5 rounded bg-slate-900 border border-slate-800">
                <span className="text-slate-400 block text-[10px] font-sans">Transaction ID</span>
                <span className="text-slate-200 font-semibold">{selectedCase.transaction.transactionId}</span>
              </div>
              <div className="p-2.5 rounded bg-slate-900 border border-slate-800">
                <span className="text-slate-400 block text-[10px] font-sans">Account Holder</span>
                <span className="text-slate-200 font-semibold">{selectedCase.transaction.userId}</span>
              </div>
              <div className="p-2.5 rounded bg-slate-900 border border-slate-800">
                <span className="text-slate-400 block text-[10px] font-sans">Amount</span>
                <span className="text-emerald-300 font-bold">₹{selectedCase.transaction.amount.toFixed(2)}</span>
              </div>
              <div className="p-2.5 rounded bg-slate-900 border border-slate-800">
                <span className="text-slate-400 block text-[10px] font-sans">Risk Score vs Threshold</span>
                <span className="text-red-400 font-bold">
                  {selectedCase.riskScore.toFixed(3)} &gt; {selectedCase.thresholdAtEvaluation.toFixed(2)}
                </span>
              </div>
            </div>

            {/* Triggers list */}
            <div className="space-y-1.5">
              <span className="text-xs font-semibold text-slate-300">Forensic Triggers Detected:</span>
              <ul className="space-y-1 bg-red-950/30 border border-red-900/40 p-3 rounded-lg">
                {selectedCase.detectedReasons.map((r, i) => (
                  <li key={i} className="text-xs text-red-200/90 flex items-start gap-1.5">
                    <span className="text-red-400">›</span>
                    <span>{r}</span>
                  </li>
                ))}
              </ul>
            </div>

            {/* Status change & investigator notes */}
            <div className="space-y-3 pt-2 border-t border-slate-800">
              <div className="flex items-center justify-between">
                <label className="text-xs font-semibold text-slate-300">Update Case Status:</label>
                <div className="flex gap-1.5">
                  {(['PENDING_REVIEW', 'CONFIRMED_FRAUD', 'FALSE_POSITIVE'] as const).map((st) => (
                    <button
                      key={st}
                      type="button"
                      onClick={() => onUpdateCaseStatus(selectedCase.caseId, st, investigatorNoteInput)}
                      className={`px-2.5 py-1 text-[11px] rounded font-medium transition-colors ${
                        selectedCase.status === st
                          ? 'bg-violet-600 text-white font-semibold'
                          : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
                      }`}
                    >
                      {st.replace(/_/g, ' ')}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-400 mb-1">
                  Investigator Notes:
                </label>
                <textarea
                  value={investigatorNoteInput}
                  onChange={(e) => setInvestigatorNoteInput(e.target.value)}
                  rows={2}
                  className="w-full bg-[#080d18] border border-slate-700 rounded-lg p-2 text-xs text-slate-100"
                />
              </div>
            </div>

            <div className="flex justify-end pt-2">
              <button
                type="button"
                onClick={() => {
                  onUpdateCaseStatus(selectedCase.caseId, selectedCase.status, investigatorNoteInput);
                  setSelectedCase(null);
                }}
                className="px-4 py-2 rounded-lg bg-violet-600 hover:bg-violet-500 text-white text-xs font-semibold"
              >
                Save & Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Generated Report Modal */}
      {generatedReportText && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4">
          <div className="w-full max-w-2xl rounded-xl border border-slate-700 bg-[#0d1424] p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div>
                <h4 className="text-base font-bold text-slate-100 flex items-center gap-2">
                  <FileText className="w-4 h-4 text-violet-400" />
                  Official Fraud Detection Audit Report
                </h4>
                <p className="text-xs text-slate-400">
                  Formatted compliance export generated by NeuralBank Risk Engine
                </p>
              </div>
              <button
                onClick={() => setGeneratedReportText(null)}
                className="text-slate-400 hover:text-white p-1 rounded-lg"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <pre className="p-4 rounded-lg bg-slate-950 border border-slate-800 text-[11px] text-slate-300 font-mono overflow-auto max-h-96 whitespace-pre">
              {generatedReportText}
            </pre>

            <div className="flex flex-wrap justify-end gap-2.5 pt-2">
              <button
                onClick={() => {
                  navigator.clipboard.writeText(generatedReportText);
                  alert('Report copied to clipboard.');
                }}
                className="px-3.5 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-medium"
              >
                Copy to Clipboard
              </button>

              <button
                onClick={() => exportFraudCasesToCSV(cases)}
                className="px-3.5 py-1.5 rounded-lg bg-emerald-950 hover:bg-emerald-900 text-emerald-200 border border-emerald-700/80 text-xs font-semibold flex items-center gap-1.5 shadow-sm transition-colors"
                title="Download complete fraud cases dataset as CSV file for offline audits"
              >
                <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-400" />
                <span>Download Audit CSV (.csv)</span>
              </button>

              <button
                onClick={() => {
                  const blob = new Blob([generatedReportText], { type: 'text/plain;charset=utf-8' });
                  const url = URL.createObjectURL(blob);
                  const link = document.createElement('a');
                  link.href = url;
                  link.download = `NeuralBank-Detection-Report-${Date.now()}.txt`;
                  link.click();
                  URL.revokeObjectURL(url);
                }}
                className="px-4 py-1.5 rounded-lg bg-violet-600 hover:bg-violet-500 text-white text-xs font-semibold flex items-center gap-1.5"
              >
                <Download className="w-3.5 h-3.5" />
                <span>Download Summary (.txt)</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
