import React, { useState, useEffect } from 'react';
import { Terminal as TerminalIcon, RotateCcw, Copy, Check } from 'lucide-react';

export const TerminalRunner: React.FC = () => {
  const [logs, setLogs] = useState<string[]>([]);
  const [isRunning, setIsRunning] = useState<boolean>(false);
  const [activeScenario, setActiveScenario] = useState<'all' | 'normal' | 'suspicious'>('all');
  const [copied, setCopied] = useState<boolean>(false);

  const runSimulation = (scenario: 'all' | 'normal' | 'suspicious') => {
    setIsRunning(true);
    setLogs([
      `$ javac -d bin src/com/neuralbank/fraud/*.java`,
      `[INFO] Compiling 10 source files with javac (OpenJDK 21.0.3 LTS)...`,
      `[INFO] Target: Java bytecode v21, Class-path: .`,
      `[SUCCESS] Compilation finished in 184ms. 0 errors, 0 warnings.`,
      `$ java -cp bin com.neuralbank.fraud.Main`,
      ``
    ]);

    const fullLogs: string[] = [];

    if (scenario === 'all' || scenario === 'normal') {
      fullLogs.push(
        `=========================================================================`,
        `   NEURALBANK 🧠 AI-POWERED FRAUD DETECTION SYSTEM (JAVA v21 RUNTIME)   `,
        `=========================================================================`,
        ``,
        `[BOOTSTRAP] System initialized with model: NeuralBank-PerceptronRiskNet (v2.4.1-calibrated)`,
        `[BOOTSTRAP] Default Fraud Threshold: 0.65`,
        `[BOOTSTRAP] Active User: Alice Chen (USR-4092) | 30-Day Avg Spend: ₹45.00`,
        ``,
        `>>> SCENARIO 1: PROCESSING NORMAL TRANSACTION`,
        `Transaction Input: Transaction[ID=TX-88219, User=USR-4092, Amount=₹42.50, Time=2026-09-28T12:30, Location=San Francisco, CA, Channel=MOBILE_APP, Cat=GROCERY_ESSENTIALS, Velocity=1, UserAvg=₹45.00]`,
        `Evaluation Outcome:`,
        `  * Transaction Status : NORMAL`,
        `  * Computed Risk Score: 0.141`,
        `  * Detection Threshold: 0.65`,
        `  * System Message     : APPROVED: Transaction TX-88219 cleared as NORMAL. Risk Score: 0.141 (Threshold: 0.65).`,
        ``
      );
    }

    if (scenario === 'all' || scenario === 'suspicious') {
      fullLogs.push(
        `>>> SCENARIO 2: PROCESSING SUSPICIOUS TRANSACTION`,
        `Transaction Input: Transaction[ID=TX-99401, User=USR-4092, Amount=₹4950.00, Time=2026-09-28T03:42, Location=Lagos, Nigeria (Foreign Proxy), Channel=WEB_PORTAL, Cat=CRYPTO_EXCHANGE, Velocity=6, UserAvg=₹45.00]`,
        `Evaluation Outcome:`,
        `  * Transaction Status : SUSPICIOUS`,
        `  * Computed Risk Score: 0.948`,
        `  * Detection Threshold: 0.65`,
        `  * Fraud Alert Banner : ALERT: Transaction TX-99401 flagged as SUSPICIOUS! Risk Score (0.948) exceeds threshold (0.65).`,
        `  * Generated Case ID  : FC-1004`,
        `  * Forensic Triggers  :`,
        `      - Amount ₹4950.00 is 110.0x higher than user 30-day baseline (₹45.00)`,
        `      - Transaction location flagged as high-risk cross-border or foreign proxy: Lagos, Nigeria (Foreign Proxy)`,
        `      - Unusual velocity burst: 6 transactions in 10-minute window`,
        `      - Off-hours execution during dormant sleep window (02:00 - 05:00)`,
        `      - Elevated merchant category risk: CRYPTO_EXCHANGE`,
        ``
      );
    }

    if (scenario === 'all') {
      fullLogs.push(
        `>>> SCENARIO 3: ADMIN SYSTEM CONFIGURATION UPDATE`,
        `[CONFIRMATION] Configuration successfully updated by Marcus Vance (Lead Risk Officer). New Threshold: 0.70`,
        ``,
        `>>> SCENARIO 4: ALGORITHM REFINEMENT VIA PERFORMANCE FEEDBACK`,
        `[ALGORITHM UPDATE SUCCESS] Weights recalibrated after 10 feedback iterations (LR=0.050). New Amount Weight: 0.355, Location Weight: 0.280.`,
        ``,
        `>>> SCENARIO 5: GENERATE AUDIT DETECTION REPORT`,
        `=========================================================================`,
        `                 NEURALBANK AI FRAUD DETECTION AUDIT REPORT              `,
        `=========================================================================`,
        `Report ID: REP-1743239401 | Generated: 2026-09-28 07:11:42`,
        `Total Transactions Analyzed: 2`,
        `Suspicious Incidents Flagged: 1`,
        `Fraud Incidence Rate: 50.00%`,
        `System Average Risk Score: 0.5445`,
        `-------------------------------------------------------------------------`,
        `DETECTED SUSPICIOUS CASES DETAIL:`,
        `  * Case ID: FC-1004 | Tx ID: TX-99401 | Amount: ₹4950.00 | Risk Score: 0.948`,
        `    Status: PENDING_REVIEW | Location: Lagos, Nigeria (Foreign Proxy) | Time: 2026-09-28T03:42`,
        `    Triggers:`,
        `      - Amount ₹4950.00 is 110.0x higher than user 30-day baseline (₹45.00)`,
        `      - Transaction location flagged as high-risk cross-border or foreign proxy: Lagos, Nigeria (Foreign Proxy)`,
        `      - Unusual velocity burst: 6 transactions in 10-minute window`,
        `      - Off-hours execution during dormant sleep window (02:00 - 05:00)`,
        `      - Elevated merchant category risk: CRYPTO_EXCHANGE`,
        `=========================================================================`,
        ``,
        `NeuralBank Fraud Detection execution completed successfully with 0 errors.`
      );
    }

    let currentIdx = 0;
    const interval = setInterval(() => {
      if (currentIdx < fullLogs.length) {
        const nextLine = fullLogs[currentIdx];
        setLogs((prev) => [...prev, nextLine]);
        currentIdx++;
      } else {
        clearInterval(interval);
        setIsRunning(false);
      }
    }, 40);
  };

  useEffect(() => {
    runSimulation('all');
  }, []);

  const handleCopyLogs = () => {
    navigator.clipboard.writeText(logs.join('\n'));
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="space-y-4">
      {/* Top action bar */}
      <div className="rounded-xl border border-slate-800 bg-[#0c1220]/80 p-5 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold tracking-tight text-white flex items-center gap-2">
            Java Runtime Execution Console
          </h2>
          <p className="text-xs text-slate-400 mt-1">
            Simulates compiling and running <span className="font-mono text-cyan-300">com.neuralbank.fraud.Main</span> against normal and suspicious transactions.
          </p>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          <div className="flex items-center gap-1 p-1 bg-slate-900 border border-slate-800 rounded-lg">
            <button
              onClick={() => {
                setActiveScenario('all');
                runSimulation('all');
              }}
              disabled={isRunning}
              className={`px-3 py-1.5 text-xs font-medium rounded-md transition-all ${
                activeScenario === 'all'
                  ? 'bg-emerald-600 text-white shadow-sm'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              Full Main.java Suite
            </button>
            <button
              onClick={() => {
                setActiveScenario('normal');
                runSimulation('normal');
              }}
              disabled={isRunning}
              className={`px-3 py-1.5 text-xs font-medium rounded-md transition-all ${
                activeScenario === 'normal'
                  ? 'bg-emerald-600 text-white shadow-sm'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              Scenario 1: Normal
            </button>
            <button
              onClick={() => {
                setActiveScenario('suspicious');
                runSimulation('suspicious');
              }}
              disabled={isRunning}
              className={`px-3 py-1.5 text-xs font-medium rounded-md transition-all ${
                activeScenario === 'suspicious'
                  ? 'bg-emerald-600 text-white shadow-sm'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              Scenario 2: Suspicious
            </button>
          </div>

          <button
            onClick={() => runSimulation(activeScenario)}
            disabled={isRunning}
            className="px-3.5 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-medium border border-slate-700 flex items-center gap-1.5 transition-colors disabled:opacity-50"
          >
            <RotateCcw className={`w-3.5 h-3.5 ${isRunning ? 'animate-spin' : ''}`} />
            <span>Re-run</span>
          </button>
        </div>
      </div>

      {/* Terminal window */}
      <div className="rounded-xl border border-slate-800 bg-[#070b14] shadow-2xl overflow-hidden font-mono text-xs">
        {/* Terminal top header */}
        <div className="px-4 py-2.5 bg-slate-900/90 border-b border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="flex gap-1.5">
              <div className="w-3 h-3 rounded-full bg-red-500/80" />
              <div className="w-3 h-3 rounded-full bg-yellow-500/80" />
              <div className="w-3 h-3 rounded-full bg-emerald-500/80" />
            </div>
            <span className="text-slate-400 text-[11px] ml-2 font-mono flex items-center gap-1.5">
              <TerminalIcon className="w-3.5 h-3.5 text-cyan-400" />
              <span>bash - OpenJDK 21 Runtime</span>
            </span>
          </div>

          <div className="flex items-center gap-3">
            <span className="text-[11px] text-slate-500">
              {isRunning ? '● Executing bytecode...' : '● Process exited (0)'}
            </span>
            <button
              onClick={handleCopyLogs}
              className="text-slate-400 hover:text-slate-200 transition-colors flex items-center gap-1 text-[11px]"
            >
              {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
              <span>{copied ? 'Copied' : 'Copy'}</span>
            </button>
          </div>
        </div>

        {/* Console output display */}
        <div className="p-4 sm:p-5 overflow-x-auto max-h-[560px] overflow-y-auto space-y-1 font-mono text-xs leading-relaxed text-slate-300">
          {logs.map((log, index) => {
            let textColor = 'text-slate-300';
            if (log.startsWith('$')) textColor = 'text-cyan-400 font-bold';
            else if (log.includes('[SUCCESS]') || log.includes('APPROVED:')) textColor = 'text-emerald-400 font-bold';
            else if (log.includes('SUSPICIOUS') || log.includes('ALERT:')) textColor = 'text-red-400 font-bold';
            else if (log.startsWith('>>>')) textColor = 'text-yellow-300 font-bold';
            else if (log.startsWith('===')) textColor = 'text-violet-400';

            return (
              <div key={index} className={`${textColor} whitespace-pre-wrap`}>
                {log}
              </div>
            );
          })}
          {isRunning && (
            <div className="inline-block w-2 h-4 bg-cyan-400 animate-pulse ml-1 align-middle" />
          )}
        </div>
      </div>
    </div>
  );
};
