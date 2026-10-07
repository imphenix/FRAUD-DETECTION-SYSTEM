import React, { useState } from 'react';
import { 
  Lock, 
  ShieldAlert, 
  Sliders, 
  Code2, 
  Terminal, 
  KeyRound, 
  LogOut, 
  CheckCircle2, 
  Cpu,
  FileSpreadsheet,
  TrendingUp,
  ChevronDown,
  ChevronUp
} from 'lucide-react';
import { exportFraudCasesToCSV } from '../utils/csvExport';
import { 
  SystemConfiguration, 
  TransactionData, 
  TransactionEvaluationResult, 
  FraudCaseRecord, 
  ModelPerformanceData 
} from '../types/fraud';
import { AdminDashboard } from './AdminDashboard';
import { UserDashboard } from './UserDashboard';
import { JavaCodeViewer } from './JavaCodeViewer';
import { TerminalRunner } from './TerminalRunner';
import { FraudRiskTrendDashboard } from './FraudRiskTrendDashboard';

export type SecretAdminTab = 'admin-core' | 'user-simulation' | 'java-code' | 'terminal';

interface SecretAdminDashboardProps {
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
  onEvaluate: (tx: TransactionData) => TransactionEvaluationResult;
  lastResult: TransactionEvaluationResult | null;
  history: TransactionData[];
  onLogout: () => void;
}

export const SecretAdminDashboard: React.FC<SecretAdminDashboardProps> = ({
  config,
  onUpdateConfig,
  cases,
  onUpdateCaseStatus,
  performanceData,
  onRefineAlgorithm,
  totalTransactionsCount,
  onEvaluate,
  lastResult,
  history,
  onLogout
}) => {
  const [activeTab, setActiveTab] = useState<SecretAdminTab>('admin-core');
  const [showTrendDashboard, setShowTrendDashboard] = useState<boolean>(true);

  return (
    <div className="space-y-6">
      {/* Secret Admin Banner */}
      <div className="rounded-xl border border-violet-700/80 bg-gradient-to-r from-[#170c27] via-[#101026] to-[#0c182a] p-5 shadow-2xl relative overflow-hidden">
        <div className="absolute top-0 left-0 bottom-0 w-1.5 bg-gradient-to-b from-red-500 via-violet-500 to-cyan-400" />
        
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pl-2">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-violet-900/80 border border-violet-500/60 flex items-center justify-center text-violet-300 shadow-lg shadow-violet-900/50">
              <KeyRound className="w-5 h-5 text-cyan-300" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-base font-bold text-white tracking-wide">
                  Secret Admin Control Panel
                </span>
                <span className="text-[10px] font-mono font-bold bg-violet-950 text-violet-300 border border-violet-700 px-2 py-0.5 rounded">
                  AUTHENTICATED AS ADMIN
                </span>
              </div>
              <p className="text-xs text-slate-400 mt-0.5">
                Restricted Access Console · User Dashboard, Java Engine & Terminal unlocked
              </p>
            </div>
          </div>

          {/* Sub Navigation Bar for the Secret Tools */}
          <div className="flex items-center gap-2 flex-wrap">
            <nav className="flex items-center gap-1 p-1 bg-slate-950/80 border border-slate-800 rounded-lg">
              <button
                onClick={() => setActiveTab('admin-core')}
                className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-md transition-all ${
                  activeTab === 'admin-core'
                    ? 'bg-violet-600 text-white shadow-sm'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                <Sliders className="w-3.5 h-3.5" />
                <span>Admin Controls</span>
              </button>

              <button
                onClick={() => setActiveTab('user-simulation')}
                className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-md transition-all ${
                  activeTab === 'user-simulation'
                    ? 'bg-cyan-600 text-white shadow-sm'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                <ShieldAlert className="w-3.5 h-3.5" />
                <span>User Dashboard & AI</span>
              </button>

              <button
                onClick={() => setActiveTab('java-code')}
                className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-md transition-all ${
                  activeTab === 'java-code'
                    ? 'bg-indigo-600 text-white shadow-sm'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                <Code2 className="w-3.5 h-3.5" />
                <span>Java Codebase</span>
              </button>

              <button
                onClick={() => setActiveTab('terminal')}
                className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-md transition-all ${
                  activeTab === 'terminal'
                    ? 'bg-emerald-600 text-white shadow-sm'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                <Terminal className="w-3.5 h-3.5" />
                <span>Terminal Runner</span>
              </button>
            </nav>

            {/* Quick Toggle for Recharts Risk Trend Dashboard */}
            <button
              onClick={() => setShowTrendDashboard(!showTrendDashboard)}
              className={`px-3 py-1.5 text-xs font-semibold rounded-lg border flex items-center gap-1.5 transition-all ${
                showTrendDashboard
                  ? 'bg-cyan-950/90 text-cyan-300 border-cyan-500/60 shadow-md shadow-cyan-950/40'
                  : 'bg-slate-900 text-slate-400 border-slate-800 hover:text-slate-200'
              }`}
              title="Toggle Risk Trend Mini-Dashboard Visualization"
            >
              <TrendingUp className="w-3.5 h-3.5 text-cyan-400" />
              <span className="hidden sm:inline">Risk Trend Visualizer</span>
              <span className="sm:hidden">Trends</span>
              {showTrendDashboard ? <ChevronUp className="w-3 h-3 ml-0.5" /> : <ChevronDown className="w-3 h-3 ml-0.5" />}
            </button>

            <button
              onClick={() => exportFraudCasesToCSV(cases)}
              className="px-3.5 py-1.5 text-xs font-semibold rounded-lg bg-emerald-950/80 hover:bg-emerald-900 text-emerald-300 border border-emerald-700/60 shadow-md shadow-emerald-950/40 flex items-center gap-1.5 transition-all"
              title="Download all detected fraud cases as a CSV audit report for offline audits"
            >
              <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-400" />
              <span className="hidden sm:inline">Export Audit CSV</span>
              <span className="sm:hidden">CSV</span>
            </button>

            <button
              onClick={onLogout}
              className="px-3.5 py-1.5 text-xs font-bold rounded-lg bg-red-950/90 hover:bg-red-900 text-red-200 hover:text-white border border-red-600/70 shadow-md shadow-red-950/40 flex items-center gap-1.5 transition-all group"
              title="Lock Admin Panel and Sign Out"
            >
              <LogOut className="w-3.5 h-3.5 text-red-400 group-hover:text-white transition-colors" />
              <span>Log Out & Lock</span>
            </button>
          </div>
        </div>
      </div>

      {/* Recharts Fraud Risk Trend Mini-Dashboard */}
      {showTrendDashboard && (
        <FraudRiskTrendDashboard
          cases={cases}
          config={config}
          onSelectCase={() => setActiveTab('admin-core')}
        />
      )}

      {/* Secret Dashboard Active View */}
      <div>
        {activeTab === 'admin-core' && (
          <AdminDashboard
            config={config}
            onUpdateConfig={onUpdateConfig}
            cases={cases}
            onUpdateCaseStatus={onUpdateCaseStatus}
            performanceData={performanceData}
            onRefineAlgorithm={onRefineAlgorithm}
            totalTransactionsCount={totalTransactionsCount}
          />
        )}

        {activeTab === 'user-simulation' && (
          <UserDashboard
            onEvaluate={onEvaluate}
            config={config}
            lastResult={lastResult}
            history={history}
          />
        )}

        {activeTab === 'java-code' && (
          <JavaCodeViewer />
        )}

        {activeTab === 'terminal' && (
          <TerminalRunner />
        )}
      </div>
    </div>
  );
};
