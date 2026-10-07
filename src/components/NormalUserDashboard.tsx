import React, { useState } from 'react';
import { 
  CreditCard, 
  Send, 
  ArrowUpRight, 
  ArrowDownLeft, 
  ShieldCheck, 
  AlertTriangle, 
  Lock, 
  Clock, 
  IndianRupee, 
  CheckCircle2, 
  User, 
  RefreshCw,
  LogOut
} from 'lucide-react';
import { TransactionData, TransactionEvaluationResult } from '../types/fraud';

interface NormalUserDashboardProps {
  onEvaluate: (tx: TransactionData) => TransactionEvaluationResult;
  history: TransactionData[];
  onOpenSecretAdmin: () => void;
  onLogout?: () => void;
}

export const NormalUserDashboard: React.FC<NormalUserDashboardProps> = ({
  onEvaluate,
  history,
  onOpenSecretAdmin,
  onLogout
}) => {
  const [balance, setBalance] = useState<number>(24850.40);
  const [recipient, setRecipient] = useState<string>('John Doe (#9823-1102)');
  const [transferAmount, setTransferAmount] = useState<number>(45.00);
  const [location, setLocation] = useState<string>('San Francisco, CA (Home)');
  const [merchantCategory, setMerchantCategory] = useState<string>('GROCERY_ESSENTIALS');
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [lastTransferResult, setLastTransferResult] = useState<TransactionEvaluationResult | null>(null);

  const handleTransfer = (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);

    const tx: TransactionData = {
      transactionId: `TX-${Math.floor(10000 + Math.random() * 90000)}`,
      userId: 'USR-4092',
      amount: Number(transferAmount),
      timestamp: new Date().toISOString(),
      hourOfDay: new Date().getHours(),
      location: location.trim(),
      channel: 'WEB_PORTAL',
      merchantCategory: merchantCategory as any,
      velocityWindowCount: 1,
      userHistoricalAvg: 45.00
    };

    setTimeout(() => {
      const res = onEvaluate(tx);
      setLastTransferResult(res);
      if (res.status === 'NORMAL') {
        setBalance((b) => Math.max(0, b - transferAmount));
      }
      setIsSubmitting(false);
    }, 350);
  };

  return (
    <div className="space-y-6">
      {/* Top Welcome Bar */}
      <div className="rounded-xl border border-slate-800 bg-[#0c1220]/80 p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <span className="text-[11px] text-cyan-400 font-mono block">CUSTOMER PORTAL</span>
          <h2 className="text-xl font-bold tracking-tight text-white flex items-center gap-2">
            Customer Banking Dashboard
          </h2>
          <p className="text-xs text-slate-400 mt-0.5">
            Account #4092-8821 · Checked and protected by NeuralBank Risk Net
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          <div className="hidden sm:flex px-3 py-1.5 rounded-lg bg-emerald-950/60 border border-emerald-800/60 text-emerald-300 text-xs items-center gap-1.5">
            <ShieldCheck className="w-4 h-4 text-emerald-400" />
            <span>AI Shield: Active</span>
          </div>

          <button
            onClick={onOpenSecretAdmin}
            className="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white text-xs font-medium border border-slate-700 transition-colors flex items-center gap-1.5"
            title="Open Secret Admin Login"
          >
            <Lock className="w-3.5 h-3.5 text-violet-400" />
            <span className="hidden sm:inline">Secret Admin Panel</span>
            <span className="sm:hidden">Admin</span>
          </button>

          {onLogout && (
            <button
              onClick={onLogout}
              className="px-3 py-1.5 rounded-lg bg-red-950/90 hover:bg-red-900 text-red-200 hover:text-white border border-red-700/80 text-xs font-bold shadow-md shadow-red-950/50 transition-all flex items-center gap-1.5"
              title="Sign out of customer account"
            >
              <LogOut className="w-3.5 h-3.5 text-red-400" />
              <span>Log Out</span>
            </button>
          )}
        </div>
      </div>

      {/* Account Overview Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
        {/* Balance Card */}
        <div className="rounded-2xl border border-slate-800 bg-gradient-to-br from-[#0e172a] via-[#0d1424] to-[#121124] p-5 shadow-xl relative overflow-hidden">
          <div className="absolute -right-8 -bottom-8 w-32 h-32 bg-cyan-500/10 rounded-full blur-2xl pointer-events-none" />
          <div className="flex items-center justify-between text-xs text-slate-400 mb-3">
            <span>Primary Checking</span>
            <CreditCard className="w-4 h-4 text-cyan-400" />
          </div>
          <span className="text-xs text-slate-400">Available Balance</span>
          <p className="text-2xl sm:text-3xl font-bold font-mono text-white mt-1 tabular-nums">
            ₹{balance.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </p>
          <div className="mt-4 pt-3 border-t border-slate-800/80 flex items-center justify-between text-[11px] text-slate-400">
            <span>Card ending in <strong>*4092</strong></span>
            <span className="text-emerald-400 flex items-center gap-1">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
              Active
            </span>
          </div>
        </div>

        {/* 30-Day Spending Baseline */}
        <div className="rounded-2xl border border-slate-800 bg-[#0d1424] p-5 shadow-xl space-y-3">
          <span className="text-xs text-slate-400 block">Behavioral Baseline Profile</span>
          <div className="flex items-baseline justify-between">
            <span className="text-2xl font-bold font-mono text-slate-100">₹45.00</span>
            <span className="text-xs text-slate-400 font-mono">30-Day Avg Spend</span>
          </div>
          <p className="text-[11px] text-slate-400 leading-relaxed">
            Transactions exceeding ₹135.00 (3x baseline) will trigger automated multi-layer forensic AI screening.
          </p>
        </div>

        {/* Security Shield Summary */}
        <div className="rounded-2xl border border-slate-800 bg-[#0d1424] p-5 shadow-xl space-y-3">
          <span className="text-xs text-slate-400 block">Fraud Protection Level</span>
          <div className="flex items-center gap-2">
            <span className="text-lg font-bold text-cyan-300 font-sans">Enterprise Shield</span>
            <span className="text-[10px] bg-cyan-950 text-cyan-400 px-1.5 py-0.5 rounded border border-cyan-800">
              Level 4
            </span>
          </div>
          <p className="text-[11px] text-slate-400 leading-relaxed">
            All outgoing payments are evaluated using sigmoid neural weights for zero-trust anomaly prevention.
          </p>
        </div>
      </div>

      {/* Transfer Money & Recent Transactions */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Quick Transfer Form (Left 5 cols) */}
        <div className="lg:col-span-5">
          <div className="rounded-xl border border-slate-800 bg-[#0d1424] p-5 shadow-xl space-y-4">
            <div className="border-b border-slate-800 pb-3">
              <h3 className="text-sm font-semibold text-slate-100 flex items-center gap-2">
                <Send className="w-4 h-4 text-cyan-400" />
                Quick Money Transfer
              </h3>
              <p className="text-xs text-slate-400 mt-0.5">
                Funds are screened by NeuralBank AI before clearing
              </p>
            </div>

            {lastTransferResult && (
              <div
                className={`p-3 rounded-lg border text-xs ${
                  lastTransferResult.status === 'NORMAL'
                    ? 'bg-emerald-950/40 border-emerald-800/60 text-emerald-300'
                    : 'bg-red-950/40 border-red-800/60 text-red-300'
                }`}
              >
                <div className="flex items-center gap-1.5 font-semibold mb-1">
                  {lastTransferResult.status === 'NORMAL' ? (
                    <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                  ) : (
                    <AlertTriangle className="w-4 h-4 text-red-400" />
                  )}
                  <span>
                    {lastTransferResult.status === 'NORMAL'
                      ? 'Transfer Cleared Successfully'
                      : 'Transfer Flagged as Suspicious'}
                  </span>
                </div>
                <p className="text-[11px]">{lastTransferResult.alertMessage}</p>
              </div>
            )}

            <form onSubmit={handleTransfer} className="space-y-3 text-xs">
              <div>
                <label className="block text-slate-300 font-medium mb-1">
                  Recipient Account / Contact
                </label>
                <input
                  type="text"
                  required
                  value={recipient}
                  onChange={(e) => setRecipient(e.target.value)}
                  className="w-full bg-[#080d18] border border-slate-700/80 rounded-lg px-3 py-2 text-slate-100 focus:outline-none focus:border-cyan-500"
                />
              </div>

              <div>
                <label className="block text-slate-300 font-medium mb-1 flex justify-between">
                  <span>Transfer Amount (₹)</span>
                  <span className="text-slate-400 font-mono">Balance: ₹{balance.toFixed(2)}</span>
                </label>
                <div className="relative">
                  <IndianRupee className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-2.5" />
                  <input
                    type="number"
                    min="1"
                    step="0.01"
                    required
                    value={transferAmount}
                    onChange={(e) => setTransferAmount(parseFloat(e.target.value) || 0)}
                    className="w-full bg-[#080d18] border border-slate-700/80 rounded-lg pl-8 pr-3 py-2 text-slate-100 font-mono font-semibold focus:outline-none focus:border-cyan-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-slate-300 font-medium mb-1">
                    Location
                  </label>
                  <input
                    type="text"
                    value={location}
                    onChange={(e) => setLocation(e.target.value)}
                    className="w-full bg-[#080d18] border border-slate-700/80 rounded-lg px-2.5 py-1.5 text-slate-100 text-[11px]"
                  />
                </div>

                <div>
                  <label className="block text-slate-300 font-medium mb-1">
                    Category
                  </label>
                  <select
                    value={merchantCategory}
                    onChange={(e) => setMerchantCategory(e.target.value)}
                    className="w-full bg-[#080d18] border border-slate-700/80 rounded-lg px-2 py-1.5 text-slate-100 text-[11px]"
                  >
                    <option value="GROCERY_ESSENTIALS">Groceries (Safe)</option>
                    <option value="DINING_ENTERTAINMENT">Dining</option>
                    <option value="ELECTRONICS_TECH">Electronics</option>
                    <option value="CRYPTO_EXCHANGE">Crypto (High Risk)</option>
                  </select>
                </div>
              </div>

              <button
                type="submit"
                disabled={isSubmitting}
                className="w-full py-2.5 rounded-lg bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 text-white font-semibold flex items-center justify-center gap-1.5 transition-all disabled:opacity-50"
              >
                {isSubmitting ? (
                  <>
                    <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                    <span>Verifying with AI...</span>
                  </>
                ) : (
                  <>
                    <Send className="w-3.5 h-3.5" />
                    <span>Send Payment Now</span>
                  </>
                )}
              </button>
            </form>
          </div>
        </div>

        {/* Recent Transactions Stream (Right 7 cols) */}
        <div className="lg:col-span-7">
          <div className="rounded-xl border border-slate-800 bg-[#0d1424] p-5 shadow-xl space-y-4">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div>
                <h3 className="text-sm font-semibold text-slate-100">
                  Account Activity Ledger
                </h3>
                <p className="text-xs text-slate-400 mt-0.5">
                  Recent debits and credits for Alice Chen
                </p>
              </div>
              <span className="font-mono text-xs text-slate-400">
                {history.length} records
              </span>
            </div>

            <div className="space-y-2 max-h-[340px] overflow-y-auto font-mono text-xs pr-1">
              {history.map((tx, idx) => {
                const isNormal = tx.amount < (tx.userHistoricalAvg * 3) && !tx.location.toUpperCase().includes('PROXY');
                return (
                  <div
                    key={idx}
                    className="p-3 rounded-lg bg-slate-900/60 border border-slate-800/80 flex items-center justify-between hover:bg-slate-800/40 transition-colors"
                  >
                    <div className="flex items-center gap-3">
                      <div
                        className={`w-7 h-7 rounded-lg flex items-center justify-center text-xs ${
                          isNormal
                            ? 'bg-emerald-950 text-emerald-400'
                            : 'bg-red-950 text-red-400'
                        }`}
                      >
                        <ArrowUpRight className="w-4 h-4" />
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="font-semibold text-slate-200">{tx.transactionId}</span>
                          <span className="text-[10px] text-slate-400 font-sans">{tx.merchantCategory.replace(/_/g, ' ')}</span>
                        </div>
                        <span className="text-[10px] text-slate-500 font-sans block">
                          {tx.location}
                        </span>
                      </div>
                    </div>

                    <div className="text-right">
                      <span className="font-bold text-slate-100 block tabular-nums">
                        -₹{tx.amount.toFixed(2)}
                      </span>
                      <span
                        className={`text-[10px] font-sans font-semibold ${
                          isNormal ? 'text-emerald-400' : 'text-red-400'
                        }`}
                      >
                        {isNormal ? 'CLEARED' : 'SUSPICIOUS'}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
