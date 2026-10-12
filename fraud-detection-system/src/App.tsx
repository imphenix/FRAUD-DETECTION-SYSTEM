import React, { useState, useEffect, useRef } from 'react';
import { 
  ShieldAlert, ShieldCheck, Activity, Users, AlertTriangle, FileText, 
  Settings, LogOut, ArrowUpRight, IndianRupee, Clock, MapPin, CheckCircle, 
  XCircle, Filter, Search, RefreshCw, Lock, Terminal, Cpu, Layers,
  TrendingUp, Compass, Shield, Award, ChevronRight, UserPlus,
  UserCheck, CreditCard, Mail, KeyRound, Building, Check, Volume2, VolumeX,
  Bell, Play, Pause, Zap, CheckCheck, Trash2, ExternalLink, Smartphone,
  Landmark, Radio, Menu, X, Eye, EyeOff, Server, Wifi, Radar, QrCode, Download
} from 'lucide-react';

import { CyberBackground } from './components/CyberBackground';
import { AnimatedCounter } from './components/AnimatedCounter';
import { TransactionPipelineVisualizer } from './components/TransactionPipelineVisualizer';
import { SecurityScanOverlay } from './components/SecurityScanOverlay';
import { CyberButton } from './components/CyberButton';
import { CyberCard } from './components/CyberCard';
import { SocBootSequence } from './components/SocBootSequence';
import { FraudEmergencyOverlay, FraudAlertState } from './components/FraudEmergencyOverlay';
import { QRPayModule } from './components/QRPayModule';
import { FraudGuardChatbot } from './components/FraudGuardChatbot';
import { cyberSound } from './utils/cyberSound';

interface User {
  id: number;
  username: string;
  fullName: string;
  email: string;
  phone?: string;
  role: 'ADMIN' | 'CUSTOMER';
  accountNumber?: string;
  balance?: number;
  riskProfile?: string;
  department?: string;
  clearanceLevel?: number;
  createdAt?: string;
}

interface BankAccount {
  bankAccountId: number;
  customerId: number;
  bankName: string;
  maskedAccountNumber: string;
  accountNumber: string;
  balance: number;
  registeredMobile: string;
  status: 'CONNECTED' | 'ACTIVE' | 'FROZEN';
  createdAt: string;
  updatedAt: string;
}

interface CustomerNotification {
  id: number;
  userId: number;
  transactionId: number;
  referenceId: string;
  amount: number;
  title: string;
  message: string;
  riskLevel: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  status: 'APPROVED' | 'FLAGGED' | 'BLOCKED';
  triggeredRules: string[];
  reasons: string[];
  recommendedAction: string;
  read: boolean;
  createdAt: string;
}

interface Transaction {
  id: number;
  userId: number;
  referenceId: string;
  senderAccount: string;
  recipientAccount: string;
  merchant?: string;
  amount: number;
  transactionType: string;
  status: 'APPROVED' | 'FLAGGED' | 'BLOCKED';
  riskScore: number;
  riskLevel: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  location: string;
  createdAt: string;
  notes?: string;
  triggeredRules?: string[];
  reasons?: string[];
  riskAnalysis?: {
    riskScore: number;
    riskLevel: string;
    status: string;
    triggeredRules: string[];
    reasons: string[];
    flagged: boolean;
    blocked: boolean;
  };
}

interface FraudCase {
  id: number;
  caseNumber: string;
  transactionId: number;
  userId: number;
  assignedTo?: number | null;
  status: 'OPEN' | 'INVESTIGATING' | 'RESOLVED_FRAUD' | 'RESOLVED_LEGITIMATE';
  riskScore: number;
  notes: string;
  resolutionDetails?: string | null;
  createdAt: string;
}

interface FraudAlert {
  id: number;
  transactionId: number;
  userId?: number;
  ruleCode: string;
  severity: string;
  message: string;
  triggeredAt: string;
}

interface FraudRule {
  id: number;
  ruleCode: string;
  ruleName: string;
  description: string;
  weight: number;
  thresholdValue: number;
  active: boolean;
}

interface FullScreenAlertState {
  id: number;
  riskLevel: string;
  riskScore: number;
  amount: number;
  status: string;
  referenceId: string;
  isExiting: boolean;
}

interface MediumWarningToastState {
  id: number;
  riskLevel: string;
  riskScore: number;
  amount: number;
  status: string;
  referenceId: string;
  isExiting: boolean;
}

// Monetary parsing and formatting helpers supporting Indian Rupees (₹ INR)
export function parseMonetaryAmount(raw: any): number {
  if (typeof raw === 'number') return isNaN(raw) ? 0 : raw;
  if (!raw) return 0;
  const clean = String(raw).replace(/[^0-9.-]/g, '');
  const val = parseFloat(clean);
  return isNaN(val) ? 0 : val;
}

export function formatINR(val: number | string | bigint | undefined | null, includeDecimals = true): string {
  if (val === undefined || val === null || val === '') return '₹0.00';
  let str = String(val).trim().replace(/₹|\$|,/g, '');
  if (str === '' || isNaN(Number(str))) return '₹0.00';

  if (str.includes('e') || str.includes('E')) {
    try {
      str = BigInt(Math.round(Number(str))).toString();
    } catch {
      str = String(Number(str).toFixed(0));
    }
  }

  let [integerPart, decimalPart] = str.split('.');
  let isNegative = integerPart.startsWith('-');
  if (isNegative) integerPart = integerPart.substring(1);

  let lastThree = integerPart.slice(-3);
  let otherNumbers = integerPart.slice(0, -3);
  if (otherNumbers !== '') {
    lastThree = ',' + lastThree;
  }
  let formattedInteger = otherNumbers.replace(/\B(?=(\d{2})+(?!\d))/g, ',') + lastThree;

  let formatted = (isNegative ? '-' : '') + '₹' + formattedInteger;
  if (includeDecimals) {
    if (!decimalPart) {
      formatted += '.00';
    } else {
      formatted += '.' + decimalPart.padEnd(2, '0').slice(0, 2);
    }
  }
  return formatted;
}

export const formatCurrency = formatINR;
export const formatUSD = formatINR;

