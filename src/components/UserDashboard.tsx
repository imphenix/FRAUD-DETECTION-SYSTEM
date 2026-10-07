import React, { useState } from 'react';
import { 
  TransactionData, 
  TransactionEvaluationResult, 
  UserProfile, 
  SystemConfiguration,
  TransactionChannel,
  MerchantCategory
} from '../types/fraud';
import { sampleNormalTx, sampleSuspiciousTx, defaultUsers } from '../services/fraudDetectionEngine';
import { NeuralNetworkVisualizer } from './NeuralNetworkVisualizer';
import { 
  ShieldCheck, 
  AlertOctagon, 
  ArrowRight, 
  Sparkles, 
  RotateCcw, 
  MapPin, 
  Clock, 
  IndianRupee, 
  Activity, 
  CreditCard 
} from 'lucide-react';

interface UserDashboardProps {
  onEvaluate: (tx: TransactionData) => TransactionEvaluationResult;
  config: SystemConfiguration;
  lastResult: TransactionEvaluationResult | null;
  history: TransactionData[];
}

export const UserDashboard: React.FC<UserDashboardProps> = ({
  onEvaluate,
  config,
  lastResult,
  history
}) => {
  const [selectedUser, setSelectedUser] = useState<UserProfile>(defaultUsers[0]);
  const [amount, setAmount] = useState<number>(42.50);
  const [hourOfDay, setHourOfDay] = useState<number>(12);
  const [location, setLocation] = useState<string>('San Francisco, CA (Home)');
  const [channel, setChannel] = useState<TransactionChannel>('MOBILE_APP');
  const [merchantCategory, setMerchantCategory] = useState<MerchantCategory>('GROCERY_ESSENTIALS');
  const [velocityWindowCount, setVelocityWindowCount] = useState<number>(1);
  const [customAvgSpend, setCustomAvgSpend] = useState<number>(45.00);
  const [isAnalyzing, setIsAnalyzing] = useState<boolean>(false);
  const [evaluation, setEvaluation] = useState<TransactionEvaluationResult | null>(lastResult);

  const handleUserChange = (userId: string) => {
    const user = defaultUsers.find(u => u.userId === userId) || defaultUsers[0];
    setSelectedUser(user);
    setCustomAvgSpend(user.historicalAvgAmount);
  };

  const handleLoadSample = (sample: TransactionData) => {
    setAmount(sample.amount);
    setHourOfDay(sample.hourOfDay);
    setLocation(sample.location);
    setChannel(sample.channel);
    setMerchantCategory(sample.merchantCategory);
    setVelocityWindowCount(sample.velocityWindowCount);
    setCustomAvgSpend(sample.userHistoricalAvg);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setIsAnalyzing(true);

    const tx: TransactionData = {
      transactionId: `TX-${Math.floor(10000 + Math.random() * 90000)}`,
      userId: selectedUser.userId,
      amount: Number(amount),
      timestamp: new Date().toISOString(),
      hourOfDay: Number(hourOfDay),
      location: location.trim(),
      channel,
      merchantCategory,
      velocityWindowCount: Number(velocityWindowCount),
      userHistoricalAvg: Number(customAvgSpend)
    };

    setTimeout(() => {
      const res = onEvaluate(tx);
      setEvaluation(res);
      setIsAnalyzing(false);
    }, 350);
  };

  return (
    <div className="space-y-6">
      {/* Top Banner / User Bar */}
      <div className="rounded-xl border border-slate-800 bg-[#0c1220]/80 p-5 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold tracking-tight text-white flex items-center gap-2">
            User Transaction Monitoring
          </h2>
          <p className="text-xs text-slate-400 mt-1">
            Submit financial transactions to the autonomous AI fraud detection model for instant risk analysis.
          </p>
        </div>

        {/* Quick Sample Buttons */}
        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-xs text-slate-400 mr-1 hidden sm:inline">Pre-built Scenarios:</span>
          <button
            type="button"
            onClick={() => handleLoadSample(sampleNormalTx)}
            className="px-3 py-1.5 text-xs font-medium rounded-lg bg-emerald-950/60 text-emerald-300 border border-emerald-800/60 hover:bg-emerald-900/60 transition-colors flex items-center gap-1.5"
          >
            <ShieldCheck className="w-3.5 h-3.5" />
            <span>Load Sample Normal</span>
          </button>

          <button
            type="button"
            onClick={() => handleLoadSample(sampleSuspiciousTx)}
            className="px-3 py-1.5 text-xs font-medium rounded-lg bg-red-950/60 text-red-300 border border-red-800/60 hover:bg-red-900/60 transition-colors flex items-center gap-1.5"
          >
            <AlertOctagon className="w-3.5 h-3.5" />
            <span>Load Sample Suspicious</span>
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Column: Transaction Input Form */}
        <div className="lg:col-span-7 space-y-6">
          <div className="rounded-xl border border-slate-800 bg-[#0d1424] p-6 shadow-xl">
            <div className="flex items-center justify-between border-b border-slate-800 pb-4 mb-5">
              <div>
                <h3 className="text-base font-semibold text-slate-100 flex items-center gap-2">
                  <CreditCard className="w-4 h-4 text-cyan-400" />
                  Transaction Details Entry
                </h3>
                <p className="text-xs text-slate-400 mt-0.5">
                  Parameters will be evaluated against active threshold ({config.fraudThreshold.toFixed(2)})
                </p>
              </div>
              <span className="text-[11px] font-mono text-cyan-400 bg-cyan-950/60 border border-cyan-800/40 px-2 py-0.5 rounded">
                Live Ingestion
              </span>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              {/* User Selection & Account Profile */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-medium text-slate-300 mb-1.5">
                    Account Holder
                  </label>
                  <select
                    value={selectedUser.userId}
                    onChange={(e) => handleUserChange(e.target.value)}
                    className="w-full bg-[#080d18] border border-slate-700/80 rounded-lg px-3 py-2 text-xs text-slate-100 focus:outline-none focus:border-cyan-500 transition-colors"
                  >
                    {defaultUsers.map((u) => (
                      <option key={u.userId} value={u.userId}>
                        {u.name} ({u.userId})
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-medium text-slate-300 mb-1.5">
                    30-Day Historical Average Spend (₹)
                  </label>
                  <input
                    type="number"
                    min="1"
                    step="0.01"
                    value={customAvgSpend}
                    onChange={(e) => setCustomAvgSpend(parseFloat(e.target.value) || 0)}
                    className="w-full bg-[#080d18] border border-slate-700/80 rounded-lg px-3 py-2 text-xs text-slate-100 font-mono tabular-nums focus:outline-none focus:border-cyan-500"
                  />
                </div>
              </div>

              {/* Amount & Time */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-medium text-slate-300 mb-1.5 flex items-center justify-between">
                    <span>Transaction Amount (₹)</span>
                    <span className="text-[11px] text-slate-400 font-mono">
                      {(amount / Math.max(1, customAvgSpend)).toFixed(1)}x baseline
                    </span>
                  </label>
                  <div className="relative">
                    <IndianRupee className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
                    <input
                      type="number"
                      required
                      min="0.01"
                      step="0.01"
                      value={amount}
                      onChange={(e) => setAmount(parseFloat(e.target.value) || 0)}
                      className="w-full bg-[#080d18] border border-slate-700/80 rounded-lg pl-9 pr-3 py-2 text-sm text-slate-100 font-mono tabular-nums font-semibold focus:outline-none focus:border-cyan-500"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-medium text-slate-300 mb-1.5 flex items-center justify-between">
                    <span>Transaction Hour (00:00 - 23:59)</span>
                    <span className="text-[11px] text-slate-400 font-mono">
                      {hourOfDay.toString().padStart(2, '0')}:00 {hourOfDay >= 2 && hourOfDay <= 4 ? '(Dormant)' : '(Active)'}
                    </span>
                  </label>
                  <div className="relative">
                    <Clock className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
                    <select
                      value={hourOfDay}
                      onChange={(e) => setHourOfDay(parseInt(e.target.value))}
                      className="w-full bg-[#080d18] border border-slate-700/80 rounded-lg pl-9 pr-3 py-2 text-xs text-slate-100 focus:outline-none focus:border-cyan-500"
                    >
                      <option value={12}>12:00 PM (Midday - Low Risk)</option>
                      <option value={15}>03:00 PM (Afternoon - Low Risk)</option>
                      <option value={19}>07:00 PM (Evening - Normal)</option>
                      <option value={23}>11:00 PM (Late Night - Moderate)</option>
                      <option value={3}>03:00 AM (Deep Night - Dormant High Risk)</option>
                      <option value={4}>04:30 AM (Early Dawn - High Risk)</option>
                    </select>
                  </div>
                </div>
              </div>

              {/* Location & Channel */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-medium text-slate-300 mb-1.5">
                    Transaction Location
                  </label>
                  <div className="relative">
                    <MapPin className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
                    <input
                      type="text"
                      required
                      value={location}
                      onChange={(e) => setLocation(e.target.value)}
                      placeholder="e.g. San Francisco, CA or Foreign Proxy"
                      className="w-full bg-[#080d18] border border-slate-700/80 rounded-lg pl-9 pr-3 py-2 text-xs text-slate-100 focus:outline-none focus:border-cyan-500"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-medium text-slate-300 mb-1.5">
                    Channel / Terminal
                  </label>
                  <select
                    value={channel}
                    onChange={(e) => setChannel(e.target.value as TransactionChannel)}
                    className="w-full bg-[#080d18] border border-slate-700/80 rounded-lg px-3 py-2 text-xs text-slate-100 focus:outline-none focus:border-cyan-500"
                  >
                    <option value="MOBILE_APP">Mobile App (Biometric Auth)</option>
                    <option value="WEB_PORTAL">Web Portal (Online Banking)</option>
                    <option value="POS_TERMINAL">Physical POS Terminal (Chip & PIN)</option>
                    <option value="ATM">ATM Withdrawal Unit</option>
                  </select>
                </div>
              </div>

              {/* Merchant Category & Velocity */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-medium text-slate-300 mb-1.5">
                    Merchant Category
                  </label>
                  <select
                    value={merchantCategory}
                    onChange={(e) => setMerchantCategory(e.target.value as MerchantCategory)}
                    className="w-full bg-[#080d18] border border-slate-700/80 rounded-lg px-3 py-2 text-xs text-slate-100 focus:outline-none focus:border-cyan-500"
                  >
                    <option value="GROCERY_ESSENTIALS">Grocery & Essentials (Low Risk)</option>
                    <option value="DINING_ENTERTAINMENT">Dining & Entertainment (Low Risk)</option>
                    <option value="ELECTRONICS_TECH">Consumer Electronics (Moderate)</option>
                    <option value="LUXURY_JEWELRY">Luxury Jewelry (Elevated Risk)</option>
                    <option value="CRYPTO_EXCHANGE">Cryptocurrency Exchange (High Risk)</option>
                    <option value="WIRE_TRANSFER_SERVICE">Wire Remittance Service (High Risk)</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-medium text-slate-300 mb-1.5 flex items-center justify-between">
                    <span>10-Minute Velocity Window</span>
                    <span className="text-[11px] text-slate-400 font-mono">
                      {velocityWindowCount} tx / 10 min
                    </span>
                  </label>
                  <div className="flex items-center gap-2">
                    <input
                      type="range"
                      min="1"
                      max="8"
                      value={velocityWindowCount}
                      onChange={(e) => setVelocityWindowCount(parseInt(e.target.value))}
                      className="w-full accent-cyan-400"
                    />
                    <span className="w-8 text-center font-mono text-xs font-semibold text-slate-200 bg-slate-800 rounded py-1">
                      {velocityWindowCount}
                    </span>
                  </div>
                </div>
              </div>

              {/* Submit CTA */}
              <div className="pt-2">
                <button
                  type="submit"
                  disabled={isAnalyzing}
                  className="w-full py-3 px-4 rounded-xl bg-gradient-to-r from-violet-600 via-indigo-600 to-cyan-500 hover:from-violet-500 hover:via-indigo-500 hover:to-cyan-400 text-white font-semibold text-sm shadow-lg shadow-indigo-600/20 flex items-center justify-center gap-2 transition-all disabled:opacity-50"
                >
                  {isAnalyzing ? (
                    <>
                      <RotateCcw className="w-4 h-4 animate-spin" />
                      <span>Computing Neural Inference...</span>
                    </>
                  ) : (
                    <>
                      <Sparkles className="w-4 h-4" />
                      <span>Analyze Transaction with AI</span>
                      <ArrowRight className="w-4 h-4 ml-1" />
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>

        {/* Right Column: AI Model Visualizer + Transaction Status & Alerts */}
        <div className="lg:col-span-5 space-y-6">
          {/* Neural Network SVG Visualizer */}
          <NeuralNetworkVisualizer
            breakdown={evaluation?.breakdown}
            config={config}
            isAnalyzing={isAnalyzing}
          />

          {/* Transaction Status & Alert Box */}
          {evaluation ? (
            <div
              className={`rounded-xl border p-5 transition-all ${
                evaluation.status === 'SUSPICIOUS'
                  ? 'border-red-600/80 bg-red-950/30 shadow-lg shadow-red-950/40'
                  : 'border-emerald-600/80 bg-emerald-950/20 shadow-lg shadow-emerald-950/30'
              }`}
            >
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-2.5">
                  <div
                    className={`w-9 h-9 rounded-lg flex items-center justify-center ${
                      evaluation.status === 'SUSPICIOUS'
                        ? 'bg-red-900/60 text-red-400 border border-red-700/60'
                        : 'bg-emerald-900/60 text-emerald-400 border border-emerald-700/60'
                    }`}
                  >
                    {evaluation.status === 'SUSPICIOUS' ? (
                      <AlertOctagon className="w-5 h-5" />
                    ) : (
                      <ShieldCheck className="w-5 h-5" />
                    )}
                  </div>
                  <div>
                    <span className="text-[11px] text-slate-400 uppercase tracking-wider block">
                      Transaction Evaluation Status
                    </span>
                    <h4
                      className={`text-lg font-bold ${
                        evaluation.status === 'SUSPICIOUS'
                          ? 'text-red-400'
                          : 'text-emerald-400'
                      }`}
                    >
                      {evaluation.status === 'SUSPICIOUS'
                        ? 'SUSPICIOUS / FLAGGED'
                        : 'NORMAL / APPROVED'}
                    </h4>
                  </div>
                </div>

                <div className="text-right">
                  <span className="text-[10px] text-slate-400 block">Risk Score</span>
                  <span
                    className={`font-mono text-xl font-bold tabular-nums ${
                      evaluation.status === 'SUSPICIOUS'
                        ? 'text-red-300'
                        : 'text-emerald-300'
                    }`}
                  >
                    {evaluation.riskScore.toFixed(3)}
                  </span>
                  <span className="text-[10px] text-slate-400 block font-mono">
                    Limit: {evaluation.threshold.toFixed(2)}
                  </span>
                </div>
              </div>

              {/* Status explanation */}
              <p className="text-xs text-slate-300 mt-3 pt-3 border-t border-slate-800">
                {evaluation.alertMessage}
              </p>

              {/* Fraud Alert Triggers list if suspicious */}
              {evaluation.status === 'SUSPICIOUS' && (
                <div className="mt-3 bg-red-950/50 border border-red-800/60 rounded-lg p-3">
                  <div className="flex items-center gap-1.5 text-xs font-semibold text-red-300 mb-2">
                    <AlertOctagon className="w-3.5 h-3.5" />
                    <span>Forensic Trigger Reasons:</span>
                  </div>
                  <ul className="space-y-1">
                    {evaluation.breakdown.triggeredAlerts.map((trigger, idx) => (
                      <li key={idx} className="text-xs text-red-200/90 flex items-start gap-1.5">
                        <span className="text-red-400 select-none">›</span>
                        <span>{trigger}</span>
                      </li>
                    ))}
                  </ul>
                  {evaluation.caseId && (
                    <div className="mt-2 pt-2 border-t border-red-900/60 flex items-center justify-between text-[11px] text-red-300/80">
                      <span>Forensic Case Reference:</span>
                      <span className="font-mono font-bold text-red-300">{evaluation.caseId}</span>
                    </div>
                  )}
                </div>
              )}
            </div>
          ) : (
            <div className="rounded-xl border border-slate-800 bg-[#0d1424]/60 p-6 text-center text-slate-400">
              <Activity className="w-8 h-8 mx-auto text-slate-600 mb-2" />
              <p className="text-xs font-medium">Ready for Ingestion</p>
              <p className="text-[11px] text-slate-400 mt-1">
                Enter transaction parameters or load a pre-built sample to trigger the AI fraud evaluation.
              </p>
            </div>
          )}
        </div>
      </div>

      {/* Recent Monitored Transactions Table */}
      <div className="rounded-xl border border-slate-800 bg-[#0d1424] p-5 shadow-xl">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h3 className="text-sm font-semibold text-slate-100">
              Recent Transaction Stream
            </h3>
            <p className="text-xs text-slate-400 mt-0.5">
              Live ledger of submitted financial events and automated status classifications
            </p>
          </div>
          <span className="text-xs text-slate-400 font-mono">
            {history.length} events logged
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="border-b border-slate-800 text-slate-400 font-medium">
                <th className="py-2.5 px-3">Transaction ID</th>
                <th className="py-2.5 px-3">Account</th>
                <th className="py-2.5 px-3 text-right">Amount (₹)</th>
                <th className="py-2.5 px-3">Location</th>
                <th className="py-2.5 px-3">Category</th>
                <th className="py-2.5 px-3">Velocity</th>
                <th className="py-2.5 px-3 text-right">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60 font-mono">
              {history.map((tx, idx) => {
                const isNormal = tx.amount < (tx.userHistoricalAvg * 3) && !tx.location.toUpperCase().includes('PROXY');
                return (
                  <tr key={idx} className="hover:bg-slate-800/30 transition-colors">
                    <td className="py-2.5 px-3 font-semibold text-slate-200">
                      {tx.transactionId}
                    </td>
                    <td className="py-2.5 px-3 text-slate-300 font-sans">
                      {tx.userId}
                    </td>
                    <td className="py-2.5 px-3 text-right font-semibold text-slate-100 tabular-nums">
                      ₹{tx.amount.toFixed(2)}
                    </td>
                    <td className="py-2.5 px-3 text-slate-400 font-sans truncate max-w-[180px]">
                      {tx.location}
                    </td>
                    <td className="py-2.5 px-3 text-slate-400 font-sans">
                      {tx.merchantCategory.replace(/_/g, ' ')}
                    </td>
                    <td className="py-2.5 px-3 text-slate-300">
                      {tx.velocityWindowCount} / 10m
                    </td>
                    <td className="py-2.5 px-3 text-right">
                      <span
                        className={`inline-block px-2 py-0.5 rounded text-[11px] font-sans font-semibold ${
                          isNormal
                            ? 'bg-emerald-950/80 text-emerald-400 border border-emerald-800/50'
                            : 'bg-red-950/80 text-red-400 border border-red-800/50'
                        }`}
                      >
                        {isNormal ? 'NORMAL' : 'SUSPICIOUS'}
                      </span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
