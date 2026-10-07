import React, { useState } from 'react';
import { JAVA_SOURCE_FILES, CLASS_EXPLANATIONS, JavaFile } from '../javaSource/javaCode';
import { 
  Copy, 
  Check, 
  Download, 
  FileCode, 
  Calculator, 
  ShieldCheck, 
  AlertOctagon
} from 'lucide-react';

export const JavaCodeViewer: React.FC = () => {
  const [selectedFile, setSelectedFile] = useState<JavaFile>(JAVA_SOURCE_FILES[0]);
  const [activeSubTab, setActiveSubTab] = useState<'source' | 'explanations' | 'math' | 'samples'>('source');
  const [copied, setCopied] = useState<boolean>(false);

  const handleCopy = () => {
    navigator.clipboard.writeText(selectedFile.code);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleDownloadSingle = (file: JavaFile) => {
    const blob = new Blob([file.code], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = file.filename;
    link.click();
    URL.revokeObjectURL(url);
  };

  const handleDownloadAllBundle = () => {
    const bundleContent = JAVA_SOURCE_FILES.map((f) => {
      return `// =========================================================================\n// FILE: ${f.filename} (${f.package})\n// =========================================================================\n\n${f.code}\n\n`;
    }).join('\n');

    const blob = new Blob([bundleContent], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = 'NeuralBank-FraudDetection-Java-Bundle.java';
    link.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-6">
      {/* Header bar */}
      <div className="rounded-xl border border-slate-800 bg-[#0c1220]/80 p-5 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold tracking-tight text-white flex items-center gap-2">
            Java Object-Oriented Source Code & Architecture
          </h2>
          <p className="text-xs text-slate-400 mt-1">
            Complete, modular Java 21 implementation with strict encapsulation, input validation, and calibrated sigmoid risk scoring.
          </p>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          {/* Subtabs */}
          <div className="flex items-center gap-1 p-1 bg-slate-900 border border-slate-800 rounded-lg">
            <button
              onClick={() => setActiveSubTab('source')}
              className={`px-3 py-1.5 text-xs font-medium rounded-md transition-all ${
                activeSubTab === 'source'
                  ? 'bg-indigo-600 text-white shadow-sm'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800'
              }`}
            >
              Source Files (10)
            </button>
            <button
              onClick={() => setActiveSubTab('explanations')}
              className={`px-3 py-1.5 text-xs font-medium rounded-md transition-all ${
                activeSubTab === 'explanations'
                  ? 'bg-indigo-600 text-white shadow-sm'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800'
              }`}
            >
              Class Explanations
            </button>
            <button
              onClick={() => setActiveSubTab('samples')}
              className={`px-3 py-1.5 text-xs font-medium rounded-md transition-all ${
                activeSubTab === 'samples'
                  ? 'bg-indigo-600 text-white shadow-sm'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800'
              }`}
            >
              Sample IO & Logic
            </button>
            <button
              onClick={() => setActiveSubTab('math')}
              className={`px-3 py-1.5 text-xs font-medium rounded-md transition-all ${
                activeSubTab === 'math'
                  ? 'bg-indigo-600 text-white shadow-sm'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800'
              }`}
            >
              Detection Math
            </button>
          </div>

          <button
            onClick={handleDownloadAllBundle}
            className="px-3 py-1.5 text-xs font-semibold rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 flex items-center gap-1.5 transition-colors whitespace-nowrap"
          >
            <Download className="w-3.5 h-3.5 text-cyan-400" />
            <span>Download All (.java)</span>
          </button>
        </div>
      </div>

      {/* ------------------------------------------------------------- */}
      {/* 1. SOURCE CODE EXPLORER */}
      {/* ------------------------------------------------------------- */}
      {activeSubTab === 'source' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* File sidebar */}
          <div className="lg:col-span-3 space-y-2">
            <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider px-1 block">
              Package Explorer
            </span>
            <div className="rounded-xl border border-slate-800 bg-[#0d1424] p-2 space-y-1">
              {JAVA_SOURCE_FILES.map((file) => (
                <button
                  key={file.filename}
                  onClick={() => setSelectedFile(file)}
                  className={`w-full text-left px-3 py-2 rounded-lg text-xs font-mono flex items-center justify-between transition-colors ${
                    selectedFile.filename === file.filename
                      ? 'bg-indigo-950/90 text-cyan-300 border border-indigo-700 font-semibold'
                      : 'text-slate-400 hover:bg-slate-800/60 hover:text-slate-200'
                  }`}
                >
                  <div className="flex items-center gap-2 truncate">
                    <FileCode className="w-3.5 h-3.5 text-indigo-400 shrink-0" />
                    <span className="truncate">{file.filename}</span>
                  </div>
                </button>
              ))}
            </div>

            {/* Quick summary of selected class */}
            <div className="rounded-xl border border-slate-800 bg-slate-900/40 p-4 text-xs space-y-2">
              <span className="font-semibold text-slate-200 block">Class Purpose:</span>
              <p className="text-slate-400 leading-relaxed">
                {selectedFile.description}
              </p>
              <div className="text-[11px] text-slate-500 font-mono pt-1 border-t border-slate-800">
                Package: <span className="text-slate-300">{selectedFile.package}</span>
              </div>
            </div>
          </div>

          {/* Code display pane */}
          <div className="lg:col-span-9 space-y-3">
            <div className="rounded-xl border border-slate-800 bg-[#0a0f1d] shadow-2xl overflow-hidden">
              {/* Code header bar */}
              <div className="px-4 py-3 border-b border-slate-800 bg-slate-900/80 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="flex gap-1.5 mr-2">
                    <div className="w-2.5 h-2.5 rounded-full bg-red-500/80" />
                    <div className="w-2.5 h-2.5 rounded-full bg-yellow-500/80" />
                    <div className="w-2.5 h-2.5 rounded-full bg-green-500/80" />
                  </div>
                  <span className="font-mono text-xs font-semibold text-slate-200">
                    {selectedFile.filename}
                  </span>
                  <span className="text-[11px] text-slate-500 font-mono">
                    ({selectedFile.code.split('\n').length} lines)
                  </span>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    onClick={handleCopy}
                    className="px-2.5 py-1 text-xs rounded bg-slate-800 hover:bg-slate-700 text-slate-200 font-medium flex items-center gap-1.5 transition-colors"
                  >
                    {copied ? (
                      <>
                        <Check className="w-3.5 h-3.5 text-emerald-400" />
                        <span className="text-emerald-400">Copied</span>
                      </>
                    ) : (
                      <>
                        <Copy className="w-3.5 h-3.5 text-slate-400" />
                        <span>Copy Code</span>
                      </>
                    )}
                  </button>

                  <button
                    onClick={() => handleDownloadSingle(selectedFile)}
                    className="px-2.5 py-1 text-xs rounded bg-slate-800 hover:bg-slate-700 text-slate-200 font-medium flex items-center gap-1.5 transition-colors"
                  >
                    <Download className="w-3.5 h-3.5 text-slate-400" />
                    <span>Download</span>
                  </button>
                </div>
              </div>

              {/* Code viewer with line numbers */}
              <div className="p-4 overflow-x-auto max-h-[580px] font-mono text-xs leading-relaxed text-slate-300">
                <table className="w-full border-collapse">
                  <tbody>
                    {selectedFile.code.split('\n').map((line, idx) => (
                      <tr key={idx} className="hover:bg-slate-800/20">
                        <td className="text-slate-600 select-none pr-4 text-right w-10 text-[11px] align-top">
                          {idx + 1}
                        </td>
                        <td className="whitespace-pre text-slate-200">
                          {line}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ------------------------------------------------------------- */}
      {/* 2. CLASS EXPLANATIONS & OOP PRINCIPLES */}
      {/* ------------------------------------------------------------- */}
      {activeSubTab === 'explanations' && (
        <div className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {CLASS_EXPLANATIONS.map((exp) => (
              <div
                key={exp.className}
                className="rounded-xl border border-slate-800 bg-[#0d1424] p-5 shadow-xl space-y-3"
              >
                <div className="flex items-center justify-between border-b border-slate-800 pb-2.5">
                  <h3 className="text-base font-bold font-mono text-cyan-300 flex items-center gap-2">
                    <FileCode className="w-4 h-4 text-violet-400" />
                    {exp.className}
                  </h3>
                  <span className="text-[10px] font-mono font-bold bg-violet-950 text-violet-300 border border-violet-700 px-2 py-0.5 rounded">
                    OOP MODULE
                  </span>
                </div>

                <p className="text-xs text-slate-300 leading-relaxed">
                  {exp.role}
                </p>

                <div className="space-y-1.5 pt-1">
                  <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider block">
                    Object-Oriented Design Principles:
                  </span>
                  <ul className="space-y-1">
                    {exp.principles.map((pr, i) => (
                      <li key={i} className="text-xs text-slate-400 flex items-start gap-1.5">
                        <span className="text-emerald-400 select-none font-bold">✔</span>
                        <span>{pr}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ------------------------------------------------------------- */}
      {/* 3. SAMPLE INPUT / OUTPUT & LOGIC */}
      {/* ------------------------------------------------------------- */}
      {activeSubTab === 'samples' && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Sample 1: Normal */}
            <div className="rounded-xl border border-emerald-800/60 bg-emerald-950/20 p-5 space-y-4">
              <div className="flex items-center gap-2 text-emerald-400">
                <ShieldCheck className="w-5 h-5" />
                <h3 className="font-bold text-sm">Sample Normal Transaction (Scenario 1)</h3>
              </div>

              <div>
                <span className="text-xs font-semibold text-slate-400 block mb-1">Input Payload:</span>
                <pre className="p-3 rounded-lg bg-slate-950/90 border border-slate-800 text-[11px] font-mono text-slate-300 overflow-x-auto">
{`Transaction normalTx = new Transaction(
    "TX-88219",
    "USR-4092",
    42.50,                             // Consistent with user ₹45 baseline
    LocalDateTime.of(2026, 9, 28, 12, 30), // Midday 12:30 PM
    "San Francisco, CA",               // User's registered home city
    "MOBILE_APP",                      // Biometric authenticated
    "GROCERY_ESSENTIALS",              // Low-risk category
    1,                                 // 1 tx in 10-minute window
    45.00                              // User historical avg
);`}
                </pre>
              </div>

              <div>
                <span className="text-xs font-semibold text-slate-400 block mb-1">System Evaluation Output:</span>
                <pre className="p-3 rounded-lg bg-slate-950/90 border border-emerald-900/60 text-[11px] font-mono text-emerald-300">
{`Evaluation Outcome:
  * Transaction Status : NORMAL
  * Computed Risk Score: 0.141
  * Detection Threshold: 0.65
  * System Message     : APPROVED: Transaction TX-88219 cleared as NORMAL. Risk Score: 0.141 (Threshold: 0.65).`}
                </pre>
              </div>

              <p className="text-xs text-slate-400">
                <strong className="text-slate-200">Outcome Analysis:</strong> All feature vectors remain near zero. Amount ratio is 0.94x baseline, normal daylight hours, registered domestic location. Risk score 0.141 is well below the 0.65 threshold.
              </p>
            </div>

            {/* Sample 2: Suspicious */}
            <div className="rounded-xl border border-red-800/60 bg-red-950/20 p-5 space-y-4">
              <div className="flex items-center gap-2 text-red-400">
                <AlertOctagon className="w-5 h-5" />
                <h3 className="font-bold text-sm">Sample Suspicious Transaction (Scenario 2)</h3>
              </div>

              <div>
                <span className="text-xs font-semibold text-slate-400 block mb-1">Input Payload:</span>
                <pre className="p-3 rounded-lg bg-slate-950/90 border border-slate-800 text-[11px] font-mono text-slate-300 overflow-x-auto">
{`Transaction suspiciousTx = new Transaction(
    "TX-99401",
    "USR-4092",
    4950.00,                           // 110x higher than ₹45 baseline
    LocalDateTime.of(2026, 9, 28, 3, 42),  // 3:42 AM dormant sleep window
    "Lagos, Nigeria (Foreign Proxy)",  // Extreme geographical discrepancy
    "WEB_PORTAL",
    "CRYPTO_EXCHANGE",                 // High risk category
    6,                                 // Burst of 6 tx in 10 minutes
    45.00                              // User historical avg
);`}
                </pre>
              </div>

              <div>
                <span className="text-xs font-semibold text-slate-400 block mb-1">System Evaluation Output:</span>
                <pre className="p-3 rounded-lg bg-slate-950/90 border border-red-900/60 text-[11px] font-mono text-red-300">
{`Evaluation Outcome:
  * Transaction Status : SUSPICIOUS
  * Computed Risk Score: 0.948
  * Detection Threshold: 0.65
  * Fraud Alert Banner : ALERT: Transaction TX-99401 flagged as SUSPICIOUS!
                         Risk Score (0.948) exceeds threshold (0.65).
  * Generated Case ID  : FC-1004
  * Forensic Triggers  :
      - Amount ₹4950.00 is 110.0x higher than user 30-day baseline (₹45.00)
      - Transaction location flagged as high-risk cross-border or foreign proxy
      - Unusual velocity burst: 6 transactions in 10-minute window
      - Off-hours execution during dormant sleep window (02:00 - 05:00)
      - Elevated merchant category risk: CRYPTO_EXCHANGE`}
                </pre>
              </div>

              <p className="text-xs text-slate-400">
                <strong className="text-slate-200">Outcome Analysis:</strong> Multiple anomalous dimensions trigger simultaneously. The calibrated logit produces a sigmoid risk score of 0.948, immediately breaching the threshold and generating an auditable <code className="text-red-300 font-mono">FraudCase</code>.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* ------------------------------------------------------------- */}
      {/* 4. DETECTION MATH & PERCEPTRON FORMULA */}
      {/* ------------------------------------------------------------- */}
      {activeSubTab === 'math' && (
        <div className="rounded-xl border border-slate-800 bg-[#0d1424] p-6 space-y-6 shadow-xl">
          <div className="border-b border-slate-800 pb-4">
            <h3 className="text-base font-bold text-slate-100 flex items-center gap-2">
              <Calculator className="w-5 h-5 text-violet-400" />
              Algorithmic Core: Calibrated Sigmoid Perceptron
            </h3>
            <p className="text-xs text-slate-400 mt-1">
              Mathematical specification of the scoring model implemented in <code className="text-cyan-300 font-mono">RuleEngine.java</code>.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-4">
              <div className="p-4 rounded-xl bg-slate-950 border border-slate-800 font-mono text-xs space-y-3">
                <span className="text-slate-400 uppercase tracking-wider text-[10px] block">
                  1. Linear Weighted Feature Dot Product (W · X)
                </span>
                <div className="text-cyan-300 font-bold text-sm bg-slate-900 p-2.5 rounded border border-slate-800">
                  WeightedSum = Σ ( w_i × x_i )
                </div>
                <p className="text-slate-400 text-[11px] leading-relaxed">
                  Where each <span className="text-slate-200">x_i ∈ [0.0, 1.0]</span> is the normalized risk feature score and <span className="text-slate-200">w_i</span> are administrator-calibrated weights normalized to Σ w_i = 1.0.
                </p>
              </div>

              <div className="p-4 rounded-xl bg-slate-950 border border-slate-800 font-mono text-xs space-y-3">
                <span className="text-slate-400 uppercase tracking-wider text-[10px] block">
                  2. Sigmoidal Activation Transformation
                </span>
                <div className="text-emerald-400 font-bold text-sm bg-slate-900 p-2.5 rounded border border-slate-800">
                  RiskScore = 1.0 / ( 1.0 + e^(- (4.5 × WeightedSum - 1.8)) )
                </div>
                <p className="text-slate-400 text-[11px] leading-relaxed">
                  Maps arbitrary weighted inputs into a smooth, continuously differentiable probability distribution in [0.0, 1.0].
                </p>
              </div>
            </div>

            <div className="space-y-3 text-xs text-slate-300">
              <span className="font-bold text-slate-200 block text-sm">
                Default Calibrated Feature Weights:
              </span>
              <ul className="space-y-2 font-mono">
                <li className="p-2.5 rounded bg-slate-900/80 border border-slate-800 flex justify-between">
                  <span className="text-cyan-300">w_amount (Financial Ratio Anomaly)</span>
                  <span className="font-bold text-white">0.30</span>
                </li>
                <li className="p-2.5 rounded bg-slate-900/80 border border-slate-800 flex justify-between">
                  <span className="text-cyan-300">w_location (Geolocation / Proxy Discrepancy)</span>
                  <span className="font-bold text-white">0.25</span>
                </li>
                <li className="p-2.5 rounded bg-slate-900/80 border border-slate-800 flex justify-between">
                  <span className="text-cyan-300">w_velocity (10-Minute Transaction Burst)</span>
                  <span className="font-bold text-white">0.20</span>
                </li>
                <li className="p-2.5 rounded bg-slate-900/80 border border-slate-800 flex justify-between">
                  <span className="text-cyan-300">w_time (Dormant Sleep Window Anomaly)</span>
                  <span className="font-bold text-white">0.15</span>
                </li>
                <li className="p-2.5 rounded bg-slate-900/80 border border-slate-800 flex justify-between">
                  <span className="text-cyan-300">w_merchant (High-Risk Category Multiplier)</span>
                  <span className="font-bold text-white">0.10</span>
                </li>
              </ul>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