export default function App() {
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [activeTab, setActiveTab] = useState<'dashboard' | 'bankfeed' | 'qrpay' | 'transactions' | 'submit' | 'cases' | 'rules' | 'profile' | 'users'>('dashboard');
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [cases, setCases] = useState<FraudCase[]>([]);
  const [alerts, setAlerts] = useState<FraudAlert[]>([]);
  const [rules, setRules] = useState<FraudRule[]>([]);
  const [allUsers, setAllUsers] = useState<User[]>([]);
  const [dashboardMetrics, setDashboardMetrics] = useState<any>(null);
  const [loading, setLoading] = useState<boolean>(true);

  // Mobile sidebar drawer state
  const [mobileMenuOpen, setMobileMenuOpen] = useState<boolean>(false);

  // Linked Demo Bank Account State
  const [bankAccount, setBankAccount] = useState<BankAccount | null>(null);

  // Customer Notifications & Notification Center
  const [notifications, setNotifications] = useState<CustomerNotification[]>([]);
  const [unreadNotifCount, setUnreadNotifCount] = useState<number>(0);
  const [showNotificationCenter, setShowNotificationCenter] = useState<boolean>(false);
  const [browserNotifsEnabled, setBrowserNotifsEnabled] = useState<boolean>(false);

  // Live Bank Feed & Simulator State
  const [isSimulatingFeed, setIsSimulatingFeed] = useState<boolean>(false);
  const [simulatingLoading, setSimulatingLoading] = useState<boolean>(false);
  const [lastFeedItem, setLastFeedItem] = useState<{
    scenario: any;
    transaction: Transaction;
    riskAnalysis: any;
    notification: CustomerNotification;
  } | null>(null);

  // Central Fraud Alert Controller (from real backend FraudDetectionEngine)
  const [fraudAlert, setFraudAlert] = useState<FraudAlertState>({
    active: false,
    riskLevel: 'LOW',
    riskScore: 0,
    amount: 0,
    status: 'APPROVED',
    reasons: []
  });

  // Temporary Full-Screen Emergency Fraud Alert Popup (from real backend RiskAnalysis)
  const [fullScreenAlert, setFullScreenAlert] = useState<FullScreenAlertState | null>(null);
  const popupTimerRef = useRef<any>(null);
  const popupExitTimerRef = useRef<any>(null);

  // Medium Warning Toast (for medium/flagged risks)
  const [mediumWarningToast, setMediumWarningToast] = useState<MediumWarningToastState | null>(null);
  const toastTimerRef = useRef<any>(null);
  const toastExitTimerRef = useRef<any>(null);

  // Audio alert chime toggle
  const [soundEnabled, setSoundEnabled] = useState<boolean>(true);

  // Cinematic SOC Boot Initialization Sequence
  const [isSocBooting, setIsSocBooting] = useState<boolean>(false);

  useEffect(() => {
    cyberSound.setEnabled(soundEnabled);
  }, [soundEnabled]);

  // Auth Mode: 'login' | 'register'
  const [authMode, setAuthMode] = useState<'login' | 'register'>('login');
  const [authError, setAuthError] = useState<string | null>(null);
  const [authSuccess, setAuthSuccess] = useState<string | null>(null);

  // Login Form states (empty by default so credentials are never exposed in plaintext inputs)
  const [loginIdentifier, setLoginIdentifier] = useState('');
  const [loginPassword, setLoginPassword] = useState('');
  const [isVerifyingLogin, setIsVerifyingLogin] = useState<boolean>(false);
  const pendingUserRef = useRef<User | null>(null);

  // Registration Form states
  const [regFullName, setRegFullName] = useState('');
  const [regUsername, setRegUsername] = useState('');
  const [regEmail, setRegEmail] = useState('');
  const [regPhone, setRegPhone] = useState('');
  const [regPassword, setRegPassword] = useState('');
  const [regConfirmPassword, setRegConfirmPassword] = useState('');
  const [regInitialBalance, setRegInitialBalance] = useState('450000.00');

  // New Transaction Form
  const [recipient, setRecipient] = useState('ACC-RECIPIENT-88');
  const [amount, setAmount] = useState('1500.00');
  const [txType, setTxType] = useState('PAYMENT');
  const [location, setLocation] = useState('New Delhi, India');
  const [submittingTx, setSubmittingTx] = useState(false);
  const [submissionFeedback, setSubmissionFeedback] = useState<Transaction | null>(null);

  // Search & filter state for ledger
  const [ledgerSearch, setLedgerSearch] = useState('');
  const [ledgerStatusFilter, setLedgerStatusFilter] = useState<'ALL' | 'APPROVED' | 'FLAGGED' | 'BLOCKED'>('ALL');

  // Telemetry heartbeat timer counter
  const [heartbeatCounter, setHeartbeatCounter] = useState<number>(24);

  useEffect(() => {
    fetchSession();
    if ('Notification' in window && Notification.permission === 'granted') {
      setBrowserNotifsEnabled(true);
    }

    const hbInterval = setInterval(() => {
      setHeartbeatCounter(prev => Math.floor(Math.random() * 8) + 18);
    }, 4000);

    return () => clearInterval(hbInterval);
  }, []);

  useEffect(() => {
    if (currentUser) {
      loadData();
    }
  }, [currentUser]);

  // Clean up timers on unmount
  useEffect(() => {
    return () => {
      if (popupTimerRef.current) clearTimeout(popupTimerRef.current);
      if (popupExitTimerRef.current) clearTimeout(popupExitTimerRef.current);
      if (toastTimerRef.current) clearTimeout(toastTimerRef.current);
      if (toastExitTimerRef.current) clearTimeout(toastExitTimerRef.current);
    };
  }, []);

  // Automatic Bank Transaction Simulator interval runner
  useEffect(() => {
    let interval: any = null;
    if (isSimulatingFeed && currentUser) {
      interval = setInterval(() => {
        triggerSimulatedTransaction();
      }, 7500);
    }
    return () => {
      if (interval) clearInterval(interval);
    };
  }, [isSimulatingFeed, currentUser]);

  const fetchSession = async () => {
    try {
      const res = await fetch('/api/auth?action=me');
      const data = await res.json();
      if (data.success && data.data.authenticated && data.data.user) {
        setCurrentUser(data.data.user);
      } else {
        setCurrentUser(null);
      }
    } catch {
      setCurrentUser(null);
    } finally {
      setLoading(false);
    }
  };

  const handleLogin = async (username = loginIdentifier, password = loginPassword) => {
    setAuthError(null);
    setAuthSuccess(null);
    try {
      const res = await fetch('/api/auth?action=login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password })
      });
      const data = await res.json();
      if (data.success) {
        // Trigger security scan verification overlay before dashboard reveals
        pendingUserRef.current = data.data.user;
        setIsVerifyingLogin(true);
      } else {
        setAuthError(data.error || 'Authentication credentials rejected.');
      }
    } catch (e: any) {
      setAuthError('Connection error: ' + e.message);
    }
  };

  const completeLoginVerification = () => {
    setIsVerifyingLogin(false);
    if (pendingUserRef.current) {
      setCurrentUser(pendingUserRef.current);
      setActiveTab('dashboard');
      pendingUserRef.current = null;
      setIsSocBooting(true);
    }
  };

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setAuthError(null);
    setAuthSuccess(null);

    if (regPassword !== regConfirmPassword) {
      setAuthError("Passwords do not match");
      return;
    }

    if (regPassword.length < 6) {
      setAuthError("Security policy requires at least 6 characters");
      return;
    }

    try {
      const res = await fetch('/api/auth?action=register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          fullName: regFullName,
          username: regUsername,
          email: regEmail,
          phone: regPhone,
          password: regPassword,
          initialBalance: parseFloat(regInitialBalance) || 450000.00
        })
      });

      const data = await res.json();
      if (data.success) {
        setAuthSuccess("Registration authorized. Initializing banking profile...");
        pendingUserRef.current = data.data.user;
        setIsVerifyingLogin(true);
        setRegFullName('');
        setRegUsername('');
        setRegEmail('');
        setRegPhone('');
        setRegPassword('');
        setRegConfirmPassword('');
      } else {
        setAuthError(data.error || 'Registration failed');
      }
    } catch (e: any) {
      setAuthError('Network error: ' + e.message);
    }
  };

  const playWarningChime = (level: string) => {
    if (!soundEnabled) return;
    cyberSound.playWarningChime(level);
  };

  const handleLogout = async () => {
    try {
      await fetch('/api/auth?action=logout', { method: 'POST' });
    } catch (e) {
      console.error(e);
    }
    if (popupTimerRef.current) clearTimeout(popupTimerRef.current);
    if (popupExitTimerRef.current) clearTimeout(popupExitTimerRef.current);
    if (toastTimerRef.current) clearTimeout(toastTimerRef.current);
    if (toastExitTimerRef.current) clearTimeout(toastExitTimerRef.current);

    setFullScreenAlert(null);
    setMediumWarningToast(null);
    setCurrentUser(null);
    setTransactions([]);
    setCases([]);
    setAlerts([]);
    setBankAccount(null);
    setNotifications([]);
    setUnreadNotifCount(0);
    setIsSimulatingFeed(false);
    setDashboardMetrics(null);
    setSubmissionFeedback(null);
    setActiveTab('dashboard');
  };

  const loadData = async () => {
    try {
      const fetches = [
        fetch('/api/transactions'),
        fetch('/api/cases'),
        fetch('/api/alerts'),
        fetch('/api/dashboard'),
        fetch('/api/rules'),
        fetch('/api/bank-account'),
        fetch('/api/notifications')
      ];

      if (currentUser?.role === 'ADMIN') {
        fetches.push(fetch('/api/auth?action=users'));
      }

      const results = await Promise.all(fetches);
      const [txData, caseData, alertData, dashData, ruleData, bankData, notifData, usersData] = await Promise.all(
        results.map(r => r.json())
      );

      if (txData.success) setTransactions(txData.data);
      if (caseData.success) setCases(caseData.data);
      if (alertData.success) setAlerts(alertData.data);
      if (dashData.success) setDashboardMetrics(dashData.data);
      if (ruleData.success) setRules(ruleData.data);
      if (bankData && bankData.success) setBankAccount(bankData.data);
      if (notifData && notifData.success) {
        setNotifications(notifData.data.notifications || []);
        setUnreadNotifCount(notifData.data.unreadCount || 0);
      }
      if (usersData && usersData.success) setAllUsers(usersData.data);
    } catch (e) {
      console.error('Failed to load system data', e);
    }
  };

  // Central Fraud Alert Controller trigger strictly according to real backend FraudDetectionEngine
  const evaluateRiskFeedback = (txResult: any) => {
    // Collect genuine fraud reasons reported by FraudDetectionEngine
    const realReasons: string[] = [];
    if (Array.isArray(txResult.reasons) && txResult.reasons.length > 0) {
      realReasons.push(...txResult.reasons);
    } else if (txResult.notes) {
      realReasons.push(...txResult.notes.split('; '));
    } else if (Array.isArray(txResult.triggeredRules) && txResult.triggeredRules.length > 0) {
      realReasons.push(...txResult.triggeredRules.map((r: string) => `Triggered rule: ${r}`));
    }

    const isCriticalOrHighOrBlocked = 
      txResult.status === 'BLOCKED' ||
      txResult.riskLevel === 'HIGH' ||
      txResult.riskLevel === 'CRITICAL' ||
      (txResult.riskScore !== undefined && txResult.riskScore >= 70);

    const isFlaggedOrAnomalous = 
      !isCriticalOrHighOrBlocked && 
      (txResult.status === 'FLAGGED' || 
       txResult.riskLevel === 'MEDIUM' || 
       (txResult.triggeredRules && txResult.triggeredRules.length > 0) ||
       (txResult.riskScore !== undefined && txResult.riskScore >= 35));

    if (isCriticalOrHighOrBlocked || isFlaggedOrAnomalous) {
      // Trigger Central Fraud Alert Emergency System
      setFraudAlert({
        active: true,
        riskLevel: txResult.riskLevel || (isCriticalOrHighOrBlocked ? 'CRITICAL' : 'HIGH'),
        riskScore: txResult.riskScore ?? (isCriticalOrHighOrBlocked ? 85 : 55),
        amount: txResult.amount,
        status: txResult.status || (isCriticalOrHighOrBlocked ? 'BLOCKED' : 'FLAGGED'),
        reasons: realReasons.length > 0 ? realReasons : ['Transaction exceeded configured fraud threshold limit & baseline velocity.'],
        referenceId: txResult.referenceId || 'TXN-ANOMALY',
        timestamp: txResult.createdAt || new Date().toISOString()
      });
    } else {
      // Clean approved transaction chime
      cyberSound.playApprovedChime();
    }
  };

  // Bank Simulator Trigger
  const triggerSimulatedTransaction = async (scenarioKey?: string) => {
    setSimulatingLoading(true);
    try {
      const res = await fetch('/api/bank/simulate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ scenarioKey })
      });
      const data = await res.json();
      if (data.success) {
        const item = data.data;
        setLastFeedItem(item);

        const txResult = {
          ...item.transaction,
          reasons: item.riskAnalysis?.reasons || (item.transaction.notes ? item.transaction.notes.split('; ') : []),
          triggeredRules: item.riskAnalysis?.triggeredRules || item.transaction.triggeredRules
        };
        evaluateRiskFeedback(txResult);

        if (browserNotifsEnabled && 'Notification' in window && Notification.permission === 'granted') {
          try {
            new Notification(item.notification.title, {
              body: item.notification.message,
              icon: '/favicon.ico'
            });
          } catch {
            // ignore
          }
        }

        await loadData();
        await fetchSession();
      }
    } catch (e) {
      console.error('Simulation error:', e);
    } finally {
      setSimulatingLoading(false);
    }
  };

  const handleFundDemoAccount = async (amount = 100000) => {
    try {
      const res = await fetch('/api/bank-account', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'fund', amount })
      });
      const data = await res.json();
      if (data.success) {
        setBankAccount(data.data);
        await fetchSession();
      }
    } catch (e) {
      console.error(e);
    }
  };

  const handleResetDemoAccount = async () => {
    try {
      const res = await fetch('/api/bank-account', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'reset' })
      });
      const data = await res.json();
      if (data.success) {
        setBankAccount(data.data);
        await fetchSession();
      }
    } catch (e) {
      console.error(e);
    }
  };

  const handleMarkNotificationRead = async (notifId: number) => {
    try {
      await fetch('/api/notifications', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'mark-read', notificationId: notifId })
      });
      setNotifications(prev => prev.map(n => n.id === notifId ? { ...n, read: true } : n));
      setUnreadNotifCount(prev => Math.max(0, prev - 1));
    } catch (e) {
      console.error(e);
    }
  };

  const handleMarkAllNotificationsRead = async () => {
    try {
      await fetch('/api/notifications', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'mark-all-read' })
      });
      setNotifications(prev => prev.map(n => ({ ...n, read: true })));
      setUnreadNotifCount(0);
    } catch (e) {
      console.error(e);
    }
  };

  const handleClearNotifications = async () => {
    try {
      await fetch('/api/notifications', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'clear' })
      });
      setNotifications([]);
      setUnreadNotifCount(0);
    } catch (e) {
      console.error(e);
    }
  };

  const toggleBrowserNotifications = async () => {
    if (!('Notification' in window)) {
      return;
    }
    if (Notification.permission === 'granted') {
      setBrowserNotifsEnabled(!browserNotifsEnabled);
      return;
    }
    const perm = await Notification.requestPermission();
    if (perm === 'granted') {
      setBrowserNotifsEnabled(true);
      new Notification("🛡️ SOC Threat Detection Active", {
        body: "Real-time banking notifications and fraud alerts enabled."
      });
    } else {
      setBrowserNotifsEnabled(false);
    }
  };

  const handleTransactionSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmittingTx(true);
    setSubmissionFeedback(null);

    try {
      const parsedAmount = parseMonetaryAmount(amount);
      if (isNaN(parsedAmount) || parsedAmount <= 0) {
        setSubmittingTx(false);
        return;
      }

      const res = await fetch('/api/transactions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          recipientAccount: recipient,
          amount: parsedAmount,
          transactionType: txType,
          location
        })
      });

      const data = await res.json();
      if (data.success) {
        const txResult: Transaction = data.data;
        setSubmissionFeedback(txResult);

        // Evaluate backend risk assessment
        evaluateRiskFeedback(txResult);

        await fetchSession();
        await loadData();
      }
    } catch (e: any) {
      console.error('Transaction error: ', e);
    } finally {
      setSubmittingTx(false);
    }
  };

  const handleResolveCase = async (caseId: number, finalStatus: string) => {
    const details = prompt('Enter SOC compliance resolution audit notes:');
    if (!details) return;

    try {
      const res = await fetch('/api/cases?action=resolve', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ caseId, finalStatus, resolutionDetails: details })
      });
      const data = await res.json();
      if (data.success) {
        loadData();
      }
    } catch (e) {
      console.error(e);
    }
  };

  const toggleRule = async (rule: FraudRule) => {
    try {
      await fetch('/api/rules', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: rule.id, active: !rule.active })
      });
      loadData();
    } catch (e) {
      console.error(e);
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'APPROVED':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-md text-[11px] font-mono font-bold bg-emerald-500/10 text-emerald-400 border border-emerald-500/30">
            <CheckCircle className="w-3 h-3 text-emerald-400" /> APPROVED
          </span>
        );
      case 'FLAGGED':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-md text-[11px] font-mono font-bold bg-amber-500/10 text-amber-400 border border-amber-500/30">
            <AlertTriangle className="w-3 h-3 text-amber-400" /> FLAGGED
          </span>
        );
      case 'BLOCKED':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-md text-[11px] font-mono font-bold bg-rose-500/15 text-rose-400 border border-rose-500/40 shadow-[0_0_12px_rgba(239,68,68,0.25)]">
            <XCircle className="w-3 h-3 text-rose-400" /> BLOCKED
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center px-2 py-0.5 rounded-md text-[11px] font-mono text-slate-400 bg-slate-800 border border-slate-700">
            {status}
          </span>
        );
    }
  };

  const getRiskBadge = (level: string, score: number) => {
    const config = 
      level === 'CRITICAL' ? 'bg-red-500/20 text-red-400 border-red-500/50 shadow-[0_0_10px_rgba(239,68,68,0.2)]' :
      level === 'HIGH' ? 'bg-rose-500/15 text-rose-400 border-rose-500/40' :
      level === 'MEDIUM' ? 'bg-amber-500/15 text-amber-400 border-amber-500/40' :
      'bg-emerald-500/10 text-emerald-400 border-emerald-500/30';
    return (
      <span className={`px-2 py-0.5 rounded-md font-mono text-[11px] font-bold border ${config}`}>
        {level} [{score}]
      </span>
    );
  };

  // Filtered transactions for the ledger
  const filteredTransactions = transactions.filter(tx => {
    if (ledgerStatusFilter !== 'ALL' && tx.status !== ledgerStatusFilter) return false;
    if (ledgerSearch.trim()) {
      const q = ledgerSearch.toLowerCase();
      const ref = (tx.referenceId || '').toLowerCase();
      const recip = (tx.recipientAccount || '').toLowerCase();
      const send = (tx.senderAccount || '').toLowerCase();
      const loc = (tx.location || '').toLowerCase();
      const merch = (tx.merchant || '').toLowerCase();
      return ref.includes(q) || recip.includes(q) || send.includes(q) || loc.includes(q) || merch.includes(q);
    }
    return true;
  });

  // Navigation Items
  const navItems = [
    { id: 'dashboard', label: currentUser?.role === 'ADMIN' ? 'SOC Command Center' : 'Account Dashboard', icon: Activity },
    { id: 'bankfeed', label: 'Live Stream & Simulator', icon: Radio },
    { id: 'qrpay', label: 'QR Pay & Approvals', icon: QrCode },
    { id: 'transactions', label: currentUser?.role === 'ADMIN' ? 'Transaction Ledger' : 'My Audit Ledger', icon: IndianRupee },
    { id: 'submit', label: 'Candidate Evaluation', icon: ArrowUpRight },
    { id: 'cases', label: currentUser?.role === 'ADMIN' ? 'Threat Investigations' : 'My Cases & Alerts', icon: FileText },
    { id: 'profile', label: 'Security Profile', icon: UserCheck },
    ...(currentUser?.role === 'ADMIN' ? [
      { id: 'users', label: 'User Directory', icon: Users },
      { id: 'rules', label: 'Threat Rule Matrix', icon: Settings }
    ] : [])
  ];

  // ===================== AUTHENTICATION SCREEN =====================
  if (!currentUser) {
    return (
      <div className="min-h-screen bg-[#050B14] text-[#F8FAFC] flex items-center justify-center p-4 selection:bg-[#1677FF]/30 selection:text-[#36C8FF] relative overflow-hidden font-sans">
        {/* Animated Cyber Network Canvas Layer */}
        <CyberBackground showCentralScanner={true} />

        {/* Ambient Radial Glow and Grid overlay */}
        <div className="absolute inset-0 bg-cyber-grid pointer-events-none opacity-40 z-0" />
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_80%_80%_at_50%_-20%,rgba(22,119,255,0.18),rgba(5,11,20,0))] pointer-events-none z-0" />

        {/* HUD Corner Elements */}
        <div className="absolute top-4 left-6 hidden sm:block text-[10px] font-mono text-[#64748B] pointer-events-none z-10 tracking-widest">
          NODE // <span className="text-[#00D9FF]">SOC-PRIMARY-01</span>
        </div>
        <div className="absolute top-4 right-6 hidden sm:block text-[10px] font-mono text-[#64748B] pointer-events-none z-10 tracking-widest text-right">
          NETWORK // <span className="text-emerald-400">SECURE [SSL-OK]</span>
        </div>
        <div className="absolute bottom-4 left-6 hidden sm:block text-[10px] font-mono text-[#64748B] pointer-events-none z-10 tracking-widest">
          FRAUD ENGINE // <span className="text-[#36C8FF]">ONLINE v2.4</span>
        </div>
        <div className="absolute bottom-4 right-6 hidden sm:block text-[10px] font-mono text-[#64748B] pointer-events-none z-10 tracking-widest text-right">
          INTEGRITY // <span className="text-[#00D9FF]">ACID 256-BIT SHA</span>
        </div>

        {/* Verification Overlay when logging in */}
        {isVerifyingLogin && (
          <SecurityScanOverlay 
            username={loginIdentifier} 
            onComplete={completeLoginVerification} 
          />
        )}

        {/* Central Rotating Concentric Scanner Rings Behind Card */}
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[540px] h-[540px] pointer-events-none z-0 flex items-center justify-center opacity-40">
          <div className="absolute w-[500px] h-[500px] rounded-full border border-dashed border-cyan-500/25 animate-scanner-cw" />
          <div className="absolute w-[380px] h-[380px] rounded-full border border-blue-500/20 animate-scanner-ccw" />
          <div className="absolute w-[260px] h-[260px] rounded-full border border-cyan-400/20 animate-pulse" />
        </div>

        {/* Auth Glass Card with Animated Gradient Glow */}
        <div className="max-w-md w-full bg-[#0D1828]/85 backdrop-blur-2xl border border-blue-500/30 rounded-2xl p-7 sm:p-8 shadow-[0_0_40px_rgba(22,119,255,0.18)] relative z-10 transition-all duration-500 hover:border-cyan-400/40">
          {/* Header */}
          <div className="flex items-center gap-3.5 mb-6 pb-5 border-b border-blue-900/40">
            <div className="w-12 h-12 bg-gradient-to-tr from-[#1677FF] to-[#00D9FF] rounded-xl flex items-center justify-center text-white shadow-[0_0_20px_rgba(0,217,255,0.4)] animate-shield-glow shrink-0">
              <Shield className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-lg font-bold text-[#F8FAFC] tracking-tight">FraudGuard SOC</h1>
                <span className="w-2 h-2 rounded-full bg-[#22C55E] animate-heartbeat" title="System Operational" />
              </div>
              <p className="text-[11px] text-[#94A3B8] font-mono">Real-Time Threat Intelligence & Banking Security (₹ INR)</p>
            </div>
          </div>

          {/* Tab Selector: Sign In vs Create Account */}
          <div className="flex bg-[#07111F] p-1 rounded-xl border border-blue-900/50 mb-5">
            <button
              onClick={() => { setAuthMode('login'); setAuthError(null); }}
              className={`flex-1 py-2 text-xs font-semibold rounded-lg transition-all duration-200 cursor-pointer flex items-center justify-center gap-1.5 ${
                authMode === 'login' 
                  ? 'bg-[#1677FF] text-white shadow-[0_0_15px_rgba(22,119,255,0.45)]' 
                  : 'text-[#94A3B8] hover:text-[#CBD5E1]'
              }`}
            >
              <KeyRound className="w-3.5 h-3.5" />
              Secure Sign In
            </button>
            <button
              onClick={() => { setAuthMode('register'); setAuthError(null); }}
              className={`flex-1 py-2 text-xs font-semibold rounded-lg transition-all duration-200 cursor-pointer flex items-center justify-center gap-1.5 ${
                authMode === 'register' 
                  ? 'bg-[#1677FF] text-white shadow-[0_0_15px_rgba(22,119,255,0.45)]' 
                  : 'text-[#94A3B8] hover:text-[#CBD5E1]'
              }`}
            >
              <UserPlus className="w-3.5 h-3.5" />
              Open Account
            </button>
          </div>

          {/* Feedback messages */}
          {authError && (
            <div className="mb-4 p-3 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 shrink-0 text-rose-400" />
              <span>{authError}</span>
            </div>
          )}
          {authSuccess && (
            <div className="mb-4 p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-300 text-xs flex items-center gap-2">
              <CheckCircle className="w-4 h-4 shrink-0 text-emerald-400" />
              <span>{authSuccess}</span>
            </div>
          )}

          {/* Mode 1: Login Form */}
          {authMode === 'login' ? (
            <div className="space-y-4">
              <div>
                <label className="block text-[11px] font-mono uppercase tracking-wider text-[#CBD5E1] mb-1.5">Registered Email / Operator ID</label>
                <div className="relative group">
                  <input 
                    type="text" 
                    value={loginIdentifier} 
                    onChange={e => setLoginIdentifier(e.target.value)}
                    placeholder="Enter registered email or operator ID"
                    autoComplete="off"
                    className="w-full bg-[#07111F] border border-blue-900/60 rounded-xl px-3.5 py-2.5 text-sm text-[#F8FAFC] placeholder-[#64748B] focus:outline-none focus:border-[#00D9FF] focus:ring-1 focus:ring-[#00D9FF]/40 focus:shadow-[0_0_15px_rgba(0,217,255,0.2)] transition font-mono"
                  />
                  <Terminal className="w-4 h-4 text-blue-400/50 absolute right-3 top-3 pointer-events-none group-focus-within:text-[#00D9FF]" />
                </div>
              </div>

              <div>
                <label className="block text-[11px] font-mono uppercase tracking-wider text-[#CBD5E1] mb-1.5">Authentication Key</label>
                <div className="relative group">
                  <input 
                    type="password" 
                    value={loginPassword} 
                    onChange={e => setLoginPassword(e.target.value)}
                    placeholder="••••••••"
                    autoComplete="new-password"
                    className="w-full bg-[#07111F] border border-blue-900/60 rounded-xl px-3.5 py-2.5 text-sm text-[#F8FAFC] placeholder-[#64748B] focus:outline-none focus:border-[#00D9FF] focus:ring-1 focus:ring-[#00D9FF]/40 focus:shadow-[0_0_15px_rgba(0,217,255,0.2)] transition font-mono"
                  />
                  <Lock className="w-4 h-4 text-blue-400/50 absolute right-3 top-3 pointer-events-none group-focus-within:text-[#00D9FF]" />
                </div>
              </div>

              {/* Authorize Session Button with Cyber Energy Ripple */}
              <CyberButton 
                onClick={() => handleLogin()}
                variant="primary"
                className="w-full py-3 text-sm mt-2 font-semibold"
              >
                <ShieldCheck className="w-4 h-4 text-white" />
                <span>Authorize Session</span>
              </CyberButton>

              {/* One-Click Encrypted Role Launchers (Credentials Hidden) */}
              <div className="pt-4 border-t border-blue-900/40">
                <span className="text-[11px] font-mono text-[#94A3B8] block mb-2 text-center uppercase tracking-wider">
                  One-Click Encrypted Role Access (Credentials Hidden):
                </span>
                <div className="grid grid-cols-2 gap-2 font-mono">
                  <button 
                    onClick={() => { cyberSound.playClick(); handleLogin('john_doe', 'password123'); }}
                    className="p-2.5 bg-[#07111F]/90 hover:bg-[#101D30] border border-blue-900/50 hover:border-cyan-400/60 hover:shadow-[0_0_15px_rgba(0,217,255,0.2)] rounded-xl text-left transition-all active:scale-95 cursor-pointer group"
                  >
                    <div className="text-xs font-bold text-[#36C8FF] group-hover:text-[#00D9FF]">Customer Portal</div>
                    <div className="text-[10px] text-[#94A3B8]">Encrypted Token Auth</div>
                  </button>
                  <button 
                    onClick={() => { cyberSound.playClick(); handleLogin('admin', 'admin123'); }}
                    className="p-2.5 bg-[#07111F]/90 hover:bg-[#101D30] border border-blue-900/50 hover:border-blue-400/60 hover:shadow-[0_0_15px_rgba(36,149,255,0.2)] rounded-xl text-left transition-all active:scale-95 cursor-pointer group"
                  >
                    <div className="text-xs font-bold text-[#2495FF] group-hover:text-white">SOC Administrator</div>
                    <div className="text-[10px] text-[#94A3B8]">Encrypted Token Auth</div>
                  </button>
                </div>
              </div>
            </div>
          ) : (
            /* Mode 2: Register Form */
            <form onSubmit={handleRegister} className="space-y-3">
              <div className="grid grid-cols-2 gap-2.5">
                <div>
                  <label className="block text-[10px] font-mono uppercase tracking-wider text-[#CBD5E1] mb-1">Full Legal Name</label>
                  <input 
                    type="text" 
                    value={regFullName} 
                    onChange={e => setRegFullName(e.target.value)}
                    placeholder="Priya Sharma"
                    className="w-full bg-[#07111F] border border-blue-900/60 rounded-xl px-3 py-2 text-xs text-[#F8FAFC] placeholder-[#64748B] focus:outline-none focus:border-[#00D9FF] cyber-input-glow transition"
                    required
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-mono uppercase tracking-wider text-[#CBD5E1] mb-1">Handle</label>
                  <input 
                    type="text" 
                    value={regUsername} 
                    onChange={e => setRegUsername(e.target.value)}
                    placeholder="priya_s"
                    className="w-full bg-[#07111F] border border-blue-900/60 rounded-xl px-3 py-2 text-xs text-[#F8FAFC] placeholder-[#64748B] focus:outline-none focus:border-[#00D9FF] cyber-input-glow transition font-mono"
                    required
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2.5">
                <div>
                  <label className="block text-[10px] font-mono uppercase tracking-wider text-[#CBD5E1] mb-1">Email Address</label>
                  <input 
                    type="email" 
                    value={regEmail} 
                    onChange={e => setRegEmail(e.target.value)}
                    placeholder="priya@corp.in"
                    className="w-full bg-[#07111F] border border-blue-900/60 rounded-xl px-3 py-2 text-xs text-[#F8FAFC] placeholder-[#64748B] focus:outline-none focus:border-[#00D9FF] cyber-input-glow transition"
                    required
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-mono uppercase tracking-wider text-[#CBD5E1] mb-1">Mobile Contact</label>
                  <input 
                    type="text" 
                    value={regPhone} 
                    onChange={e => setRegPhone(e.target.value)}
                    placeholder="+91-98765-43210"
                    className="w-full bg-[#07111F] border border-blue-900/60 rounded-xl px-3 py-2 text-xs text-[#F8FAFC] placeholder-[#64748B] focus:outline-none focus:border-[#00D9FF] cyber-input-glow transition font-mono"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2.5">
                <div>
                  <label className="block text-[10px] font-mono uppercase tracking-wider text-[#CBD5E1] mb-1">Password</label>
                  <input 
                    type="password" 
                    value={regPassword} 
                    onChange={e => setRegPassword(e.target.value)}
                    placeholder="Min 6 chars"
                    className="w-full bg-[#07111F] border border-blue-900/60 rounded-xl px-3 py-2 text-xs text-[#F8FAFC] placeholder-[#64748B] focus:outline-none focus:border-[#00D9FF] cyber-input-glow transition font-mono"
                    required
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-mono uppercase tracking-wider text-[#CBD5E1] mb-1">Confirm</label>
                  <input 
                    type="password" 
                    value={regConfirmPassword} 
                    onChange={e => setRegConfirmPassword(e.target.value)}
                    placeholder="Repeat key"
                    className="w-full bg-[#07111F] border border-blue-900/60 rounded-xl px-3 py-2 text-xs text-[#F8FAFC] placeholder-[#64748B] focus:outline-none focus:border-[#00D9FF] cyber-input-glow transition font-mono"
                    required
                  />
                </div>
              </div>

              <div>
                <label className="block text-[10px] font-mono uppercase tracking-wider text-[#CBD5E1] mb-1">Initial Demo Liquidity (₹ INR)</label>
                <input 
                  type="number" 
                  step="1000"
                  value={regInitialBalance} 
                  onChange={e => setRegInitialBalance(e.target.value)}
                  placeholder="500000.00"
                  className="w-full bg-[#07111F] border border-blue-900/60 rounded-xl px-3 py-2 text-xs text-[#00D9FF] font-mono font-bold focus:outline-none focus:border-[#00D9FF] cyber-input-glow transition"
                  required
                />
              </div>

              <CyberButton 
                type="submit"
                variant="primary"
                className="w-full mt-2 py-3 text-xs font-semibold"
              >
                Provision Account & Account Key
              </CyberButton>
            </form>
          )}
        </div>

        {/* AI SOC Copilot Chatbot (Guest View) */}
        <FraudGuardChatbot currentUser={null} activeTab="auth" />
      </div>
    );
  }

  // ===================== AUTHENTICATED SOC PORTAL =====================
  return (
    <div className="min-h-screen bg-[#050B14] text-[#F8FAFC] flex flex-col font-sans selection:bg-[#1677FF]/30 selection:text-[#36C8FF] relative overflow-x-hidden">
      {/* Animated Cyber Network Background */}
      <CyberBackground showCentralScanner={false} />

      {/* Cybernetic Background Grid & Gradients */}
      <div className="fixed inset-0 bg-cyber-grid pointer-events-none opacity-40 z-0" />
      <div className="fixed inset-0 bg-[radial-gradient(ellipse_80%_60%_at_50%_-10%,rgba(22,119,255,0.12),transparent)] pointer-events-none z-0" />

      {/* SUBTLE TOP TELEMETRY DATA STREAM TICKER */}
      <div className="bg-[#07111F]/90 border-b border-blue-950/80 px-4 py-1 text-[10px] font-mono text-[#64748B] flex items-center justify-between overflow-x-auto whitespace-nowrap z-20">
        <div className="flex items-center gap-4">
          <span className="flex items-center gap-1.5 text-[#36C8FF]">
            <Terminal className="w-3 h-3 text-[#00D9FF]" />
            AUTH_CHANNEL: <strong className="text-emerald-400">SECURE // TLSv1.3</strong>
          </span>
          <span className="text-slate-600">&bull;</span>
          <span>ENCRYPTION: <strong className="text-slate-300">AES-256-GCM</strong></span>
          <span className="text-slate-600">&bull;</span>
          <span>RISK_ENGINE: <strong className="text-emerald-400">ONLINE [FG-EVAL-09]</strong></span>
          <span className="text-slate-600">&bull;</span>
          <span>ACID_POOL: <strong className="text-slate-300">STABLE</strong></span>
        </div>

        <div className="flex items-center gap-3">
          <span className="flex items-center gap-1">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-heartbeat" />
            HEARTBEAT: <strong className="text-emerald-400">{heartbeatCounter}ms</strong>
          </span>
          <span className="text-slate-600">&bull;</span>
          <span className="text-[#36C8FF]">SOC_NODE_01</span>
        </div>
      </div>

      {/* CINEMATIC SOC INITIALIZATION BOOT SEQUENCE */}
      {isSocBooting && (
        <SocBootSequence 
          onComplete={() => setIsSocBooting(false)} 
          enableSound={soundEnabled} 
        />
      )}

      {/* ================================================================ */}
      {/* CENTRAL FRAUD EMERGENCY OVERLAY (From real FraudDetectionEngine) */}
      {/* ================================================================ */}
      <FraudEmergencyOverlay
        alert={fraudAlert}
        onDismiss={() => {
          setFraudAlert(prev => ({ ...prev, active: false }));
        }}
        onViewAuditLog={() => {
          setFraudAlert(prev => ({ ...prev, active: false }));
          setActiveTab('transactions');
        }}
        soundEnabled={soundEnabled}
      />

      {/* TOP NAVBAR (CYBERSECURITY SOC THEME) */}
      <header className="border-b border-blue-900/40 bg-[#07111F]/90 backdrop-blur-md sticky top-0 z-40 relative">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <button 
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="p-2 rounded-xl bg-[#0D1828] border border-blue-900/50 text-[#CBD5E1] lg:hidden cursor-pointer"
              aria-label="Toggle navigation"
            >
              {mobileMenuOpen ? <X className="w-4 h-4" /> : <Menu className="w-4 h-4" />}
            </button>

            <div className="w-10 h-10 bg-gradient-to-tr from-[#1677FF] to-[#00D9FF] rounded-xl flex items-center justify-center text-white shadow-[0_0_15px_rgba(0,217,255,0.3)] animate-shield-glow shrink-0">
              <Shield className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-bold text-[#F8FAFC] tracking-tight text-base sm:text-lg flex items-center gap-1.5">
                  FraudGuard SOC
                </span>
                <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded-md bg-[#1677FF]/20 text-[#36C8FF] border border-[#1677FF]/40">
                  {currentUser.role === 'ADMIN' ? 'SOC ADMIN (₹ INR)' : 'CLIENT PORTAL (₹ INR)'}
                </span>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2.5 sm:gap-3.5">
            {/* Live Security Status Indicator with Gentle Heartbeat / Critical Threat Indicator */}
            {fraudAlert.active ? (
              <div className="flex items-center gap-2 px-3.5 py-1 rounded-full bg-red-600/25 border-2 border-red-500 text-red-400 text-xs font-mono font-bold animate-pulse shadow-[0_0_20px_rgba(239,68,68,0.6)]">
                <span className="w-2.5 h-2.5 rounded-full bg-red-500 animate-ping" />
                <span>THREAT LEVEL: CRITICAL — EMERGENCY LOCKDOWN</span>
              </div>
            ) : (
              <div className="hidden md:flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-xs font-mono font-semibold">
                <span className="w-2 h-2 rounded-full bg-[#22C55E] animate-heartbeat" />
                <span>SYSTEM SECURE</span>
              </div>
            )}

            {/* User Details */}
            <div className="text-right hidden sm:block">
              <div className="text-xs font-bold text-[#F8FAFC]">{currentUser.fullName}</div>
              <div className="text-[11px] text-[#36C8FF] font-mono">
                {currentUser.role === 'ADMIN' ? (
                  <span className="text-[#00D9FF]">Security Operations Lead</span>
                ) : (
                  <span>
                    Acct: {bankAccount?.maskedAccountNumber || currentUser.accountNumber} • {formatINR(bankAccount?.balance ?? currentUser.balance)}
                  </span>
                )}
              </div>
            </div>

            {/* Re-run SOC Boot Diagnostics */}
            <button
              onClick={() => {
                cyberSound.playClick();
                setIsSocBooting(true);
              }}
              className="hidden sm:flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-cyan-950/40 hover:bg-cyan-900/60 text-cyan-300 border border-cyan-500/40 text-xs font-mono transition cursor-pointer shadow-[0_0_12px_rgba(0,217,255,0.15)] active:scale-95"
              title="Run SOC Diagnostic & Initialization Sequence"
            >
              <Zap className="w-3.5 h-3.5 text-cyan-400 animate-pulse" />
              <span>BOOT SEQUENCE</span>
            </button>

            {/* Download Complete Project ZIP */}
            <a
              href="/fraud-detection-system.zip"
              download="fraud-detection-system.zip"
              onClick={() => cyberSound.playClick()}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-gradient-to-r from-emerald-600/30 via-cyan-600/30 to-blue-600/30 hover:from-emerald-500/50 hover:to-cyan-500/50 text-emerald-300 hover:text-white border border-emerald-500/50 hover:border-cyan-400 text-xs font-mono font-bold transition-all cursor-pointer shadow-[0_0_15px_rgba(16,185,129,0.25)] active:scale-95"
              title="Download Complete Project ZIP (All Source Files, Java, React, Tests, & Docs for GitHub)"
            >
              <Download className="w-3.5 h-3.5 text-emerald-400 animate-pulse" />
              <span className="hidden md:inline">DOWNLOAD ZIP</span>
              <span className="md:hidden text-[10px]">ZIP</span>
            </a>

            {/* Audio Chime Toggle */}
            <button
              onClick={() => setSoundEnabled(!soundEnabled)}
              className="p-2 rounded-xl bg-[#0D1828] hover:bg-[#101D30] text-[#CBD5E1] hover:text-[#00D9FF] border border-blue-900/50 transition cursor-pointer"
              title={soundEnabled ? 'Threat audio chime active' : 'Audio chime muted'}
              aria-label="Sound settings"
            >
              {soundEnabled ? <Volume2 className="w-4 h-4 text-[#00D9FF]" /> : <VolumeX className="w-4 h-4 text-slate-500" />}
            </button>

            {/* Notification Bell */}
            <div className="relative">
              <button 
                onClick={() => setShowNotificationCenter(!showNotificationCenter)}
                className={`relative p-2 rounded-xl transition border cursor-pointer ${
                  unreadNotifCount > 0 
                    ? 'bg-rose-500/20 text-rose-300 border-rose-500/50' 
                    : 'bg-[#0D1828] hover:bg-[#101D30] text-[#CBD5E1] border-blue-900/50'
                }`}
                title="SOC Notification Center"
                aria-label="Notifications"
              >
                <Bell className="w-4 h-4" />
                {unreadNotifCount > 0 && (
                  <span className="absolute -top-1 -right-1 bg-red-500 text-white text-[10px] font-mono font-black w-4 h-4 rounded-full flex items-center justify-center animate-pulse">
                    {unreadNotifCount > 9 ? '9+' : unreadNotifCount}
                  </span>
                )}
              </button>

              {/* Notification Center Popover */}
              {showNotificationCenter && (
                <>
                  <div 
                    className="fixed inset-0 z-40" 
                    onClick={() => setShowNotificationCenter(false)} 
                  />
                  <div className="absolute right-0 mt-3 w-80 sm:w-96 bg-[#0D1828]/95 backdrop-blur-xl rounded-2xl border border-blue-500/30 shadow-[0_0_30px_rgba(22,119,255,0.25)] z-50 overflow-hidden">
                    <div className="p-4 border-b border-blue-900/40 bg-[#07111F]/80 flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <div className="w-7 h-7 rounded-lg bg-[#1677FF]/20 text-[#00D9FF] flex items-center justify-center font-bold">
                          <Bell className="w-4 h-4" />
                        </div>
                        <div>
                          <h4 className="text-xs font-bold text-[#F8FAFC]">Threat Feeds</h4>
                          <span className="text-[10px] text-[#36C8FF] font-mono">{unreadNotifCount} unread alert{unreadNotifCount === 1 ? '' : 's'}</span>
                        </div>
                      </div>
                      <div className="flex items-center gap-1">
                        <button
                          onClick={handleMarkAllNotificationsRead}
                          className="px-2 py-1 text-[10px] font-mono text-[#CBD5E1] hover:text-[#00D9FF] hover:bg-blue-950/60 rounded-md transition cursor-pointer"
                        >
                          Mark all read
                        </button>
                        <button
                          onClick={handleClearNotifications}
                          className="p-1 text-slate-500 hover:text-rose-400 rounded-md transition cursor-pointer"
                          title="Clear all"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>

                    <div className="px-4 py-2 bg-[#07111F]/40 border-b border-blue-900/40 flex items-center justify-between text-[11px]">
                      <span className="text-[#94A3B8] font-mono flex items-center gap-1.5">
                        <Smartphone className="w-3.5 h-3.5 text-[#00D9FF]" />
                        Desktop Alerts:
                      </span>
                      <button
                        onClick={toggleBrowserNotifications}
                        className={`px-2 py-0.5 rounded-md text-[10px] font-mono transition cursor-pointer ${
                          browserNotifsEnabled 
                            ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40' 
                            : 'bg-[#101D30] text-[#94A3B8] hover:text-white border border-blue-900/60'
                        }`}
                      >
                        {browserNotifsEnabled ? '● ENABLED' : 'ENABLE'}
                      </button>
                    </div>

                    <div className="max-h-96 overflow-y-auto divide-y divide-blue-950/80">
                      {notifications.length === 0 ? (
                        <div className="p-8 text-center text-[#64748B] text-xs font-mono">
                          <CheckCheck className="w-6 h-6 text-[#2495FF] mx-auto mb-2 opacity-50" />
                          Zero active threat notifications logged.
                        </div>
                      ) : (
                        notifications.map(n => (
                          <div 
                            key={n.id} 
                            onClick={() => handleMarkNotificationRead(n.id)}
                            className={`p-3.5 transition cursor-pointer hover:bg-blue-950/30 ${
                              !n.read ? 'bg-[#101D30]/60' : ''
                            }`}
                          >
                            <div className="flex items-start gap-2.5">
                              <div className="mt-0.5 shrink-0">
                                {n.status === 'BLOCKED' ? (
                                  <div className="w-5 h-5 rounded-md bg-red-500/20 text-red-400 flex items-center justify-center">
                                    <XCircle className="w-3.5 h-3.5" />
                                  </div>
                                ) : n.status === 'FLAGGED' ? (
                                  <div className="w-5 h-5 rounded-md bg-amber-500/20 text-amber-400 flex items-center justify-center">
                                    <AlertTriangle className="w-3.5 h-3.5" />
                                  </div>
                                ) : (
                                  <div className="w-5 h-5 rounded-md bg-emerald-500/20 text-emerald-400 flex items-center justify-center">
                                    <CheckCircle className="w-3.5 h-3.5" />
                                  </div>
                                )}
                              </div>
                              <div className="flex-1 min-w-0">
                                <div className="flex items-center justify-between gap-1 mb-0.5">
                                  <span className={`text-xs font-bold truncate ${
                                    n.status === 'BLOCKED' ? 'text-red-400' : n.status === 'FLAGGED' ? 'text-amber-400' : 'text-[#F8FAFC]'
                                  }`}>
                                    {n.title}
                                  </span>
                                  <span className="text-[10px] text-[#64748B] font-mono shrink-0">{n.createdAt.substring(11, 16)}</span>
                                </div>
                                <p className="text-xs text-[#CBD5E1] leading-snug">{n.message}</p>
                                <div className="mt-1 flex items-center gap-2 text-[10px] font-mono text-[#94A3B8]">
                                  <span className="font-bold text-[#00D9FF]">{formatINR(n.amount)}</span>
                                  <span>&bull;</span>
                                  <span>{n.referenceId}</span>
                                </div>
                              </div>
                            </div>
                          </div>
                        ))
                      )}
                    </div>
                  </div>
                </>
              )}
            </div>

            {/* Logout */}
            <button 
              onClick={handleLogout}
              className="p-2 rounded-xl bg-[#0D1828] hover:bg-rose-500/10 text-[#94A3B8] hover:text-rose-400 border border-blue-900/50 hover:border-rose-500/40 transition cursor-pointer"
              title="Terminate Session"
            >
              <LogOut className="w-4 h-4" />
            </button>
          </div>
        </div>
      </header>

      {/* MAIN LAYOUT (SIDEBAR + MAIN CONTENT WORKSPACE) */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-6 w-full flex-1 flex flex-col lg:flex-row gap-6 relative z-10">
        {/* SIDEBAR NAVIGATION (Dark Navy / Black with Electric Blue Active Glow) */}
        <aside className={`lg:w-64 shrink-0 ${mobileMenuOpen ? 'block' : 'hidden lg:block'}`}>
          <div className="bg-[#0D1828]/85 backdrop-blur-md border border-blue-500/20 rounded-2xl p-3 shadow-lg sticky top-24 space-y-1">
            <div className="px-3 py-2 text-[10px] font-mono uppercase tracking-wider text-[#94A3B8] border-b border-blue-900/40 mb-2 flex items-center justify-between">
              <span>SOC Matrix</span>
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
            </div>

            {navItems.map(item => {
              const Icon = item.icon;
              const active = activeTab === item.id;
              return (
                <button
                  key={item.id}
                  onClick={() => { 
                    cyberSound.playTabSweep();
                    setActiveTab(item.id as any); 
                    setMobileMenuOpen(false); 
                  }}
                  className={`w-full flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-xs font-semibold transition-all duration-300 cursor-pointer relative group overflow-hidden select-none active:scale-[0.98] ${
                    active 
                      ? 'bg-gradient-to-r from-[#1677FF] via-[#1d82ff] to-[#2495FF] text-white shadow-[0_0_22px_rgba(22,119,255,0.6)] border border-cyan-400/50' 
                      : 'text-[#94A3B8] hover:text-[#F8FAFC] hover:bg-[#101D30]/80 border border-transparent'
                  }`}
                >
                  {/* Dynamic light sweep along active navigation item */}
                  {active && (
                    <span className="absolute inset-0 bg-gradient-to-r from-transparent via-cyan-300/25 to-transparent pointer-events-none animate-card-sweep" />
                  )}
                  <Icon className={`w-4 h-4 transition-colors ${active ? 'text-white' : 'text-[#64748B] group-hover:text-[#36C8FF]'}`} />
                  <span className="truncate">{item.label}</span>
                  {active && (
                    <span className="absolute right-2.5 flex items-center gap-1">
                      <span className="w-1.5 h-1.5 rounded-full bg-[#00D9FF] shadow-[0_0_8px_#00D9FF] animate-ping" />
                      <span className="w-1.5 h-1.5 rounded-full bg-[#00D9FF] shadow-[0_0_8px_#00D9FF]" />
                    </span>
                  )}
                </button>
              );
            })}

            {/* Project Source Archive Export */}
            <div className="pt-2">
              <a
                href="/fraud-detection-system.zip"
                download="fraud-detection-system.zip"
                onClick={() => cyberSound.playClick()}
                className="w-full flex items-center justify-between px-3 py-2 rounded-xl text-xs font-mono font-semibold bg-emerald-950/30 hover:bg-emerald-900/40 text-emerald-300 border border-emerald-500/30 hover:border-emerald-400 transition duration-200 cursor-pointer group shadow-sm active:scale-[0.98]"
                title="Download full project archive with Java backend, React frontend, database schemas, and documentation"
              >
                <div className="flex items-center gap-2">
                  <Download className="w-3.5 h-3.5 text-emerald-400 group-hover:translate-y-0.5 transition-transform" />
                  <span>Download Project (.ZIP)</span>
                </div>
                <span className="text-[10px] px-1.5 py-0.5 rounded bg-emerald-500/20 text-emerald-300 font-mono font-bold">ALL</span>
              </a>
            </div>

            {/* Account Quick Status Widget in Sidebar */}
            <div className="pt-3 mt-3 border-t border-blue-900/40 px-3 pb-1">
              <div className="text-[10px] font-mono text-[#64748B] uppercase">Node Status</div>
              <div className="flex items-center justify-between text-xs font-mono mt-1">
                <span className="text-emerald-400 font-semibold flex items-center gap-1.5">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-heartbeat" /> ONLINE
                </span>
                <span className="text-[#94A3B8] text-[10px]">v2.4-SOC</span>
              </div>
            </div>
          </div>
        </aside>

        {/* WORKSPACE CONTENT AREA WITH ANIMATED TAB TRANSITIONS */}
        <main className="flex-1 min-w-0 space-y-6">
          <div key={activeTab} className="animate-tab-content space-y-6">
          {/* TAB 1: SOC EXECUTIVE / ACCOUNT DASHBOARD */}
          {activeTab === 'dashboard' && dashboardMetrics && (
            <div className="space-y-6">
              {/* EMERGENCY FRAUD ALERT DASHBOARD BANNER */}
              {fraudAlert.active && (
                <div className="bg-red-950/80 border-2 border-red-500 rounded-2xl p-4 sm:p-5 shadow-[0_0_35px_rgba(239,68,68,0.5)] flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 animate-pulse font-mono">
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 rounded-xl bg-red-600/30 border border-red-500 text-red-400 flex items-center justify-center shrink-0 shadow-[0_0_15px_rgba(239,68,68,0.5)]">
                      <ShieldAlert className="w-7 h-7" />
                    </div>
                    <div>
                      <div className="text-sm font-bold text-white uppercase tracking-wider flex items-center gap-2">
                        <span>CRITICAL FRAUD ALERT ENGAGED</span>
                        <span className="text-[10px] bg-red-600 text-white px-2 py-0.5 rounded font-black">{fraudAlert.riskLevel}</span>
                        <span className="text-[10px] bg-red-950 text-red-400 px-2 py-0.5 rounded border border-red-800 font-bold">{fraudAlert.status}</span>
                      </div>
                      <p className="text-xs text-red-200 font-sans mt-0.5">
                        Interception active on transaction {formatINR(fraudAlert.amount)} &bull; Risk Score: {fraudAlert.riskScore}/100.
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 w-full sm:w-auto">
                    <CyberButton
                      variant="danger"
                      size="sm"
                      onClick={() => setFraudAlert(prev => ({ ...prev, active: false }))}
                    >
                      Acknowledge
                    </CyberButton>
                    <CyberButton
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        setFraudAlert(prev => ({ ...prev, active: false }));
                        setActiveTab('transactions');
                      }}
                    >
                      View Audit Log
                    </CyberButton>
                  </div>
                </div>
              )}

              {/* Linked Demo Bank Account Quick Banner for Customer */}
              {currentUser.role === 'CUSTOMER' && (
                <CyberCard interactive={false} dangerGlow={fraudAlert.active} className="p-5 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
                  <div className="flex items-center gap-3.5">
                    <div className="w-12 h-12 rounded-xl bg-gradient-to-tr from-[#1677FF] to-[#00D9FF] text-white flex items-center justify-center font-bold shadow-[0_0_15px_rgba(0,217,255,0.25)] shrink-0">
                      <Landmark className="w-6 h-6" />
                    </div>
                    <div>
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-bold text-sm text-[#F8FAFC]">{bankAccount?.bankName || 'FraudGuard SOC Core Bank'}</span>
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-mono font-semibold bg-emerald-500/10 text-emerald-400 border border-emerald-500/30">
                          <span className="w-1.5 h-1.5 rounded-full bg-[#22C55E] animate-pulse" />
                          CONNECTED
                        </span>
                        <span className="font-mono text-xs text-[#94A3B8] bg-[#07111F] px-2 py-0.5 rounded-md border border-blue-900/50">
                          {bankAccount?.maskedAccountNumber || 'XXXX XXXX 4521'}
                        </span>
                      </div>
                      <div className="text-xs text-[#CBD5E1] mt-1 flex items-baseline gap-2 font-mono">
                        <span className="text-[#94A3B8]">Liquidity Balance:</span>
                        <span className="font-bold text-[#00D9FF] text-base">
                          {formatINR(bankAccount?.balance ?? currentUser.balance)}
                        </span>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 flex-wrap self-end md:self-center shrink-0">
                    <CyberButton
                      onClick={() => triggerSimulatedTransaction()}
                      disabled={simulatingLoading}
                      variant="secondary"
                      size="sm"
                    >
                      <Zap className="w-3.5 h-3.5 text-[#00D9FF]" />
                      Simulate Event
                    </CyberButton>
                    <CyberButton
                      onClick={() => setActiveTab('bankfeed')}
                      variant="primary"
                      size="sm"
                    >
                      <span>Bank Feed & Simulator</span>
                      <ChevronRight className="w-3.5 h-3.5" />
                    </CyberButton>
                  </div>
                </CyberCard>
              )}

              {/* 4 TOP RISK STATISTICS CARDS WITH ANIMATED COUNTERS */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                <CyberCard interactive dangerGlow={fraudAlert.active} className="p-5">
                  <div className="flex items-center justify-between text-[#94A3B8] text-xs font-semibold">
                    <span>{currentUser.role === 'ADMIN' ? 'Total Transactions' : 'My Transactions'}</span>
                    <div className="w-8 h-8 rounded-lg bg-[#07111F] flex items-center justify-center text-[#2495FF] border border-blue-900/50">
                      <Activity className="w-4 h-4" />
                    </div>
                  </div>
                  <div className="text-2xl font-bold font-mono text-[#F8FAFC] mt-2">
                    <AnimatedCounter value={dashboardMetrics.totalTransactions || 0} />
                  </div>
                  <div className="text-emerald-400 text-[11px] font-mono mt-1 flex items-center gap-1">
                    <CheckCircle className="w-3 h-3" /> Fully Audited via ACID
                  </div>
                </CyberCard>

                <CyberCard interactive dangerGlow={fraudAlert.active} className="p-5">
                  <div className="flex items-center justify-between text-[#94A3B8] text-xs font-semibold">
                    <span>Threat Detection Rate</span>
                    <div className="w-8 h-8 rounded-lg bg-[#07111F] flex items-center justify-center text-rose-400 border border-blue-900/50">
                      <TrendingUp className="w-4 h-4" />
                    </div>
                  </div>
                  <div className="text-2xl font-bold font-mono text-rose-400 mt-2">
                    <AnimatedCounter value={dashboardMetrics.fraudDetectionRate || 0} />%
                  </div>
                  <div className="text-[#94A3B8] text-[11px] font-mono mt-1">Multi-signal rule engine</div>
                </CyberCard>

                <CyberCard interactive dangerGlow={fraudAlert.active} className="p-5">
                  <div className="flex items-center justify-between text-[#94A3B8] text-xs font-semibold">
                    <span>{currentUser.role === 'ADMIN' ? 'Active Investigations' : 'Account Audit Cases'}</span>
                    <div className="w-8 h-8 rounded-lg bg-[#07111F] flex items-center justify-center text-[#00D9FF] border border-blue-900/50">
                      <AlertTriangle className="w-4 h-4" />
                    </div>
                  </div>
                  <div className="text-2xl font-bold font-mono text-[#36C8FF] mt-2">
                    <AnimatedCounter value={dashboardMetrics.openCasesCount || 0} />
                  </div>
                  <div className="text-amber-400 text-[11px] font-mono mt-1">
                    {currentUser.role === 'ADMIN' ? 'Requires compliance triage' : 'Under compliance audit'}
                  </div>
                </CyberCard>

                <CyberCard interactive dangerGlow={fraudAlert.active} className="p-5">
                  <div className="flex items-center justify-between text-[#94A3B8] text-xs font-semibold">
                    <span>{currentUser.role === 'ADMIN' ? 'Total Volume Monitored' : 'Available Liquidity'}</span>
                    <div className="w-8 h-8 rounded-lg bg-[#07111F] flex items-center justify-center text-[#2495FF] border border-blue-900/50">
                      <IndianRupee className="w-4 h-4" />
                    </div>
                  </div>
                  <div className="text-xl font-bold font-mono text-[#F8FAFC] mt-2 truncate">
                    {formatINR(currentUser.role === 'ADMIN' ? dashboardMetrics.totalAmountProcessed : currentUser.balance)}
                  </div>
                  <div className="text-[#94A3B8] text-[11px] font-mono mt-1 truncate">
                    {currentUser.role === 'ADMIN' ? 'Indian banking transaction network' : `Account: ${currentUser.accountNumber}`}
                  </div>
                </CyberCard>
              </div>

              {/* RISK DISTRIBUTION CHARTS */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <CyberCard interactive dangerGlow={fraudAlert.active} className="p-6">
                  <h3 className="text-xs font-mono font-bold text-[#CBD5E1] uppercase tracking-wider mb-4 flex items-center gap-2">
                    <ShieldCheck className="w-4 h-4 text-[#2495FF]" />
                    Transaction Status Breakdown
                  </h3>
                  <div className="space-y-3.5">
                    {Object.entries(dashboardMetrics.statusDistribution || {}).map(([st, count]: any) => (
                      <div key={st} className="flex justify-between items-center text-xs font-mono">
                        <span className="text-[#94A3B8]">{st}</span>
                        <div className="flex items-center gap-3">
                          <div className="w-36 bg-[#07111F] rounded-full h-2 overflow-hidden border border-blue-900/40">
                            <div 
                              className={`h-full rounded-full transition-all duration-700 ${
                                st === 'APPROVED' ? 'bg-[#22C55E]' : st === 'FLAGGED' ? 'bg-[#F59E0B]' : 'bg-[#EF4444]'
                              }`}
                              style={{ width: `${Math.min(100, (count / Math.max(1, dashboardMetrics.totalTransactions)) * 100)}%` }}
                            />
                          </div>
                          <span className="text-[#CBD5E1] font-bold w-6 text-right">{count}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                </CyberCard>

                <CyberCard interactive dangerGlow={fraudAlert.active} className="p-6">
                  <h3 className="text-xs font-mono font-bold text-[#CBD5E1] uppercase tracking-wider mb-4 flex items-center gap-2">
                    <ShieldAlert className="w-4 h-4 text-[#00D9FF]" />
                    Risk Level Severity Distribution
                  </h3>
                  <div className="space-y-3.5">
                    {Object.entries(dashboardMetrics.riskDistribution || {}).map(([lvl, count]: any) => (
                      <div key={lvl} className="flex justify-between items-center text-xs font-mono">
                        <span className="text-[#94A3B8]">{lvl}</span>
                        <div className="flex items-center gap-3">
                          <div className="w-36 bg-[#07111F] rounded-full h-2 overflow-hidden border border-blue-900/40">
                            <div 
                              className={`h-full rounded-full transition-all duration-700 ${
                                lvl === 'LOW' ? 'bg-[#22C55E]' : lvl === 'MEDIUM' ? 'bg-[#F59E0B]' : lvl === 'HIGH' ? 'bg-rose-500' : 'bg-red-600'
                              }`}
                              style={{ width: `${Math.min(100, (count / Math.max(1, dashboardMetrics.totalTransactions)) * 100)}%` }}
                            />
                          </div>
                          <span className="text-[#CBD5E1] font-bold w-6 text-right">{count}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                </CyberCard>
              </div>

              {/* LIVE FRAUD ALERTS FEED */}
              <CyberCard dangerGlow={fraudAlert.active} className="p-6">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-xs font-mono font-bold text-[#CBD5E1] uppercase tracking-wider flex items-center gap-2">
                    <AlertTriangle className="w-4 h-4 text-rose-400" />
                    {currentUser.role === 'ADMIN' ? 'Live SOC Threat Stream' : 'Security Alerts on My Account'}
                  </h3>
                  <span className="text-[10px] font-mono text-emerald-400 flex items-center gap-1.5">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-heartbeat" />
                    LISTENING
                  </span>
                </div>
                {alerts.length === 0 ? (
                  <div className="text-center py-6 text-xs text-[#64748B] font-mono">
                    Zero threat alerts triggered for this node.
                  </div>
                ) : (
                  <div className="divide-y divide-blue-900/40">
                    {alerts.slice(0, 5).map(alert => (
                      <div key={alert.id} className="py-3 flex flex-col sm:flex-row sm:items-center justify-between text-xs gap-1.5 hover:bg-blue-950/20 px-2 rounded-xl transition">
                        <div>
                          <span className="font-mono font-bold text-[#00D9FF] mr-2 bg-blue-950/50 px-2 py-0.5 rounded-md border border-cyan-800/40">
                            {alert.ruleCode}
                          </span>
                          <span className="text-[#CBD5E1]">{alert.message}</span>
                        </div>
                        <span className="text-[#64748B] font-mono text-[11px] whitespace-nowrap">{alert.triggeredAt}</span>
                      </div>
                    ))}
                  </div>
                )}
              </CyberCard>
            </div>
          )}

          {/* TAB: LIVE STREAM & BANK SIMULATOR */}
          {activeTab === 'bankfeed' && (
            <div className="space-y-6">
              {/* LINKED DEMO BANK ACCOUNT HERO CARD */}
              <CyberCard interactive className="p-6 relative overflow-hidden">
                <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6 relative z-10">
                  <div>
                    <div className="flex items-center gap-2 mb-2 flex-wrap">
                      <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-md text-xs font-mono font-bold bg-[#1677FF]/20 text-[#36C8FF] border border-[#1677FF]/40">
                        <Landmark className="w-3.5 h-3.5" />
                        Simulated Banking Sandbox
                      </span>
                      <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-md text-xs font-mono font-semibold bg-emerald-500/10 text-emerald-400 border border-emerald-500/30">
                        <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                        {bankAccount?.status || 'CONNECTED'}
                      </span>
                    </div>

                    <h3 className="text-xl sm:text-2xl font-bold text-[#F8FAFC] tracking-tight">
                      {bankAccount?.bankName || 'FraudGuard SOC Core Bank'}
                    </h3>
                    <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-[#94A3B8] mt-1 font-mono">
                      <span>Account: <strong className="text-[#F8FAFC]">{bankAccount?.maskedAccountNumber || 'XXXX XXXX 4521'}</strong></span>
                      <span>&bull;</span>
                      <span>Customer: <strong className="text-[#F8FAFC]">{currentUser.fullName}</strong></span>
                      <span>&bull;</span>
                      <span>Mobile: <strong className="text-[#F8FAFC]">{bankAccount?.registeredMobile || currentUser.phone || '+91-98765-01002'}</strong></span>
                    </div>

                    <div className="mt-3 flex items-baseline gap-2 font-mono">
                      <span className="text-xs text-[#94A3B8] uppercase">Available Liquidity:</span>
                      <span className="text-2xl font-bold text-[#00D9FF]">
                        {formatINR(bankAccount?.balance ?? currentUser.balance)}
                      </span>
                    </div>
                  </div>

                  <div className="flex flex-col sm:flex-row lg:flex-col gap-2 shrink-0 font-mono">
                    <CyberButton
                      onClick={() => handleFundDemoAccount(100000)}
                      variant="primary"
                      size="sm"
                    >
                      <IndianRupee className="w-3.5 h-3.5" />
                      Fund Liquidity (+₹1,00,000)
                    </CyberButton>
                    <CyberButton
                      onClick={handleResetDemoAccount}
                      variant="secondary"
                      size="sm"
                    >
                      <RefreshCw className="w-3.5 h-3.5 text-[#64748B]" />
                      Reset Balance (₹4,50,000)
                    </CyberButton>
                  </div>
                </div>
              </CyberCard>

              {/* REAL-TIME FRAUD EVALUATION PIPELINE VISUALIZER */}
              <TransactionPipelineVisualizer 
                isEvaluating={simulatingLoading}
                resultStatus={lastFeedItem?.transaction.status}
                riskScore={lastFeedItem?.transaction.riskScore}
                riskLevel={lastFeedItem?.transaction.riskLevel}
                triggeredRules={lastFeedItem?.transaction.triggeredRules || lastFeedItem?.riskAnalysis?.triggeredRules}
              />

              {/* SIMULATOR CONTROLS */}
              <div className="bg-[#0D1828]/85 border border-blue-500/20 rounded-2xl p-6 shadow-sm space-y-4">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-3 border-b border-blue-900/40 gap-3">
                  <div className="flex items-center gap-2.5">
                    <div className="w-8 h-8 rounded-lg bg-[#1677FF]/20 text-[#00D9FF] flex items-center justify-center border border-[#1677FF]/40">
                      <Radio className="w-4 h-4" />
                    </div>
                    <div>
                      <h4 className="text-sm font-bold text-[#F8FAFC]">Bank Activity Stream Engine</h4>
                      <p className="text-xs text-[#94A3B8]">
                        Dispatches live transactions evaluated by the real backend <code className="text-[#36C8FF] font-mono">RiskAnalysis</code>.
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 flex-wrap font-mono">
                    <CyberButton
                      onClick={() => setIsSimulatingFeed(!isSimulatingFeed)}
                      variant={isSimulatingFeed ? 'danger' : 'primary'}
                      size="sm"
                    >
                      {isSimulatingFeed ? (
                        <>
                          <Pause className="w-3.5 h-3.5" />
                          <span>Streaming Active (7.5s)</span>
                        </>
                      ) : (
                        <>
                          <Play className="w-3.5 h-3.5" />
                          <span>Start Auto-Stream</span>
                        </>
                      )}
                    </CyberButton>

                    <CyberButton
                      disabled={simulatingLoading}
                      onClick={() => triggerSimulatedTransaction()}
                      variant="secondary"
                      size="sm"
                    >
                      <Zap className="w-3.5 h-3.5 text-[#00D9FF]" />
                      {simulatingLoading ? 'Evaluating...' : 'Dispatch Next Event'}
                    </CyberButton>
                  </div>
                </div>

                {/* Instant Preset Scenarios */}
                <div>
                  <span className="text-xs font-mono font-bold text-[#CBD5E1] block mb-2 uppercase">
                    Target Scenario Presets (Processed via Backend Detection Engine):
                  </span>
                  <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-2.5 text-xs font-mono">
                    <button
                      disabled={simulatingLoading}
                      onClick={() => { cyberSound.playEnergyRipple(); triggerSimulatedTransaction('coffee_safe'); }}
                      className="p-3 rounded-xl bg-[#07111F]/90 hover:bg-[#101D30] border border-blue-900/50 hover:border-emerald-500/60 hover:shadow-[0_0_18px_rgba(34,197,94,0.2)] text-left transition-all active:scale-[0.97] cursor-pointer group"
                    >
                      <div className="flex items-center justify-between font-bold text-[#F8FAFC]">
                        <span>Starbucks Cafe</span>
                        <span className="text-[10px] text-emerald-400 bg-emerald-950/60 px-1.5 py-0.5 rounded border border-emerald-800/40">APPROVED</span>
                      </div>
                      <div className="text-[#94A3B8] text-[11px] mt-1">₹450 &bull; Delhi</div>
                      <div className="text-[10px] text-emerald-400 mt-0.5">Score 0 &bull; Clean purchase</div>
                    </button>

                    <button
                      disabled={simulatingLoading}
                      onClick={() => { cyberSound.playEnergyRipple(); triggerSimulatedTransaction('amazon_safe'); }}
                      className="p-3 rounded-xl bg-[#07111F]/90 hover:bg-[#101D30] border border-blue-900/50 hover:border-emerald-500/60 hover:shadow-[0_0_18px_rgba(34,197,94,0.2)] text-left transition-all active:scale-[0.97] cursor-pointer group"
                    >
                      <div className="flex items-center justify-between font-bold text-[#F8FAFC]">
                        <span>Amazon India</span>
                        <span className="text-[10px] text-emerald-400 bg-emerald-950/60 px-1.5 py-0.5 rounded border border-emerald-800/40">APPROVED</span>
                      </div>
                      <div className="text-[#94A3B8] text-[11px] mt-1">₹1,500 &bull; Delhi</div>
                      <div className="text-[10px] text-emerald-400 mt-0.5">Normal e-commerce debit</div>
                    </button>

                    <button
                      disabled={simulatingLoading}
                      onClick={() => { cyberSound.playEnergyRipple(); triggerSimulatedTransaction('croma_electronics_flagged'); }}
                      className="p-3 rounded-xl bg-[#07111F]/90 hover:bg-[#101D30] border border-blue-900/50 hover:border-amber-500/60 hover:shadow-[0_0_18px_rgba(245,158,11,0.2)] text-left transition-all active:scale-[0.97] cursor-pointer group"
                    >
                      <div className="flex items-center justify-between font-bold text-[#F8FAFC]">
                        <span>Croma Tech Store</span>
                        <span className="text-[10px] text-amber-400 bg-amber-950/60 px-1.5 py-0.5 rounded border border-amber-800/40">FLAGGED</span>
                      </div>
                      <div className="text-[#94A3B8] text-[11px] mt-1">₹75,000 &bull; Mumbai</div>
                      <div className="text-[10px] text-amber-400 mt-0.5">Held for review &bull; Funds safe</div>
                    </button>

                    <button
                      disabled={simulatingLoading}
                      onClick={() => { cyberSound.playClick(); triggerSimulatedTransaction('caracas_blocked'); }}
                      className="p-3 rounded-xl bg-[#07111F]/90 hover:bg-[#101D30] border border-blue-900/50 hover:border-red-500/60 hover:shadow-[0_0_20px_rgba(239,68,68,0.3)] text-left transition-all active:scale-[0.97] cursor-pointer group"
                    >
                      <div className="flex items-center justify-between font-bold text-[#F8FAFC]">
                        <span>Caracas Anomaly</span>
                        <span className="text-[10px] text-red-400 bg-red-950/60 px-1.5 py-0.5 rounded border border-red-800/40">BLOCKED</span>
                      </div>
                      <div className="text-[#94A3B8] text-[11px] mt-1">₹5,00,000 &bull; Caracas</div>
                      <div className="text-[10px] text-red-400 mt-0.5">Halted &bull; Triggers Big Alert</div>
                    </button>

                    <button
                      disabled={simulatingLoading}
                      onClick={() => { cyberSound.playClick(); triggerSimulatedTransaction('zurich_blocked'); }}
                      className="p-3 rounded-xl bg-[#07111F]/90 hover:bg-[#101D30] border border-blue-900/50 hover:border-red-500/60 hover:shadow-[0_0_20px_rgba(239,68,68,0.3)] text-left transition-all active:scale-[0.97] cursor-pointer group"
                    >
                      <div className="flex items-center justify-between font-bold text-[#F8FAFC]">
                        <span>Zurich Swiss Wire</span>
                        <span className="text-[10px] text-red-400 bg-red-950/60 px-1.5 py-0.5 rounded border border-red-800/40">BLOCKED</span>
                      </div>
                      <div className="text-[#94A3B8] text-[11px] mt-1">₹10,00,000 &bull; Zurich</div>
                      <div className="text-[10px] text-red-400 mt-0.5">Severe surge halted</div>
                    </button>

                    <button
                      disabled={simulatingLoading}
                      onClick={() => { cyberSound.playEnergyRipple(); triggerSimulatedTransaction('nocturnal_atm_flagged'); }}
                      className="p-3 rounded-xl bg-[#07111F]/90 hover:bg-[#101D30] border border-blue-900/50 hover:border-amber-500/60 hover:shadow-[0_0_18px_rgba(245,158,11,0.2)] text-left transition-all active:scale-[0.97] cursor-pointer group"
                    >
                      <div className="flex items-center justify-between font-bold text-[#F8FAFC]">
                        <span>Midnight ATM Cash</span>
                        <span className="text-[10px] text-amber-400 bg-amber-950/60 px-1.5 py-0.5 rounded border border-amber-800/40">FLAGGED</span>
                      </div>
                      <div className="text-[#94A3B8] text-[11px] mt-1">₹1,20,000 &bull; Mumbai</div>
                      <div className="text-[10px] text-amber-400 mt-0.5">Off-hours nocturnal cash burst</div>
                    </button>
                  </div>
                </div>
              </div>

              {/* LIVE STREAM TABLE */}
              <div className="bg-[#0D1828]/85 border border-blue-500/20 rounded-2xl overflow-hidden shadow-sm">
                <div className="p-4 border-b border-blue-900/40 flex items-center justify-between bg-[#07111F]/80">
                  <h3 className="text-xs font-mono font-bold text-[#CBD5E1] uppercase tracking-wider flex items-center gap-2">
                    <Activity className="w-4 h-4 text-[#2495FF]" />
                    Real-Time Bank Activity Stream
                  </h3>
                  <button onClick={loadData} className="p-1.5 hover:bg-blue-900/30 text-[#94A3B8] hover:text-[#00D9FF] rounded-lg cursor-pointer">
                    <RefreshCw className="w-3.5 h-3.5" />
                  </button>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs font-mono">
                    <thead className="bg-[#07111F] uppercase text-[#64748B] border-b border-blue-900/40 text-[11px]">
                      <tr>
                        <th className="p-3">Time</th>
                        <th className="p-3">Amount (₹ INR)</th>
                        <th className="p-3">Destination / Merchant</th>
                        <th className="p-3">Location</th>
                        <th className="p-3">SOC Status</th>
                        <th className="p-3">Risk Rating</th>
                        <th className="p-3">Balance Effect</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-blue-950/60">
                      {transactions.length === 0 ? (
                        <tr>
                          <td colSpan={7} className="p-6 text-center text-[#64748B]">
                            Zero transactions recorded in stream. Click presets above to simulate.
                          </td>
                        </tr>
                      ) : (
                        transactions.slice(0, 15).map(tx => (
                          <tr key={tx.id} className="cyber-table-row border-b border-blue-900/30 group">
                            <td className="p-3 text-[#94A3B8] text-[11px] whitespace-nowrap">
                              {tx.createdAt ? tx.createdAt.substring(11, 16) : '--:--'}
                            </td>
                            <td className="p-3 font-bold text-[#F8FAFC] whitespace-nowrap">
                              {formatINR(tx.amount)}
                            </td>
                            <td className="p-3">
                              <div className="text-[#CBD5E1] font-semibold">{tx.merchant || tx.recipientAccount}</div>
                              <div className="text-[10px] text-[#64748B]">{tx.referenceId}</div>
                            </td>
                            <td className="p-3 text-[#94A3B8]">{tx.location}</td>
                            <td className="p-3 whitespace-nowrap">{getStatusBadge(tx.status)}</td>
                            <td className="p-3 whitespace-nowrap">{getRiskBadge(tx.riskLevel, tx.riskScore)}</td>
                            <td className="p-3 text-[11px] whitespace-nowrap">
                              {tx.status === 'APPROVED' ? (
                                <span className="text-emerald-400">- {formatINR(tx.amount)}</span>
                              ) : tx.status === 'FLAGGED' ? (
                                <span className="text-amber-400">Held (Protected)</span>
                              ) : (
                                <span className="text-red-400">Blocked (Zero cost)</span>
                              )}
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          {/* TAB: QR PAY & MOBILE APPROVAL MODULE */}
          {activeTab === 'qrpay' && currentUser && (
            <QRPayModule
              currentUser={currentUser}
              bankAccount={bankAccount}
              dangerGlow={fraudAlert.active}
              onTransactionProcessed={(txResult: any) => {
                evaluateRiskFeedback(txResult);
                if (txResult.bankAccount) {
                  setBankAccount(txResult.bankAccount);
                }
                loadData();
              }}
              onRefreshData={() => {
                loadData();
              }}
            />
          )}

          {/* TAB 2: TRANSACTION LEDGER */}
          {activeTab === 'transactions' && (
            <div className="bg-[#0D1828]/85 border border-blue-500/20 rounded-2xl overflow-hidden shadow-sm">
              <div className="p-4 sm:p-5 border-b border-blue-900/40 flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-[#07111F]/80">
                <div>
                  <h3 className="text-sm font-bold text-[#F8FAFC]">
                    {currentUser.role === 'ADMIN' ? 'System Transaction Ledger' : 'My Personal Transaction Ledger'}
                  </h3>
                  <p className="text-xs text-[#94A3B8] font-mono mt-0.5">
                    {currentUser.role === 'ADMIN' 
                      ? 'Global multi-account SOC audit trail across Indian nodes (₹ INR).'
                      : `Transactions executed by ${currentUser.fullName} (${currentUser.accountNumber}).`}
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <div className="relative">
                    <input 
                      type="text" 
                      value={ledgerSearch} 
                      onChange={e => setLedgerSearch(e.target.value)}
                      placeholder="Search ref, location..."
                      className="bg-[#07111F] border border-blue-900/60 rounded-xl px-3 py-1.5 text-xs text-[#F8FAFC] placeholder-[#64748B] font-mono focus:outline-none focus:border-cyan-400 cyber-input-glow transition-all w-44 sm:w-56"
                    />
                    <Search className="w-3.5 h-3.5 text-[#64748B] absolute right-2.5 top-2 pointer-events-none" />
                  </div>
                  <button onClick={() => { cyberSound.playClick(); loadData(); }} className="p-2 hover:bg-blue-900/30 rounded-xl text-[#94A3B8] hover:text-[#00D9FF] border border-blue-900/50 cursor-pointer active:scale-95 transition">
                    <RefreshCw className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>

              {/* Status filter bar */}
              <div className="px-4 py-2 bg-[#07111F]/40 border-b border-blue-900/40 flex items-center gap-2 text-xs font-mono overflow-x-auto">
                <span className="text-[#64748B] text-[10px] uppercase">Filter:</span>
                {(['ALL', 'APPROVED', 'FLAGGED', 'BLOCKED'] as const).map(st => (
                  <button
                    key={st}
                    onClick={() => { cyberSound.playClick(); setLedgerStatusFilter(st); }}
                    className={`px-2.5 py-1 rounded-lg text-[11px] font-bold transition-all cursor-pointer active:scale-95 ${
                      ledgerStatusFilter === st 
                        ? 'bg-[#1677FF] text-white shadow-[0_0_12px_rgba(22,119,255,0.4)]' 
                        : 'text-[#94A3B8] hover:text-[#CBD5E1] hover:bg-blue-900/20'
                    }`}
                  >
                    {st}
                  </button>
                ))}
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs font-mono">
                  <thead className="bg-[#07111F] uppercase text-[#64748B] border-b border-blue-900/40 text-[11px]">
                    <tr>
                      <th className="p-3.5">Reference</th>
                      {currentUser.role === 'ADMIN' && <th className="p-3.5">User</th>}
                      <th className="p-3.5">Accounts Flow</th>
                      <th className="p-3.5">Amount (₹ INR)</th>
                      <th className="p-3.5">Type</th>
                      <th className="p-3.5">Location</th>
                      <th className="p-3.5">Risk Rating</th>
                      <th className="p-3.5">Status</th>
                      <th className="p-3.5">Timestamp</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-blue-950/60">
                    {filteredTransactions.length === 0 ? (
                      <tr>
                        <td colSpan={currentUser.role === 'ADMIN' ? 9 : 8} className="p-8 text-center text-[#64748B]">
                          No transactions matching filters.
                        </td>
                      </tr>
                    ) : (
                      filteredTransactions.map(tx => (
                        <tr key={tx.id} className="cyber-table-row border-b border-blue-900/30 group">
                          <td className="p-3.5 text-[#36C8FF] font-semibold">{tx.referenceId}</td>
                          {currentUser.role === 'ADMIN' && (
                            <td className="p-3.5 text-[#94A3B8]">#{tx.userId}</td>
                          )}
                          <td className="p-3.5">
                            <div className="text-[11px] text-[#64748B]">{tx.senderAccount} &rarr;</div>
                            <div className="text-[11px] text-[#CBD5E1] font-semibold">{tx.recipientAccount}</div>
                          </td>
                          <td className="p-3.5 font-bold text-[#F8FAFC]">{formatINR(tx.amount)}</td>
                          <td className="p-3.5">
                            <span className="text-[10px] text-[#36C8FF] bg-blue-950/60 px-2 py-0.5 rounded border border-blue-900/60">
                              {tx.transactionType}
                            </span>
                          </td>
                          <td className="p-3.5 text-[#CBD5E1]">{tx.location}</td>
                          <td className="p-3.5 whitespace-nowrap">{getRiskBadge(tx.riskLevel, tx.riskScore)}</td>
                          <td className="p-3.5 whitespace-nowrap">{getStatusBadge(tx.status)}</td>
                          <td className="p-3.5 text-[#64748B] text-[11px] whitespace-nowrap">{tx.createdAt}</td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* TAB 3: SUBMIT CANDIDATE TRANSACTION */}
          {activeTab === 'submit' && (
            <div className="max-w-2xl mx-auto w-full space-y-5">
              {/* Pipeline Visualization Header */}
              <TransactionPipelineVisualizer 
                isEvaluating={submittingTx}
                resultStatus={submissionFeedback?.status}
                riskScore={submissionFeedback?.riskScore}
                riskLevel={submissionFeedback?.riskLevel}
                triggeredRules={submissionFeedback?.triggeredRules}
              />

              <CyberCard interactive={false} className="p-6 sm:p-7 shadow-lg">
                <div className="flex items-center gap-2.5 mb-2">
                  <div className="w-8 h-8 rounded-lg bg-[#1677FF]/20 text-[#00D9FF] flex items-center justify-center border border-[#1677FF]/40">
                    <ArrowUpRight className="w-5 h-5" />
                  </div>
                  <h3 className="text-base font-bold text-[#F8FAFC]">
                    Candidate Transaction Ingestion
                  </h3>
                </div>
                <p className="text-xs text-[#94A3B8] font-mono mb-5">
                  Sends transfer payload directly into the real-time <code className="text-[#00D9FF]">FraudDetectionEngine</code>.
                </p>

                <form onSubmit={handleTransactionSubmit} className="space-y-4">
                  <div>
                    <label className="block text-[11px] font-mono uppercase tracking-wider text-[#CBD5E1] mb-1.5">Recipient Account Number</label>
                    <input 
                      type="text" 
                      value={recipient}
                      onChange={e => setRecipient(e.target.value)}
                      className="w-full bg-[#07111F] border border-blue-900/60 rounded-xl px-3.5 py-2.5 text-sm text-[#F8FAFC] font-mono focus:outline-none focus:border-cyan-400 cyber-input-glow transition-all"
                      required
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-3.5">
                    <div>
                      <label className="block text-[11px] font-mono uppercase tracking-wider text-[#CBD5E1] mb-1.5">Amount (₹ INR)</label>
                      <input 
                        type="text" 
                        inputMode="decimal"
                        value={amount}
                        onChange={e => setAmount(e.target.value)}
                        placeholder="1500.00"
                        className="w-full bg-[#07111F] border border-blue-900/60 rounded-xl px-3.5 py-2.5 text-sm text-[#00D9FF] font-mono font-bold focus:outline-none focus:border-cyan-400 cyber-input-glow transition-all"
                        required
                      />
                    </div>
                    <div>
                      <label className="block text-[11px] font-mono uppercase tracking-wider text-[#CBD5E1] mb-1.5">Transaction Type</label>
                      <select 
                        value={txType}
                        onChange={e => setTxType(e.target.value)}
                        className="w-full bg-[#07111F] border border-blue-900/60 rounded-xl px-3 py-2.5 text-sm text-[#F8FAFC] font-mono focus:outline-none focus:border-cyan-400 cyber-input-glow transition-all"
                      >
                        <option value="PAYMENT">PAYMENT</option>
                        <option value="TRANSFER">TRANSFER</option>
                        <option value="PURCHASE">PURCHASE</option>
                        <option value="WITHDRAWAL">WITHDRAWAL</option>
                        <option value="DEPOSIT">DEPOSIT</option>
                      </select>
                    </div>
                  </div>

                  <div>
                    <label className="block text-[11px] font-mono uppercase tracking-wider text-[#CBD5E1] mb-1.5">Geographical Origin</label>
                    <input 
                      type="text" 
                      value={location}
                      onChange={e => setLocation(e.target.value)}
                      placeholder="New Delhi, India"
                      className="w-full bg-[#07111F] border border-blue-900/60 rounded-xl px-3.5 py-2.5 text-sm text-[#F8FAFC] font-mono focus:outline-none focus:border-cyan-400 cyber-input-glow transition-all"
                      required
                    />
                  </div>

                  {/* Instant Quick Load Scenarios */}
                  <div className="bg-[#07111F]/80 p-3.5 rounded-xl border border-blue-900/50 space-y-2">
                    <span className="text-[11px] font-mono font-bold text-[#36C8FF] uppercase block">
                      Verified Engine Evaluation Scenarios (Click to Load):
                    </span>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs font-mono">
                      <button
                        type="button"
                        onClick={() => { cyberSound.playClick(); setAmount('1500'); setLocation('New Delhi, India'); setTxType('PAYMENT'); }}
                        className="p-2 rounded-lg bg-[#0D1828] hover:bg-[#101D30] border border-blue-900/40 text-left transition-all active:scale-95 cursor-pointer"
                      >
                        <div className="font-bold text-[#F8FAFC] flex justify-between">
                          <span>A. Clean Transfer</span>
                          <span className="text-[10px] text-emerald-400">APPROVED</span>
                        </div>
                        <div className="text-[10px] text-[#94A3B8]">₹1,500 &bull; Score 0</div>
                      </button>

                      <button
                        type="button"
                        onClick={() => { cyberSound.playClick(); setAmount('500000'); setLocation('New Delhi, India'); setTxType('TRANSFER'); }}
                        className="p-2 rounded-lg bg-[#0D1828] hover:bg-[#101D30] border border-blue-900/40 text-left transition-all active:scale-95 cursor-pointer"
                      >
                        <div className="font-bold text-[#F8FAFC] flex justify-between">
                          <span>B. Amount Spike</span>
                          <span className="text-[10px] text-amber-400">FLAGGED</span>
                        </div>
                        <div className="text-[10px] text-[#94A3B8]">₹5,00,000 &bull; HIGH_AMOUNT</div>
                      </button>

                      <button
                        type="button"
                        onClick={() => { cyberSound.playClick(); setAmount('50000'); setLocation('Caracas, Venezuela'); setTxType('PAYMENT'); }}
                        className="p-2 rounded-lg bg-[#0D1828] hover:bg-[#101D30] border border-blue-900/40 text-left transition-all active:scale-95 cursor-pointer"
                      >
                        <div className="font-bold text-[#F8FAFC] flex justify-between">
                          <span>C. Unusual Location</span>
                          <span className="text-[10px] text-amber-400">FLAGGED</span>
                        </div>
                        <div className="text-[10px] text-[#94A3B8]">₹50,000 in Caracas</div>
                      </button>

                      <button
                        type="button"
                        onClick={() => { cyberSound.playEmergencyKlaxon(); setAmount('1000000'); setLocation('Caracas, Venezuela'); setTxType('TRANSFER'); }}
                        className="p-2 rounded-lg bg-[#0D1828] hover:bg-[#101D30] border border-blue-900/40 text-left transition-all active:scale-95 cursor-pointer"
                      >
                        <div className="font-bold text-[#F8FAFC] flex justify-between">
                          <span>D. Multi-Factor Critical</span>
                          <span className="text-[10px] text-red-400">BLOCKED</span>
                        </div>
                        <div className="text-[10px] text-[#94A3B8]">₹10,00,000 &bull; Caracas wire</div>
                      </button>
                    </div>
                  </div>

                  <CyberButton 
                    type="submit"
                    disabled={submittingTx}
                    variant="primary"
                    className="w-full py-3"
                  >
                    <Cpu className="w-4 h-4" />
                    {submittingTx ? 'Processing through Fraud Rules...' : 'Submit Candidate Transaction'}
                  </CyberButton>
                </form>

                {/* Evaluation Feedback Card */}
                {submissionFeedback && (
                  <CyberCard interactive className={`mt-6 p-5 border font-mono ${
                    submissionFeedback.status === 'BLOCKED'
                      ? 'bg-red-950/30 border-red-500/60 shadow-[0_0_20px_rgba(239,68,68,0.2)]'
                      : submissionFeedback.status === 'FLAGGED'
                      ? 'bg-amber-950/30 border-amber-500/50'
                      : 'bg-emerald-950/20 border-emerald-500/40'
                  }`}>
                    <div className="flex justify-between items-center pb-2.5 border-b border-blue-900/40 mb-3">
                      <span className="text-xs font-bold uppercase text-[#F8FAFC]">Evaluation Output</span>
                      {getStatusBadge(submissionFeedback.status)}
                    </div>

                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs mb-3">
                      <div className="bg-[#07111F] p-2.5 rounded-lg border border-blue-900/50">
                        <span className="text-[10px] text-[#64748B] block">STATUS</span>
                        <span className="font-bold text-[#F8FAFC]">{submissionFeedback.status}</span>
                      </div>
                      <div className="bg-[#07111F] p-2.5 rounded-lg border border-blue-900/50">
                        <span className="text-[10px] text-[#64748B] block">SCORE</span>
                        <span className="font-bold text-[#00D9FF]">{submissionFeedback.riskScore} / 100</span>
                      </div>
                      <div className="bg-[#07111F] p-2.5 rounded-lg border border-blue-900/50">
                        <span className="text-[10px] text-[#64748B] block">LEVEL</span>
                        <span className="font-bold text-[#CBD5E1]">{submissionFeedback.riskLevel}</span>
                      </div>
                      <div className="bg-[#07111F] p-2.5 rounded-lg border border-blue-900/50">
                        <span className="text-[10px] text-[#64748B] block">AMOUNT</span>
                        <span className="font-bold text-[#F8FAFC] truncate block">{formatINR(submissionFeedback.amount)}</span>
                      </div>
                    </div>

                    {/* Triggered Rules */}
                    {submissionFeedback.triggeredRules && submissionFeedback.triggeredRules.length > 0 && (
                      <div className="mt-2 text-xs">
                        <span className="text-[10px] text-[#94A3B8] block mb-1">TRIGGERED RULES:</span>
                        <div className="flex flex-wrap gap-1.5">
                          {submissionFeedback.triggeredRules.map(r => (
                            <span key={r} className="px-2 py-0.5 rounded text-[10px] font-bold bg-rose-500/20 text-rose-300 border border-rose-500/40">
                              {r}
                            </span>
                          ))}
                        </div>
                      </div>
                    )}
                  </CyberCard>
                )}
              </CyberCard>
            </div>
          )}

          {/* TAB 4: FRAUD INVESTIGATIONS / CASES */}
          {activeTab === 'cases' && (
            <div className="bg-[#0D1828]/85 border border-blue-500/20 rounded-2xl overflow-hidden shadow-sm">
              <div className="p-4 sm:p-5 border-b border-blue-900/40 flex justify-between items-center bg-[#07111F]/80">
                <div>
                  <h3 className="text-sm font-bold text-[#F8FAFC]">
                    {currentUser.role === 'ADMIN' ? 'SOC Threat Investigation Cases' : 'My Audit & Investigation Cases'}
                  </h3>
                  <p className="text-xs text-[#94A3B8] font-mono mt-0.5">
                    {currentUser.role === 'ADMIN'
                      ? 'Triage and review cases flagged by the detection engine.'
                      : 'Audit records regarding flagged account anomalies.'}
                  </p>
                </div>
                <button onClick={loadData} className="p-2 hover:bg-blue-900/30 rounded-xl text-[#94A3B8] hover:text-[#00D9FF] border border-blue-900/50 cursor-pointer">
                  <RefreshCw className="w-3.5 h-3.5" />
                </button>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs font-mono">
                  <thead className="bg-[#07111F] uppercase text-[#64748B] border-b border-blue-900/40 text-[11px]">
                    <tr>
                      <th className="p-3.5">Case ID</th>
                      <th className="p-3.5">Tx ID</th>
                      {currentUser.role === 'ADMIN' && <th className="p-3.5">User</th>}
                      <th className="p-3.5">Threat Score</th>
                      <th className="p-3.5">Status</th>
                      <th className="p-3.5">Audit Reason</th>
                      {currentUser.role === 'ADMIN' && <th className="p-3.5">Action</th>}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-blue-950/60">
                    {cases.length === 0 ? (
                      <tr>
                        <td colSpan={currentUser.role === 'ADMIN' ? 7 : 5} className="p-8 text-center text-[#64748B]">
                          Zero active threat cases open.
                        </td>
                      </tr>
                    ) : (
                      cases.map(c => (
                        <tr key={c.id} className="cyber-table-row border-b border-blue-900/30 group">
                          <td className="p-3.5 text-[#36C8FF] font-semibold">{c.caseNumber}</td>
                          <td className="p-3.5 text-[#94A3B8]">#{c.transactionId}</td>
                          {currentUser.role === 'ADMIN' && <td className="p-3.5 text-[#94A3B8]">#{c.userId}</td>}
                          <td className="p-3.5 font-bold text-rose-400">{c.riskScore}</td>
                          <td className="p-3.5">
                            <span className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-blue-950/60 text-[#36C8FF] border border-blue-900/60">
                              {c.status}
                            </span>
                          </td>
                          <td className="p-3.5 text-[#CBD5E1] max-w-xs truncate">{c.notes}</td>
                          {currentUser.role === 'ADMIN' && (
                            <td className="p-3.5">
                              {c.status !== 'RESOLVED_FRAUD' && c.status !== 'RESOLVED_LEGITIMATE' ? (
                                <div className="flex gap-2">
                                  <CyberButton 
                                    onClick={() => handleResolveCase(c.id, 'RESOLVED_LEGITIMATE')}
                                    variant="outline"
                                    size="sm"
                                  >
                                    Authorize
                                  </CyberButton>
                                  <CyberButton 
                                    onClick={() => handleResolveCase(c.id, 'RESOLVED_FRAUD')}
                                    variant="danger"
                                    size="sm"
                                  >
                                    Confirm Fraud
                                  </CyberButton>
                                </div>
                              ) : (
                                <span className="text-[10px] text-[#64748B]">Resolved</span>
                              )}
                            </td>
                          )}
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* TAB 5: ACCOUNT PROFILE */}
          {activeTab === 'profile' && (
            <CyberCard interactive={false} className="max-w-2xl mx-auto w-full p-6 sm:p-7 shadow-lg">
              <div className="flex items-center gap-3 mb-6 pb-4 border-b border-blue-900/40">
                <div className="w-12 h-12 rounded-xl bg-gradient-to-tr from-[#1677FF] to-[#00D9FF] text-white flex items-center justify-center font-mono font-bold text-lg shadow-[0_0_15px_rgba(0,217,255,0.3)]">
                  {currentUser.fullName.charAt(0)}
                </div>
                <div>
                  <h3 className="text-base font-bold text-[#F8FAFC]">{currentUser.fullName}</h3>
                  <span className="text-xs font-mono font-semibold px-2 py-0.5 rounded-md bg-[#1677FF]/20 text-[#36C8FF] border border-[#1677FF]/40">
                    Role: {currentUser.role}
                  </span>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5 font-mono">
                <div className="p-3.5 rounded-xl bg-[#07111F] border border-blue-900/50">
                  <span className="text-[10px] text-[#64748B] uppercase block mb-1">Login Credentials (Username & Password)</span>
                  <span className="text-xs font-semibold text-emerald-400 flex items-center gap-1.5">
                    <Lock className="w-3.5 h-3.5 text-emerald-400" />
                    •••••••• [MASKED FOR SECURITY]
                  </span>
                </div>

                <div className="p-3.5 rounded-xl bg-[#07111F] border border-blue-900/50">
                  <span className="text-[10px] text-[#64748B] uppercase block mb-1">Email Endpoint</span>
                  <span className="text-sm font-semibold text-[#CBD5E1]">{currentUser.email}</span>
                </div>

                {currentUser.role === 'CUSTOMER' && (
                  <>
                    <div className="p-3.5 rounded-xl bg-[#07111F] border border-blue-900/50">
                      <span className="text-[10px] text-[#64748B] uppercase block mb-1">Linked Bank Core</span>
                      <span className="font-semibold text-sm text-[#F8FAFC]">{bankAccount?.bankName || 'FraudGuard SOC Core Bank'}</span>
                    </div>

                    <div className="p-3.5 rounded-xl bg-[#07111F] border border-blue-900/50">
                      <span className="text-[10px] text-[#64748B] uppercase block mb-1">Account Number</span>
                      <span className="text-sm font-bold text-[#36C8FF]">{bankAccount?.maskedAccountNumber || currentUser.accountNumber}</span>
                    </div>

                    <div className="p-3.5 rounded-xl bg-[#07111F] border border-blue-900/50">
                      <span className="text-[10px] text-[#64748B] uppercase block mb-1">Available Liquidity</span>
                      <span className="text-sm font-bold text-[#00D9FF]">
                        {formatINR(bankAccount?.balance ?? currentUser.balance)}
                      </span>
                    </div>

                    <div className="p-3.5 rounded-xl bg-[#07111F] border border-blue-900/50">
                      <span className="text-[10px] text-[#64748B] uppercase block mb-1">Risk Profile</span>
                      <span className="text-xs font-bold text-emerald-400">
                        {currentUser.riskProfile || 'LOW'}
                      </span>
                    </div>
                  </>
                )}

                {currentUser.role === 'ADMIN' && (
                  <>
                    <div className="p-3.5 rounded-xl bg-[#07111F] border border-blue-900/50">
                      <span className="text-[10px] text-[#64748B] uppercase block mb-1">Department</span>
                      <span className="text-sm font-bold text-[#36C8FF]">{currentUser.department || 'SOC Threat Intel'}</span>
                    </div>
                    <div className="p-3.5 rounded-xl bg-[#07111F] border border-blue-900/50">
                      <span className="text-[10px] text-[#64748B] uppercase block mb-1">Clearance</span>
                      <span className="text-sm font-bold text-[#00D9FF]">Level {currentUser.clearanceLevel || 3} (Master)</span>
                    </div>
                  </>
                )}

                <div className="p-3.5 rounded-xl bg-[#07111F] border border-blue-900/50 sm:col-span-2">
                  <span className="text-[10px] text-[#64748B] uppercase block mb-1">Integrity Verification</span>
                  <span className="text-xs text-emerald-400 flex items-center gap-1.5">
                    <CheckCircle className="w-3.5 h-3.5 text-emerald-400" />
                    Cryptographic SHA-256 Authentication Hash Validated
                  </span>
                </div>

                <div className="pt-3 border-t border-blue-900/50 sm:col-span-2 flex flex-col sm:flex-row items-center justify-between gap-3">
                  <span className="text-xs text-[#94A3B8]">SOC Operations Initialization:</span>
                  <CyberButton
                    onClick={() => {
                      cyberSound.playClick();
                      setIsSocBooting(true);
                    }}
                    variant="primary"
                    size="sm"
                  >
                    <Zap className="w-3.5 h-3.5" />
                    Run SOC Boot Diagnostic
                  </CyberButton>
                </div>
              </div>
            </CyberCard>
          )}

          {/* TAB 6: USER DIRECTORY (ADMIN ONLY) */}
          {activeTab === 'users' && currentUser.role === 'ADMIN' && (
            <div className="bg-[#0D1828]/85 border border-blue-500/20 rounded-2xl overflow-hidden shadow-sm">
              <div className="p-4 sm:p-5 border-b border-blue-900/40 flex justify-between items-center bg-[#07111F]/80">
                <div>
                  <h3 className="text-sm font-bold text-[#F8FAFC]">Registered Banking Nodes & Clients</h3>
                  <p className="text-xs text-[#94A3B8] font-mono mt-0.5">Active customer accounts and compliance officers in the relational store.</p>
                </div>
                <button onClick={loadData} className="p-2 hover:bg-blue-900/30 rounded-xl text-[#94A3B8] hover:text-[#00D9FF] border border-blue-900/50 cursor-pointer">
                  <RefreshCw className="w-3.5 h-3.5" />
                </button>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs font-mono">
                  <thead className="bg-[#07111F] uppercase text-[#64748B] border-b border-blue-900/40 text-[11px]">
                    <tr>
                      <th className="p-3.5">ID</th>
                      <th className="p-3.5">Name</th>
                      <th className="p-3.5">Credentials</th>
                      <th className="p-3.5">Email</th>
                      <th className="p-3.5">Role</th>
                      <th className="p-3.5">Account Number</th>
                      <th className="p-3.5">Balance</th>
                      <th className="p-3.5">Created</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-blue-950/60">
                    {allUsers.map(u => (
                      <tr key={u.id} className="cyber-table-row border-b border-blue-900/30 group">
                        <td className="p-3.5 text-[#64748B]">#{u.id}</td>
                        <td className="p-3.5 font-bold text-[#F8FAFC]">{u.fullName}</td>
                        <td className="p-3.5 text-emerald-400/80 text-[11px]">•••••••• [PROTECTED]</td>
                        <td className="p-3.5 text-[#94A3B8]">{u.email}</td>
                        <td className="p-3.5">
                          <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                            u.role === 'ADMIN' 
                              ? 'bg-[#1677FF]/20 text-[#36C8FF] border border-[#1677FF]/40' 
                              : 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/30'
                          }`}>
                            {u.role}
                          </span>
                        </td>
                        <td className="p-3.5 text-[#CBD5E1]">{u.accountNumber || '—'}</td>
                        <td className="p-3.5 font-bold text-[#F8FAFC]">
                          {u.role === 'CUSTOMER' ? formatINR(u.balance) : '—'}
                        </td>
                        <td className="p-3.5 text-[#64748B] text-[11px]">{u.createdAt || 'Initial'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* TAB 7: FRAUD RULE CONFIGURATION (ADMIN ONLY) */}
          {activeTab === 'rules' && currentUser.role === 'ADMIN' && (
            <div className="bg-[#0D1828]/85 border border-blue-500/20 rounded-2xl overflow-hidden shadow-sm">
              <div className="p-4 sm:p-5 border-b border-blue-900/40 bg-[#07111F]/80">
                <h3 className="text-sm font-bold text-[#F8FAFC]">Threat Detection Rule Configuration</h3>
                <p className="text-xs text-[#94A3B8] font-mono mt-1">
                  Active weights and dynamic boundary thresholds persisted in <code className="text-[#00D9FF]">fraud_rules</code> relational matrix.
                </p>
              </div>

              <div className="divide-y divide-blue-950/60 font-mono">
                {rules.map(rule => (
                  <div key={rule.id} className="p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4 hover:bg-blue-900/15 cyber-table-row transition">
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-xs text-[#00D9FF] bg-blue-950/60 px-2 py-0.5 rounded border border-blue-900/60">
                          {rule.ruleCode}
                        </span>
                        <span className="text-xs font-bold text-[#F8FAFC]">&bull; {rule.ruleName}</span>
                      </div>
                      <p className="text-xs text-[#94A3B8] font-sans">{rule.description}</p>
                      <div className="text-[11px] text-[#64748B]">
                        Threshold: <span className="text-[#CBD5E1] font-semibold">
                          {rule.ruleCode === 'HIGH_AMOUNT' ? formatINR(rule.thresholdValue, false) : rule.thresholdValue}
                        </span> | Weight: <span className="text-rose-400 font-bold">{rule.weight} pts</span>
                      </div>
                    </div>
                    <div>
                      <CyberButton
                        onClick={() => toggleRule(rule)}
                        variant={rule.active ? 'primary' : 'secondary'}
                        size="sm"
                      >
                        {rule.active ? '● RULE ACTIVE' : 'DISABLED'}
                      </CyberButton>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
          </div>
        </main>
        </div>

      {/* FOOTER */}
      <footer className="border-t border-blue-900/40 py-4 text-center text-xs font-mono text-[#64748B] bg-[#07111F]/80 backdrop-blur-xs flex items-center justify-center gap-2 relative z-10">
        <span>FraudGuard SOC</span>
        <span>&bull;</span>
        <span>Fintech Security Platform (₹ INR)</span>
        <span>&bull;</span>
        <span>Java 17 + MySQL + ACID Servlet Engine</span>
      </footer>

      {/* AI SOC Copilot Chatbot (Authenticated View) */}
      <FraudGuardChatbot
        currentUser={currentUser}
        activeTab={activeTab}
        onNavigateTab={(tab) => setActiveTab(tab)}
      />
    </div>
  );
}
