import React, { useState, useEffect } from 'react';
import { fraudEngineInstance } from './services/fraudDetectionEngine';
import { 
  SystemConfiguration, 
  TransactionData, 
  TransactionEvaluationResult, 
  FraudCaseRecord, 
  ModelPerformanceData 
} from './types/fraud';
import { AuthSession, UserRole } from './types/auth';
import { Navbar } from './components/Navbar';
import { FrontPage } from './components/FrontPage';
import { NormalUserDashboard } from './components/NormalUserDashboard';
import { SecretAdminDashboard } from './components/SecretAdminDashboard';
import { SecretAdminModal } from './components/SecretAdminModal';
import { FraudAlertToast, FraudToastData } from './components/FraudAlertToast';
import { TransactionChatbot } from './components/TransactionChatbot';
import { OfflineIndicator } from './components/OfflineIndicator';

export default function App() {
  // Authentication session state with offline persistence
  const [session, setSession] = useState<AuthSession>(() => {
    try {
      const saved = localStorage.getItem('neuralbank_session');
      if (saved) return JSON.parse(saved);
    } catch {
      // Fallback
    }
    // Default to 'guest' so user sees the Front Page login dashboard
    return {
      role: 'guest',
      username: '',
      name: '',
      loginTime: ''
    };
  });

  const [isSecretModalOpen, setIsSecretModalOpen] = useState<boolean>(false);

  // System State synced with fraudEngineInstance and localStorage for 100% offline capability
  const [config, setConfig] = useState<SystemConfiguration>(() => {
    try {
      const saved = localStorage.getItem('neuralbank_config');
      if (saved) return JSON.parse(saved);
    } catch {
      // Fallback
    }
    return fraudEngineInstance.getConfiguration();
  });

  const [cases, setCases] = useState<FraudCaseRecord[]>(() => {
    try {
      const saved = localStorage.getItem('neuralbank_cases');
      if (saved) return JSON.parse(saved);
    } catch {
      // Fallback
    }
    return fraudEngineInstance.getDetectedCases();
  });

  const [history, setHistory] = useState<TransactionData[]>(() => {
    try {
      const saved = localStorage.getItem('neuralbank_history');
      if (saved) return JSON.parse(saved);
    } catch {
      // Fallback
    }
    return fraudEngineInstance.getTransactionHistory();
  });

  const [performanceData, setPerformanceData] = useState<ModelPerformanceData>(fraudEngineInstance.getPerformanceData());
  const [lastResult, setLastResult] = useState<TransactionEvaluationResult | null>(null);

  // High Risk Toast state
  const [highRiskToast, setHighRiskToast] = useState<FraudToastData | null>(null);

  // Sync to localStorage
  useEffect(() => {
    try {
      localStorage.setItem('neuralbank_session', JSON.stringify(session));
    } catch {
      // Ignore
    }
  }, [session]);

  useEffect(() => {
    try {
      localStorage.setItem('neuralbank_config', JSON.stringify(config));
    } catch {
      // Ignore
    }
  }, [config]);

  useEffect(() => {
    try {
      localStorage.setItem('neuralbank_cases', JSON.stringify(cases));
    } catch {
      // Ignore
    }
  }, [cases]);

  useEffect(() => {
    try {
      localStorage.setItem('neuralbank_history', JSON.stringify(history));
    } catch {
      // Ignore
    }
  }, [history]);

  // Evaluate Transaction Handler
  const handleEvaluate = (tx: TransactionData): TransactionEvaluationResult => {
    const res = fraudEngineInstance.evaluateTransaction(tx);
    setLastResult(res);
    setCases(fraudEngineInstance.getDetectedCases());
    setHistory(fraudEngineInstance.getTransactionHistory());

    // Prompt Requirement: Immediate High Risk Toast Feedback
    if (res.status === 'SUSPICIOUS') {
      setHighRiskToast({
        id: `${tx.transactionId}-${Date.now()}`,
        result: res
      });
    }

    return res;
  };

  // Admin Config Update Handler
  const handleUpdateConfig = (
    threshold: number,
    amountW: number,
    locW: number,
    velW: number,
    timeW: number,
    merchW: number,
    adminName: string
  ) => {
    const res = fraudEngineInstance.updateConfiguration(
      threshold,
      amountW,
      locW,
      velW,
      timeW,
      merchW,
      adminName
    );
    setConfig(fraudEngineInstance.getConfiguration());
    return res;
  };

  // Case Status Update Handler
  const handleUpdateCaseStatus = (caseId: string, status: FraudCaseRecord['status'], notes?: string) => {
    fraudEngineInstance.updateCaseStatus(caseId, status, notes);
    setCases(fraudEngineInstance.getDetectedCases());
  };

  // Algorithm Refinement Handler
  const handleRefineAlgorithm = (lr: number, iters: number) => {
    const res = fraudEngineInstance.refineAlgorithm(lr, iters);
    setConfig(fraudEngineInstance.getConfiguration());
    setPerformanceData(fraudEngineInstance.getPerformanceData());
    return res;
  };

  const handleLogout = () => {
    setSession({
      role: 'guest',
      username: '',
      name: '',
      loginTime: ''
    });
    setHighRiskToast(null);
  };

  return (
    <div className="min-h-screen bg-[#070b14] text-slate-100 flex flex-col font-sans selection:bg-violet-600/30 selection:text-cyan-300">
      {/* Offline Status Indicator */}
      <OfflineIndicator />

      {/* Top Navigation Bar */}
      <Navbar
        role={session.role}
        username={session.username}
        onLogout={handleLogout}
        onOpenSecretAdmin={() => {
          setSession({
            role: 'admin',
            username: 'Admin',
            name: 'System Administrator',
            loginTime: new Date().toISOString()
          });
        }}
        onOpenUserLogin={() => {
          setSession({
            role: 'guest',
            username: '',
            name: '',
            loginTime: ''
          });
        }}
        threshold={config.fraudThreshold}
        flaggedCount={cases.length}
      />

      {/* Main Content Router based on Authentication Role */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-6">
        {/* 1. GUEST / FRONT PAGE WITH LOGIN TO MAIN WEBSITE */}
        {session.role === 'guest' && (
          <FrontPage
            onLogin={(newSession) => setSession(newSession)}
          />
        )}

        {/* 2. NORMAL USER DASHBOARD */}
        {session.role === 'user' && (
          <NormalUserDashboard
            onEvaluate={handleEvaluate}
            history={history}
            onOpenSecretAdmin={() => {
              setSession({
                role: 'admin',
                username: 'Admin',
                name: 'System Administrator',
                loginTime: new Date().toISOString()
              });
            }}
            onLogout={handleLogout}
          />
        )}

        {/* 3. SECRET ADMIN DASHBOARD (User dashboard, Java Codebase, Terminal Runner hidden here) */}
        {session.role === 'admin' && (
          <SecretAdminDashboard
            config={config}
            onUpdateConfig={handleUpdateConfig}
            cases={cases}
            onUpdateCaseStatus={handleUpdateCaseStatus}
            performanceData={performanceData}
            onRefineAlgorithm={handleRefineAlgorithm}
            totalTransactionsCount={history.length}
            onEvaluate={handleEvaluate}
            lastResult={lastResult}
            history={history}
            onLogout={handleLogout}
          />
        )}
      </main>

      {/* Secret Admin Authentication Modal */}
      <SecretAdminModal
        isOpen={isSecretModalOpen}
        onClose={() => setIsSecretModalOpen(false)}
        onSuccess={(adminSession) => setSession(adminSession)}
      />

      {/* High-Risk Fraud Alert Toast Notification */}
      <FraudAlertToast
        toast={highRiskToast}
        onDismiss={() => setHighRiskToast(null)}
        onReviewCase={() => {
          if (session.role === 'admin') {
            // Already in secret admin, toast dismissed
          } else {
            setIsSecretModalOpen(true);
          }
          setHighRiskToast(null);
        }}
      />

      {/* Offline-capable Transaction Issue Resolution Chatbot */}
      <TransactionChatbot
        transactions={history}
      />

      {/* Footer */}
      <footer className="border-t border-slate-800/80 bg-[#060911] py-4 text-xs text-slate-400">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col sm:flex-row items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <span className="font-semibold text-slate-300">NeuralBank 🧠</span>
            <span aria-hidden="true">·</span>
            <span>AI-Powered Fraud Detection System</span>
            <span aria-hidden="true">·</span>
            <span className="font-mono text-[11px] text-cyan-400">
              {session.role === 'admin' ? 'Secret Admin Mode Active' : session.role === 'user' ? 'Customer Session' : 'Front Gateway'}
            </span>
          </div>
          <div className="flex items-center gap-4 text-slate-400 text-[11px]">
            <span>Threshold: {config.fraudThreshold.toFixed(2)}</span>
            <span aria-hidden="true">·</span>
            <span>Java 21 Engine</span>
            <span aria-hidden="true">·</span>
            <span>Offline Support Active</span>
          </div>
        </div>
      </footer>
    </div>
  );
}
