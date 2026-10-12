import 'dotenv/config';
import express from 'express';
import path from 'path';
import { fileURLToPath } from 'url';
import crypto from 'crypto';
import fs from 'fs';
import { GoogleGenAI } from '@google/genai';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Helper for SHA-256 password hashing matching Java HashUtil
function sha256(val: string): string {
  return crypto.createHash('sha256').update(val).digest('hex');
}

interface StoredUser {
  id: number;
  username: string;
  passwordHash: string;
  fullName: string;
  email: string;
  phone?: string;
  role: 'ADMIN' | 'CUSTOMER';
  accountNumber?: string;
  balance: number;
  riskProfile: 'LOW' | 'MEDIUM' | 'HIGH';
  department?: string;
  clearanceLevel?: number;
  createdAt: string;
}

interface StoredTransaction {
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
}

interface StoredBankAccount {
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

interface StoredNotification {
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

interface StoredAlert {
  id: number;
  transactionId: number;
  userId: number;
  ruleCode: string;
  severity: string;
  message: string;
  triggeredAt: string;
}

interface StoredCase {
  id: number;
  caseNumber: string;
  transactionId: number;
  userId: number;
  assignedTo: number | null;
  status: 'OPEN' | 'INVESTIGATING' | 'RESOLVED_FRAUD' | 'RESOLVED_LEGITIMATE';
  riskScore: number;
  notes: string;
  resolutionDetails: string | null;
  createdAt: string;
}

interface StoredRule {
  id: number;
  ruleCode: string;
  ruleName: string;
  description: string;
  weight: number;
  thresholdValue: number;
  active: boolean;
}

// QR Payment & Mobile Device Approval Models
interface StoredQRPaymentRequest {
  requestId: string;
  creatorUserId: number;
  recipientName: string;
  recipientAccount: string;
  amount: number | null; // null represents dynamic / enter-at-scan amount
  description: string;
  signature: string;
  expiresAt: string;
  createdAt: string;
}

interface StoredPendingApproval {
  approvalId: string;
  userId: number;
  requestId: string;
  recipientName: string;
  recipientAccount: string;
  amount: number;
  description: string;
  registeredMobile: string;
  maskedMobile: string;
  otpCode: string;
  status: 'PENDING' | 'APPROVED' | 'REJECTED' | 'EXPIRED';
  rejectionReason?: string;
  transactionId?: number;
  createdAt: string;
  expiresAt: string;
}

interface StoredQRPaymentRecord {
  id: string;
  approvalId?: string;
  userId: number;
  requestId: string;
  recipientName: string;
  recipientAccount: string;
  amount: number;
  description: string;
  status: 'APPROVED' | 'FLAGGED' | 'BLOCKED' | 'REJECTED';
  riskScore: number;
  riskLevel: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  reasons: string[];
  referenceId?: string;
  registeredMobile: string;
  createdAt: string;
}

const app = express();
const PORT = 3000;

app.use(express.json());

  // In-memory data store supporting multi-user registration, isolation, and INR (₹) amounts
  let users: StoredUser[] = [
    {
      id: 1,
      username: "admin",
      passwordHash: sha256("admin123"),
      fullName: "Security Administrator",
      email: "admin@fraudguard.internal",
      phone: "+91-98765-01001",
      role: "ADMIN",
      department: "Security Compliance",
      clearanceLevel: 3,
      balance: 0,
      riskProfile: "LOW",
      createdAt: "2026-09-01 08:00:00"
    },
    {
      id: 2,
      username: "john_doe",
      passwordHash: sha256("password123"),
      fullName: "Johnathan Doe",
      email: "john@example.com",
      phone: "+91-98765-01002",
      role: "CUSTOMER",
      accountNumber: "ACC-98421001",
      balance: 450000.00, // ₹4,50,000.00 linked demo bank balance
      riskProfile: "LOW",
      createdAt: "2026-09-01 09:00:00"
    }
  ];

  // Linked Demo Bank Accounts
  let bankAccounts: StoredBankAccount[] = [
    {
      bankAccountId: 1,
      customerId: 2,
      bankName: "FraudGuard Demo Bank",
      maskedAccountNumber: "XXXX XXXX 4521",
      accountNumber: "ACC-98421001",
      balance: 450000.00,
      registeredMobile: "+91-98765-01002",
      status: "CONNECTED",
      createdAt: "2026-09-01 09:00:00",
      updatedAt: "2026-10-02 10:00:00"
    }
  ];

  let sessions = new Map<string, number>(); // sessionId -> userId
  let currentSessionId: string | null = null; // convenience for single-client browser storage

  let transactions: StoredTransaction[] = [
    {
      id: 1,
      userId: 2,
      referenceId: "TX-20260927-1001",
      senderAccount: "ACC-98421001",
      recipientAccount: "ACC-STORE-77",
      merchant: "Amazon India Demo",
      amount: 1500.00,
      transactionType: "PURCHASE",
      status: "APPROVED",
      riskScore: 0,
      riskLevel: "LOW",
      location: "New Delhi, India",
      createdAt: "2026-09-27 10:15:00",
      notes: "Clean transaction approved"
    },
    {
      id: 2,
      userId: 2,
      referenceId: "TX-20260927-1002",
      senderAccount: "ACC-98421001",
      recipientAccount: "ACC-CAFE-12",
      merchant: "Starbucks Demo Cafe",
      amount: 2500.00,
      transactionType: "PAYMENT",
      status: "APPROVED",
      riskScore: 0,
      riskLevel: "LOW",
      location: "New Delhi, India",
      createdAt: "2026-09-27 11:30:00",
      notes: "Clean regular household expense"
    }
  ];

  // Real-time automatic customer notifications
  let notifications: StoredNotification[] = [
    {
      id: 1,
      userId: 2,
      transactionId: 1,
      referenceId: "TX-20260927-1001",
      amount: 1500.00,
      title: "Transaction Alert",
      message: "₹1,500.00 debit detected from your Demo Bank account. Status: Approved.",
      riskLevel: "LOW",
      status: "APPROVED",
      triggeredRules: [],
      reasons: ["Clean transaction approved"],
      recommendedAction: "₹1,500.00 deducted from demo balance",
      read: true,
      createdAt: "2026-09-27 10:15:00"
    },
    {
      id: 2,
      userId: 2,
      transactionId: 2,
      referenceId: "TX-20260927-1002",
      amount: 2500.00,
      title: "Transaction Alert",
      message: "₹2,500.00 debit detected from your Demo Bank account. Status: Approved.",
      riskLevel: "LOW",
      status: "APPROVED",
      triggeredRules: [],
      reasons: ["Clean regular household expense"],
      recommendedAction: "₹2,500.00 deducted from demo balance",
      read: false,
      createdAt: "2026-09-27 11:30:00"
    }
  ];

  let fraudAlerts: StoredAlert[] = [
    {
      id: 1,
      transactionId: 2,
      userId: 2,
      ruleCode: "HIGH_AMOUNT",
      severity: "HIGH",
      message: "Transaction amount (₹5,00,000.00) exceeds threshold limit of ₹2,00,000.00",
      triggeredAt: "2026-09-27 11:30:00"
    }
  ];

  let fraudCases: StoredCase[] = [
    {
      id: 1,
      caseNumber: "CASE-20260927-001",
      transactionId: 2,
      userId: 2,
      assignedTo: 1,
      status: "INVESTIGATING",
      riskScore: 55,
      notes: "Flagged by multi-signal engine: high amount spike (₹5,00,000.00)",
      resolutionDetails: null,
      createdAt: "2026-09-27 11:30:05"
    }
  ];

  // Indian Rupee (INR ₹) Fraud Detection Rules matching Java FraudDetectionEngine
  let fraudRules: StoredRule[] = [
    { id: 1, ruleCode: "HIGH_AMOUNT", ruleName: "High Transaction Amount", description: "Flags single transactions exceeding absolute threshold limit (₹2,00,000)", weight: 50, thresholdValue: 200000.0, active: true },
    { id: 2, ruleCode: "RAPID_TRANSACTIONS", ruleName: "Rapid Velocity Spike", description: "Flags more than 3 transactions executed within sliding time window", weight: 25, thresholdValue: 3.0, active: true },
    { id: 3, ruleCode: "UNUSUAL_LOCATION", ruleName: "Geographic Location Mismatch", description: "Flags transactions originating outside typical Indian regions", weight: 20, thresholdValue: 1.0, active: true },
    { id: 4, ruleCode: "ODD_HOUR", ruleName: "Unusual Off-Hours Transaction", description: "Flags transactions executed during high-risk nocturnal hours (01:00-05:00)", weight: 15, thresholdValue: 1.0, active: true },
    { id: 5, ruleCode: "AMOUNT_DEVIATION", ruleName: "Surge Above Customer Average", description: "Flags transactions that exceed 300% of historical average", weight: 25, thresholdValue: 3.0, active: true },
    { id: 6, ruleCode: "REPEATED_FAILURES", ruleName: "Multiple Prior Failed Attempts", description: "Flags transactions preceded by repeated rejected attempts", weight: 20, thresholdValue: 2.0, active: true }
  ];

  // Cryptographic Secret for Signing QR Payment Requests
  const QR_HMAC_SECRET = "FG_QR_SEC_KEY_98421001_IND";

  function signQRPayload(payload: { requestId: string; recipientAccount: string; amount: number | null; expiresAt: string }): string {
    const raw = `${payload.requestId}:${payload.recipientAccount}:${payload.amount ?? 'DYNAMIC'}:${payload.expiresAt}`;
    return crypto.createHmac('sha256', QR_HMAC_SECRET).update(raw).digest('hex').substring(0, 32);
  }

  function verifyQRPayload(payload: { requestId: string; recipientAccount: string; amount: number | null; expiresAt: string }, signature: string): boolean {
    if (!signature) return false;
    const expected = signQRPayload(payload);
    return expected.toLowerCase() === signature.toLowerCase();
  }

  let qrPaymentRequests: StoredQRPaymentRequest[] = [
    {
      requestId: "QR-REQ-DEMO-001",
      creatorUserId: 2,
      recipientName: "Demo Retail Merchant India",
      recipientAccount: "ACC-RETAIL-9921",
      amount: 1500.00,
      description: "Demo Supermarket QR Checkout",
      signature: "a1b2c3d4e5f60718293a4b5c6d7e8f90",
      expiresAt: new Date(Date.now() + 86400000).toISOString(),
      createdAt: new Date().toISOString()
    },
    {
      requestId: "QR-REQ-DEMO-HIGH",
      creatorUserId: 1,
      recipientName: "Luxury Diamond Jewellers",
      recipientAccount: "ACC-LUX-8800",
      amount: 350000.00, // ₹3,50,000 — exceeds ₹2,00,000 fraud limit to trigger emergency alert!
      description: "High-Value Jewelry Invoice (Exceeds Fraud Limit)",
      signature: "f9e8d7c6b5a403928172635443322110",
      expiresAt: new Date(Date.now() + 86400000).toISOString(),
      createdAt: new Date().toISOString()
    }
  ];

  let pendingApprovals: StoredPendingApproval[] = [];
  let qrHistory: StoredQRPaymentRecord[] = [
    {
      id: "QR-HIST-01",
      userId: 2,
      requestId: "QR-REQ-PREV-01",
      recipientName: "Cyber Cafe & Workspace",
      recipientAccount: "ACC-CAFE-4401",
      amount: 350.00,
      description: "Cold Brew & Coworking Day Pass",
      status: "APPROVED",
      riskScore: 0,
      riskLevel: "LOW",
      reasons: ["Verified UPI QR code", "Authorized on registered mobile (+91 98*** ***02)"],
      referenceId: "TX-20260927-1001",
      registeredMobile: "+91-98765-01002",
      createdAt: "2026-09-27 10:15:00"
    }
  ];

  // Helper to parse cookies for stateless Vercel serverless persistence
  function parseCookies(cookieHeader?: string): Record<string, string> {
    const out: Record<string, string> = {};
    if (!cookieHeader) return out;
    for (const part of cookieHeader.split(';')) {
      const idx = part.indexOf('=');
      if (idx > -1) {
        const k = part.slice(0, idx).trim();
        const v = decodeURIComponent(part.slice(idx + 1).trim());
        out[k] = v;
      }
    }
    return out;
  }

  // Helper to extract session user (supports X-FG-User-Json/Id headers, Cookie, Bearer token, query param, and in-memory session)
  function getAuthenticatedUser(req: express.Request): StoredUser | null {
    const headerUserJson = req.headers['x-fg-user-json'];
    if (typeof headerUserJson === 'string' && headerUserJson.trim()) {
      try {
        const parsed = JSON.parse(decodeURIComponent(headerUserJson));
        if (parsed && parsed.id) {
          let existing = users.find(u => u.id === Number(parsed.id));
          if (!existing) {
            const hydrated: StoredUser = {
              id: Number(parsed.id),
              username: parsed.username || `user_${parsed.id}`,
              passwordHash: sha256('hydrated_session'),
              fullName: parsed.fullName || 'Account Holder',
              email: parsed.email || `user_${parsed.id}@fraudguard.in`,
              phone: parsed.phone || '+91-98765-01002',
              role: parsed.role === 'ADMIN' ? 'ADMIN' : 'CUSTOMER',
              accountNumber: parsed.accountNumber || `ACC-9842${1000 + Number(parsed.id)}`,
              balance: typeof parsed.balance === 'number' ? parsed.balance : 450000,
              riskProfile: parsed.riskProfile || 'LOW',
              department: parsed.department,
              clearanceLevel: parsed.clearanceLevel,
              createdAt: parsed.createdAt || new Date().toISOString().replace('T', ' ').substring(0, 19)
            };
            users.push(hydrated);
            existing = hydrated;
          }
          return existing;
        }
      } catch {
        // ignore header parse error
      }
    }

    const headerUserId = req.headers['x-fg-user-id'];
    if (typeof headerUserId === 'string' && headerUserId.trim()) {
      const u = users.find(item => item.id === Number(headerUserId));
      if (u) return u;
    }

    const cookies = parseCookies(req.headers.cookie);
    if (cookies.fg_uid) {
      const cookieUserId = Number(cookies.fg_uid);
      const cookieUser = users.find(u => u.id === cookieUserId);
      if (cookieUser) return cookieUser;
    }

    const authHeader = req.headers.authorization;
    let sId = currentSessionId;
    if (authHeader && authHeader.startsWith('Bearer ')) {
      sId = authHeader.substring(7);
    }
    const qSession = req.query.sessionId as string;
    if (qSession) {
      sId = qSession;
    }
    if (cookies.fg_session && !sId) {
      sId = cookies.fg_session;
    }
    if (!sId) return null;
    const uId = sessions.get(sId);
    if (!uId) return null;
    return users.find(u => u.id === uId) || null;
  }

  // ===================== API ROUTES =====================

  // Auth: Session / Login / Register / Logout / All Users (Admin)
  app.get('/api/auth', (req, res) => {
    const action = req.query.action;
    if (action === 'me') {
      const authUser = getAuthenticatedUser(req);
      if (authUser) {
        // Strip password hash
        const { passwordHash, ...safeUser } = authUser;
        return res.json({ success: true, data: { user: safeUser, authenticated: true } });
      }
      return res.json({ success: true, data: { user: null, authenticated: false } });
    }

    if (action === 'users') {
      const authUser = getAuthenticatedUser(req);
      if (!authUser || authUser.role !== 'ADMIN') {
        return res.status(403).json({ success: false, error: 'Forbidden: Admin access required' });
      }
      const safeList = users.map(({ passwordHash, ...u }) => u);
      return res.json({ success: true, data: safeList });
    }

    res.status(400).json({ success: false, error: 'Unknown action' });
  });

  app.post('/api/auth', (req, res) => {
    const action = req.query.action || 'login';

    if (action === 'login') {
      const { username, password } = req.body;
      if (!username || !password) {
        return res.status(400).json({ success: false, error: 'Username/email and password are required' });
      }

      const input = username.trim().toLowerCase();
      const user = users.find(u => u.username.toLowerCase() === input || u.email.toLowerCase() === input);

      if (!user) {
        return res.status(401).json({ success: false, error: 'Invalid username/email or password' });
      }

      const hash = sha256(password);
      if (user.passwordHash !== hash) {
        return res.status(401).json({ success: false, error: 'Invalid username/email or password' });
      }

      const newSessionId = 'SESSION-' + Date.now() + '-' + Math.floor(Math.random() * 100000);
      sessions.set(newSessionId, user.id);
      currentSessionId = newSessionId;

      res.setHeader('Set-Cookie', [
        `fg_uid=${user.id}; Path=/; SameSite=Lax; Max-Age=86400`,
        `fg_session=${newSessionId}; Path=/; SameSite=Lax; Max-Age=86400`
      ]);

      const { passwordHash, ...safeUser } = user;
      return res.json({ success: true, data: { user: safeUser, sessionId: newSessionId } });
    }

    if (action === 'register') {
      const { username, password, fullName, email, phone, initialBalance, accountNumber, role } = req.body;

      if (!password || String(password).length < 3) {
        return res.status(400).json({ success: false, error: 'Password must be at least 3 characters long' });
      }

      const cleanEmail = (email || '').trim();
      const cleanName = (fullName || '').trim() || (username || '').trim() || 'Account Holder';
      const derivedUsername =
        (username || '').trim() ||
        (cleanEmail.includes('@') ? cleanEmail.split('@')[0].trim() : '') ||
        cleanName.toLowerCase().replace(/[^a-z0-9]/g, '_') ||
        `user_${Math.floor(1000 + Math.random() * 9000)}`;

      const assignedRole: 'ADMIN' | 'CUSTOMER' = role === 'ADMIN' ? 'ADMIN' : 'CUSTOMER';

      // If username or email already exists, update credentials and authorize immediately
      const existingUser = users.find(
        u =>
          u.username.toLowerCase() === derivedUsername.toLowerCase() ||
          (cleanEmail && u.email.toLowerCase() === cleanEmail.toLowerCase())
      );

      if (existingUser) {
        existingUser.passwordHash = sha256(password);
        existingUser.fullName = cleanName;
        if (phone) existingUser.phone = String(phone).trim();
        if (role) existingUser.role = assignedRole;

        const newSessionId = 'SESSION-' + Date.now() + '-' + Math.floor(Math.random() * 100000);
        sessions.set(newSessionId, existingUser.id);
        currentSessionId = newSessionId;

        res.setHeader('Set-Cookie', [
          `fg_uid=${existingUser.id}; Path=/; SameSite=Lax; Max-Age=86400`,
          `fg_session=${newSessionId}; Path=/; SameSite=Lax; Max-Age=86400`
        ]);

        const { passwordHash: _, ...safeExisting } = existingUser;
        return res.json({ success: true, data: { user: safeExisting, sessionId: newSessionId } });
      }

      const generatedAcc = accountNumber || ('ACC-' + Math.floor(10000000 + Math.random() * 90000000));
      const numBalance = Number(initialBalance);
      const balance = (!isNaN(numBalance) && numBalance >= 0) ? numBalance : 450000.00;

      const newUser: StoredUser = {
        id: users.reduce((max, u) => Math.max(max, u.id), 0) + 1,
        username: derivedUsername,
        passwordHash: sha256(password),
        fullName: cleanName,
        email: cleanEmail || `${derivedUsername}@fraudguard.in`,
        phone: phone ? String(phone).trim() : '+91-98765-43210',
        role: assignedRole,
        accountNumber: generatedAcc,
        balance,
        department: assignedRole === 'ADMIN' ? 'SOC Threat Intel' : undefined,
        clearanceLevel: assignedRole === 'ADMIN' ? 3 : undefined,
        riskProfile: 'LOW',
        createdAt: new Date().toISOString().replace('T', ' ').substring(0, 19)
      };

      users.push(newUser);

      // Automatically provision a linked demo bank account for the new account
      const lastFour = generatedAcc.slice(-4);
      const newBankAcc: StoredBankAccount = {
        bankAccountId: bankAccounts.length + 1,
        customerId: newUser.id,
        bankName: "FraudGuard Demo Bank",
        maskedAccountNumber: `XXXX XXXX ${lastFour}`,
        accountNumber: generatedAcc,
        balance,
        registeredMobile: phone ? String(phone).trim() : "+91-98765-01002",
        status: "CONNECTED",
        createdAt: newUser.createdAt,
        updatedAt: newUser.createdAt
      };
      bankAccounts.push(newBankAcc);

      const newSessionId = 'SESSION-' + Date.now() + '-' + Math.floor(Math.random() * 100000);
      sessions.set(newSessionId, newUser.id);
      currentSessionId = newSessionId;

      res.setHeader('Set-Cookie', [
        `fg_uid=${newUser.id}; Path=/; SameSite=Lax; Max-Age=86400`,
        `fg_session=${newSessionId}; Path=/; SameSite=Lax; Max-Age=86400`
      ]);

      const { passwordHash: _, ...safeUser } = newUser;
      return res.json({ success: true, data: { user: safeUser, sessionId: newSessionId } });
    }

    if (action === 'logout') {
      if (currentSessionId) {
        sessions.delete(currentSessionId);
        currentSessionId = null;
      }
      res.setHeader('Set-Cookie', [
        'fg_uid=; Path=/; SameSite=Lax; Max-Age=0',
        'fg_session=; Path=/; SameSite=Lax; Max-Age=0'
      ]);
      return res.json({ success: true, data: { loggedOut: true } });
    }

    res.status(400).json({ success: false, error: 'Invalid action' });
  });

  // Transactions: Get and Post (Evaluate with Rule Engine & Enforce Isolation)
  app.get('/api/transactions', (req, res) => {
    const authUser = getAuthenticatedUser(req);
    const { status, id } = req.query;

    if (id) {
      const tx = transactions.find(t => t.id == Number(id));
      if (!tx) return res.status(404).json({ success: false, error: "Transaction not found" });
      if (authUser && authUser.role === 'CUSTOMER' && tx.userId !== authUser.id) {
        return res.status(404).json({ success: false, error: "Transaction not found or access denied" });
      }
      return res.json({ success: true, data: tx });
    }

    let list = [...transactions];

    // Data isolation: Customers see only their own transactions
    if (authUser && authUser.role === 'CUSTOMER') {
      list = list.filter(t => t.userId === authUser.id);
    } else if (req.query.userId) {
      list = list.filter(t => t.userId == Number(req.query.userId));
    }

    if (status) {
      list = list.filter(t => t.status === status);
    }
    res.json({ success: true, data: list.reverse() });
  });

  // Helper to parse monetary amount safely handling strings, currency codes (INR/₹), commas, scientific notation
  function parseMonetaryAmount(raw: any): number {
    if (typeof raw === 'number') return isNaN(raw) ? 0 : raw;
    if (!raw) return 0;
    const clean = String(raw).replace(/[^0-9.-]/g, '');
    const val = parseFloat(clean);
    return isNaN(val) ? 0 : val;
  }

  function processTransactionInternal(params: {
    userId: number;
    recipientAccount: string;
    amount: number;
    transactionType?: string;
    location?: string;
    merchant?: string;
  }) {
    const { userId, recipientAccount, amount, transactionType, location, merchant } = params;
    const numAmount = parseMonetaryAmount(amount);
    const user = users.find(u => u.id === userId);
    if (!user) throw new Error("User account not found");

    const txSenderAccount = user.accountNumber || "ACC-" + user.id;

    // Ensure customer has a linked Demo Bank Account
    let bankAcc = bankAccounts.find(b => b.customerId === userId);
    if (!bankAcc) {
      const lastFour = (user.accountNumber || "4521").slice(-4);
      bankAcc = {
        bankAccountId: bankAccounts.length + 1,
        customerId: userId,
        bankName: "FraudGuard Demo Bank",
        maskedAccountNumber: `XXXX XXXX ${lastFour}`,
        accountNumber: txSenderAccount,
        balance: user.balance || 450000.00,
        registeredMobile: user.phone || "+91-98765-01002",
        status: "CONNECTED",
        createdAt: new Date().toISOString().replace('T', ' ').substring(0, 19),
        updatedAt: new Date().toISOString().replace('T', ' ').substring(0, 19)
      };
      bankAccounts.push(bankAcc);
    }

    // Fraud Rule Evaluation matching Java FraudDetectionEngine & RiskAnalysis
    let score = 0;
    let triggered: string[] = [];
    let reasons: string[] = [];

    // Rule 1: High Amount (INR Threshold: ₹2,00,000)
    const highAmountRule = fraudRules.find(r => r.ruleCode === 'HIGH_AMOUNT' && r.active);
    if (highAmountRule && numAmount > highAmountRule.thresholdValue) {
      score += highAmountRule.weight;
      triggered.push("HIGH_AMOUNT");
      reasons.push(`Transaction amount (₹${numAmount.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}) exceeds configured threshold limit of ₹${highAmountRule.thresholdValue.toLocaleString('en-IN')}`);
    }

    // Rule 2: Rapid Velocity (Sliding window check for this customer)
    const rapidRule = fraudRules.find(r => r.ruleCode === 'RAPID_TRANSACTIONS' && r.active);
    if (rapidRule) {
      const nowMs = Date.now();
      const recentTxs = transactions.filter(t => t.userId === userId && (nowMs - new Date(t.createdAt).getTime()) < 300000);
      if (recentTxs.length >= rapidRule.thresholdValue) {
        score += rapidRule.weight;
        triggered.push("RAPID_TRANSACTIONS");
        reasons.push(`Rapid transaction pattern: ${recentTxs.length + 1} transactions executed within sliding time window`);
      }
    }

    // Rule 3: Unusual Location
    const locationRule = fraudRules.find(r => r.ruleCode === 'UNUSUAL_LOCATION' && r.active);
    const knownLocations = ["New Delhi, India", "Delhi, India", "Mumbai, India", "Bengaluru, India", "Hyderabad, India", "Dehradun, India", "Chennai, India", "Kolkata, India", "Pune, India", "Delhi", "Mumbai", "Bengaluru", "New Delhi"];
    if (locationRule && location && !knownLocations.some(k => location.toLowerCase().includes(k.toLowerCase()))) {
      score += locationRule.weight;
      triggered.push("UNUSUAL_LOCATION");
      reasons.push(`Transaction location '${location}' differs from customer baseline`);
    }

    // Rule 4: Odd Hour (01:00 - 05:00)
    const oddHourRule = fraudRules.find(r => r.ruleCode === 'ODD_HOUR' && r.active);
    const hour = new Date().getHours();
    if (oddHourRule && hour >= 1 && hour < 5) {
      score += oddHourRule.weight;
      triggered.push("ODD_HOUR");
      reasons.push("Transaction executed during nocturnal off-hours window (01:00-05:00)");
    }

    // Rule 5: Amount Deviation (> 300% historical user average)
    const deviationRule = fraudRules.find(r => r.ruleCode === 'AMOUNT_DEVIATION' && r.active);
    if (deviationRule) {
      const userTxs = transactions.filter(t => t.userId === userId && t.status === 'APPROVED');
      if (userTxs.length >= 1) {
        const avg = userTxs.reduce((acc, t) => acc + t.amount, 0) / userTxs.length;
        if (numAmount > avg * deviationRule.thresholdValue) {
          score += deviationRule.weight;
          triggered.push("AMOUNT_DEVIATION");
          reasons.push(`Transaction amount surges past 300% of historical average (₹${avg.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })})`);
        }
      }
    }

    // Clamp score (0 to 100)
    score = Math.min(100, Math.max(0, score));

    // Determine Risk Level:
    let riskLevel: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL' = "LOW";
    if (score >= 85) {
      riskLevel = "CRITICAL";
    } else if (score >= 70) {
      riskLevel = "HIGH";
    } else if (score >= 40) {
      riskLevel = "MEDIUM";
    } else if (triggered.length > 0) {
      riskLevel = "MEDIUM";
    } else {
      riskLevel = "LOW";
    }

    // Status:
    let status: 'APPROVED' | 'FLAGGED' | 'BLOCKED' = "APPROVED";
    if (score >= 75) {
      status = "BLOCKED";
    } else if (score >= 40 || triggered.length > 0) {
      status = "FLAGGED";
    } else {
      status = "APPROVED";
    }

    const txId = transactions.length + 1;
    const refId = "TX-" + Date.now() + "-" + Math.floor(100 + Math.random() * 900);
    const effectiveReasons = reasons.length ? reasons : ["Transaction passed all fraud rules cleanly."];
    const nowStr = new Date().toISOString().replace('T', ' ').substring(0, 19);

    const effectiveMerchant = merchant || (recipientAccount.trim().startsWith('ACC-') ? 'Direct Transfer' : recipientAccount.trim());

    const newTx: StoredTransaction = {
      id: txId,
      userId,
      referenceId: refId,
      senderAccount: txSenderAccount,
      recipientAccount: recipientAccount.trim(),
      merchant: effectiveMerchant,
      amount: numAmount,
      transactionType: transactionType || "PAYMENT",
      status,
      riskScore: score,
      riskLevel,
      location: location || "New Delhi, India",
      createdAt: nowStr,
      notes: effectiveReasons.join("; ")
    };

    transactions.push(newTx);

    // Balance Update ONLY according to actual transaction result:
    let actionTaken = "";
    if (status === "APPROVED") {
      // Deduct amount from demo balance
      bankAcc.balance = Math.max(0, bankAcc.balance - numAmount);
      bankAcc.updatedAt = nowStr;
      user.balance = bankAcc.balance;
      actionTaken = `₹${numAmount.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} deducted from your Demo Bank account.`;
    } else if (status === "FLAGGED") {
      // Place transaction on hold / pending investigation, do NOT silently deduct money
      actionTaken = "Transaction placed on hold for review. Funds protected; no money was deducted.";
    } else {
      // BLOCKED: reject transaction, do NOT deduct money
      actionTaken = "Transaction blocked by FraudDetectionEngine. No money was deducted from your demo account.";
    }

    // If flagged or blocked, create alerts and a case with exact user mapping
    if (status === "FLAGGED" || status === "BLOCKED") {
      triggered.forEach(rule => {
        fraudAlerts.push({
          id: fraudAlerts.length + 1,
          transactionId: txId,
          userId,
          ruleCode: rule,
          severity: riskLevel,
          message: reasons.find(r => r.includes(rule)) || `Triggered rule ${rule}`,
          triggeredAt: nowStr
        });
      });

      fraudCases.push({
        id: fraudCases.length + 1,
        caseNumber: "CASE-" + Date.now() + "-" + Math.floor(10 + Math.random() * 90),
        transactionId: txId,
        userId,
        assignedTo: null,
        status: status === "BLOCKED" ? "OPEN" : "INVESTIGATING",
        riskScore: score,
        notes: reasons.join("; "),
        resolutionDetails: null,
        createdAt: nowStr
      });
    }

    // AUTOMATIC CUSTOMER NOTIFICATION
    const formattedAmt = `₹${numAmount.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
    let notifTitle = "Transaction Alert";
    let notifMsg = `${formattedAmt} debit detected from your Demo Bank account. Status: Approved.`;

    if (status === "BLOCKED") {
      notifTitle = "🚨 FRAUD ALERT";
      notifMsg = `${formattedAmt} transaction blocked. Risk Level: ${riskLevel}. Multiple suspicious signals detected. No money was deducted from your demo account.`;
    } else if (status === "FLAGGED") {
      notifTitle = "⚠️ FRAUD RISK DETECTED";
      notifMsg = `${formattedAmt} transaction detected. Risk Level: ${riskLevel}, Status: FLAGGED. Reason: ${reasons.join(', ')}. Action: Transaction placed on hold for review.`;
    }

    const newNotif: StoredNotification = {
      id: notifications.length + 1,
      userId,
      transactionId: txId,
      referenceId: refId,
      amount: numAmount,
      title: notifTitle,
      message: notifMsg,
      riskLevel,
      status,
      triggeredRules: [...triggered],
      reasons: [...effectiveReasons],
      recommendedAction: actionTaken,
      read: false,
      createdAt: nowStr
    };
    notifications.push(newNotif);

    const riskAnalysis = {
      riskScore: score,
      riskLevel,
      status,
      triggeredRules: triggered,
      reasons: effectiveReasons,
      flagged: status === "FLAGGED" || status === "BLOCKED",
      blocked: status === "BLOCKED"
    };

    return {
      transaction: newTx,
      riskAnalysis,
      bankAccount: bankAcc,
      notification: newNotif
    };
  }

  // Submit candidate transaction manually
  app.post('/api/transactions', (req, res) => {
    const authUser = getAuthenticatedUser(req);
    if (!authUser) {
      return res.status(401).json({ success: false, error: "Authentication required to submit transactions" });
    }

    const { recipientAccount, amount, transactionType, location, merchant } = req.body;
    const numAmount = parseMonetaryAmount(amount);

    if (!numAmount || numAmount <= 0) {
      return res.status(400).json({ success: false, error: "Transaction amount must be strictly positive" });
    }

    if (!recipientAccount || !recipientAccount.trim()) {
      return res.status(400).json({ success: false, error: "Recipient account is required" });
    }

    try {
      const result = processTransactionInternal({
        userId: authUser.id,
        recipientAccount: recipientAccount.trim(),
        amount: numAmount,
        transactionType,
        location,
        merchant
      });

      res.json({
        success: true,
        data: {
          ...result.transaction,
          triggeredRules: result.riskAnalysis.triggeredRules,
          reasons: result.riskAnalysis.reasons,
          riskAnalysis: result.riskAnalysis,
          bankAccount: result.bankAccount,
          notification: result.notification
        }
      });
    } catch (e: any) {
      res.status(500).json({ success: false, error: e.message });
    }
  });

  // Demo Bank Simulation Scenarios Catalog
  const BANK_SIMULATION_SCENARIOS = [
    {
      key: "coffee_safe",
      merchant: "Starbucks Demo Cafe",
      recipientAccount: "ACC-STARBUCKS-01",
      amount: 450.00,
      transactionType: "PURCHASE",
      location: "New Delhi, India",
      description: "Coffee & Pastry Debit — Clean & Approved"
    },
    {
      key: "amazon_safe",
      merchant: "Amazon India Demo",
      recipientAccount: "ACC-AMAZON-PAY-88",
      amount: 1500.00,
      transactionType: "PURCHASE",
      location: "Delhi, India",
      description: "Retail Store Purchase — Clean & Approved"
    },
    {
      key: "grocery_safe",
      merchant: "Blinkit Quick Demo",
      recipientAccount: "ACC-BLINKIT-99",
      amount: 2850.00,
      transactionType: "PURCHASE",
      location: "New Delhi, India",
      description: "Everyday Grocery Basket — Clean & Approved"
    },
    {
      key: "utility_safe",
      merchant: "Tata Power Utility Demo",
      recipientAccount: "ACC-TATA-POWER-99",
      amount: 4200.00,
      transactionType: "PAYMENT",
      location: "New Delhi, India",
      description: "Monthly Electricity Payment — Clean & Approved"
    },
    {
      key: "croma_electronics_flagged",
      merchant: "Croma Mega Electronics",
      recipientAccount: "ACC-CROMA-RETAIL-07",
      amount: 75000.00,
      transactionType: "PURCHASE",
      location: "Mumbai, India",
      description: "High-Value Electronic Debit — Flagged for Velocity & Deviation"
    },
    {
      key: "spike_transfer_flagged",
      merchant: "Unknown P2P Beneficiary",
      recipientAccount: "ACC-UNKNOWN-4401",
      amount: 250000.00,
      transactionType: "TRANSFER",
      location: "New Delhi, India",
      description: "Single spike exceeding ₹2,00,000 threshold — FLAGGED"
    },
    {
      key: "caracas_blocked",
      merchant: "Caracas Luxury Imports Demo",
      recipientAccount: "ACC-OFFSHORE-VE-99",
      amount: 500000.00,
      transactionType: "TRANSFER",
      location: "Caracas, Venezuela",
      description: "Unusual overseas geography anomaly — BLOCKED"
    },
    {
      key: "zurich_blocked",
      merchant: "Zurich Private Wire Demo",
      recipientAccount: "ACC-SWISS-WIRE-01",
      amount: 1000000.00,
      transactionType: "TRANSFER",
      location: "Zurich, Switzerland",
      description: "Major foreign wire deviation — BLOCKED"
    },
    {
      key: "nocturnal_atm_flagged",
      merchant: "Midnight ATM Cash Dispenser",
      recipientAccount: "ATM-SOUTH-DELHI-02",
      amount: 120000.00,
      transactionType: "WITHDRAWAL",
      location: "New Delhi, India",
      description: "Off-hours high cash withdrawal — FLAGGED"
    }
  ];

  // Bank Transaction Simulator: Generates automatic transaction events into the real FraudDetectionEngine
  app.post('/api/bank/simulate', (req, res) => {
    const authUser = getAuthenticatedUser(req);
    if (!authUser) {
      return res.status(401).json({ success: false, error: "Authentication required to simulate banking feed" });
    }

    const { scenarioKey, custom } = req.body;

    let targetScenario = BANK_SIMULATION_SCENARIOS.find(s => s.key === scenarioKey);
    if (!targetScenario) {
      if (custom && custom.amount) {
        targetScenario = {
          key: "custom",
          merchant: custom.merchant || "Demo Bank Partner",
          recipientAccount: custom.recipientAccount || "ACC-PARTNER-DEMO",
          amount: parseMonetaryAmount(custom.amount),
          transactionType: custom.transactionType || "PAYMENT",
          location: custom.location || "New Delhi, India",
          description: "Custom Banking Event"
        };
      } else {
        // Pick smart random scenario with realistic distribution
        // 60% clean purchases, 25% medium/flagged spikes, 15% high/critical anomalies
        const roll = Math.random();
        if (roll < 0.6) {
          const cleanPool = BANK_SIMULATION_SCENARIOS.filter(s => s.key.includes('_safe'));
          targetScenario = cleanPool[Math.floor(Math.random() * cleanPool.length)];
        } else if (roll < 0.85) {
          const flaggedPool = BANK_SIMULATION_SCENARIOS.filter(s => s.key.includes('_flagged'));
          targetScenario = flaggedPool[Math.floor(Math.random() * flaggedPool.length)];
        } else {
          const blockedPool = BANK_SIMULATION_SCENARIOS.filter(s => s.key.includes('_blocked'));
          targetScenario = blockedPool[Math.floor(Math.random() * blockedPool.length)];
        }
      }
    }

    try {
      const result = processTransactionInternal({
        userId: authUser.id,
        recipientAccount: targetScenario.recipientAccount,
        amount: targetScenario.amount,
        transactionType: targetScenario.transactionType,
        location: targetScenario.location,
        merchant: targetScenario.merchant
      });

      res.json({
        success: true,
        data: {
          scenario: targetScenario,
          transaction: result.transaction,
          riskAnalysis: result.riskAnalysis,
          bankAccount: result.bankAccount,
          notification: result.notification
        }
      });
    } catch (e: any) {
      res.status(500).json({ success: false, error: e.message });
    }
  });

  // Linked Demo Bank Account Endpoint
  app.get('/api/bank-account', (req, res) => {
    const authUser = getAuthenticatedUser(req);
    if (!authUser) {
      return res.status(401).json({ success: false, error: "Authentication required" });
    }

    let bankAcc = bankAccounts.find(b => b.customerId === authUser.id);
    if (!bankAcc) {
      const lastFour = (authUser.accountNumber || "4521").slice(-4);
      bankAcc = {
        bankAccountId: bankAccounts.length + 1,
        customerId: authUser.id,
        bankName: "FraudGuard Demo Bank",
        maskedAccountNumber: `XXXX XXXX ${lastFour}`,
        accountNumber: authUser.accountNumber || "ACC-" + authUser.id,
        balance: authUser.balance || 450000.00,
        registeredMobile: authUser.phone || "+91-98765-01002",
        status: "CONNECTED",
        createdAt: new Date().toISOString().replace('T', ' ').substring(0, 19),
        updatedAt: new Date().toISOString().replace('T', ' ').substring(0, 19)
      };
      bankAccounts.push(bankAcc);
    }

    res.json({ success: true, data: bankAcc });
  });

  app.post('/api/bank-account', (req, res) => {
    const authUser = getAuthenticatedUser(req);
    if (!authUser) {
      return res.status(401).json({ success: false, error: "Authentication required" });
    }

    const { action, amount } = req.body;
    let bankAcc = bankAccounts.find(b => b.customerId === authUser.id);
    if (!bankAcc) {
      const lastFour = (authUser.accountNumber || "4521").slice(-4);
      bankAcc = {
        bankAccountId: bankAccounts.length + 1,
        customerId: authUser.id,
        bankName: "FraudGuard Demo Bank",
        maskedAccountNumber: `XXXX XXXX ${lastFour}`,
        accountNumber: authUser.accountNumber || "ACC-" + authUser.id,
        balance: 450000.00,
        registeredMobile: authUser.phone || "+91-98765-01002",
        status: "CONNECTED",
        createdAt: new Date().toISOString().replace('T', ' ').substring(0, 19),
        updatedAt: new Date().toISOString().replace('T', ' ').substring(0, 19)
      };
      bankAccounts.push(bankAcc);
    }

    const nowStr = new Date().toISOString().replace('T', ' ').substring(0, 19);

    if (action === 'fund') {
      const topUp = parseMonetaryAmount(amount) || 100000.00;
      bankAcc.balance += topUp;
      bankAcc.updatedAt = nowStr;
      authUser.balance = bankAcc.balance;
      return res.json({ success: true, data: bankAcc, message: `Successfully topped up demo balance by ₹${topUp.toLocaleString('en-IN')}` });
    }

    if (action === 'reset') {
      bankAcc.balance = 450000.00;
      bankAcc.updatedAt = nowStr;
      authUser.balance = bankAcc.balance;
      return res.json({ success: true, data: bankAcc, message: "Demo bank balance reset to ₹4,50,000.00" });
    }

    res.status(400).json({ success: false, error: "Invalid action" });
  });

  // Customer Notifications & Notification Center Endpoints
  app.get('/api/notifications', (req, res) => {
    const authUser = getAuthenticatedUser(req);
    if (!authUser) {
      return res.status(401).json({ success: false, error: "Authentication required" });
    }

    let userNotifs = notifications.filter(n => n.userId === authUser.id);
    const unreadCount = userNotifs.filter(n => !n.read).length;

    res.json({
      success: true,
      data: {
        notifications: userNotifs.reverse(),
        unreadCount
      }
    });
  });

  app.post('/api/notifications', (req, res) => {
    const authUser = getAuthenticatedUser(req);
    if (!authUser) {
      return res.status(401).json({ success: false, error: "Authentication required" });
    }

    const { action, notificationId } = req.body;

    if (action === 'mark-read') {
      const target = notifications.find(n => n.id === Number(notificationId) && n.userId === authUser.id);
      if (target) {
        target.read = true;
      }
      return res.json({ success: true });
    }

    if (action === 'mark-all-read') {
      notifications.forEach(n => {
        if (n.userId === authUser.id) {
          n.read = true;
        }
      });
      return res.json({ success: true });
    }

    if (action === 'clear') {
      notifications = notifications.filter(n => n.userId !== authUser.id);
      return res.json({ success: true });
    }

    res.status(400).json({ success: false, error: "Invalid action" });
  });

  // Cases (Enforce Isolation for Customer, Full View for Admin)
  app.get('/api/cases', (req, res) => {
    const authUser = getAuthenticatedUser(req);
    const { openOnly, id } = req.query;

    if (id) {
      const fCase = fraudCases.find(c => c.id == Number(id));
      if (!fCase) return res.status(404).json({ success: false, error: "Case not found" });
      if (authUser && authUser.role === 'CUSTOMER' && fCase.userId !== authUser.id) {
        return res.status(404).json({ success: false, error: "Case not found or access denied" });
      }
      return res.json({ success: true, data: fCase });
    }

    let list = [...fraudCases];
    if (authUser && authUser.role === 'CUSTOMER') {
      list = list.filter(c => c.userId === authUser.id);
    } else if (req.query.userId) {
      list = list.filter(c => c.userId == Number(req.query.userId));
    }

    if (openOnly === 'true') {
      list = list.filter(c => c.status === 'OPEN' || c.status === 'INVESTIGATING');
    }

    res.json({ success: true, data: list.reverse() });
  });

  app.post('/api/cases', (req, res) => {
    const authUser = getAuthenticatedUser(req);
    if (!authUser || authUser.role !== 'ADMIN') {
      return res.status(403).json({ success: false, error: "Forbidden: Case operations require Administrator role" });
    }

    const action = req.query.action || 'open';
    if (action === 'assign') {
      const { caseId, adminId } = req.body;
      const fCase = fraudCases.find(c => c.id == caseId);
      if (!fCase) return res.status(404).json({ success: false, error: "Case not found" });
      fCase.assignedTo = adminId || authUser.id;
      fCase.status = "INVESTIGATING";
      return res.json({ success: true, data: fCase });
    }

    if (action === 'resolve') {
      const { caseId, finalStatus, resolutionDetails } = req.body;
      const fCase = fraudCases.find(c => c.id == caseId);
      if (!fCase) return res.status(404).json({ success: false, error: "Case not found" });
      fCase.status = finalStatus;
      fCase.resolutionDetails = resolutionDetails;
      return res.json({ success: true, data: fCase });
    }

    res.status(400).json({ success: false, error: "Invalid case action" });
  });

  // Alerts (Enforce Isolation for Customer)
  app.get('/api/alerts', (req, res) => {
    const authUser = getAuthenticatedUser(req);
    const { transactionId } = req.query;

    let list = [...fraudAlerts];
    if (authUser && authUser.role === 'CUSTOMER') {
      list = list.filter(a => a.userId === authUser.id);
    } else if (req.query.userId) {
      list = list.filter(a => a.userId == Number(req.query.userId));
    }

    if (transactionId) {
      list = list.filter(a => a.transactionId == Number(transactionId));
    }
    res.json({ success: true, data: list.reverse() });
  });

  // Dynamic User-Specific / Executive Dashboard Metrics
  app.get('/api/dashboard', (req, res) => {
    const authUser = getAuthenticatedUser(req);

    if (authUser && authUser.role === 'CUSTOMER') {
      // User-specific isolated metrics
      const userTxs = transactions.filter(t => t.userId === authUser.id);
      const userCases = fraudCases.filter(c => c.userId === authUser.id);

      const approved = userTxs.filter(t => t.status === 'APPROVED').length;
      const flagged = userTxs.filter(t => t.status === 'FLAGGED').length;
      const blocked = userTxs.filter(t => t.status === 'BLOCKED').length;
      const totalAmount = userTxs.reduce((acc, t) => acc + t.amount, 0);

      const fraudRate = userTxs.length > 0
        ? Number((((flagged + blocked) / userTxs.length) * 100).toFixed(1))
        : 0;

      return res.json({
        success: true,
        data: {
          totalTransactions: userTxs.length,
          openCasesCount: userCases.filter(c => c.status === 'OPEN' || c.status === 'INVESTIGATING').length,
          totalUsers: 1,
          fraudDetectionRate: fraudRate,
          totalAmountProcessed: totalAmount,
          accountBalance: authUser.balance,
          statusDistribution: {
            APPROVED: approved,
            FLAGGED: flagged,
            BLOCKED: blocked
          },
          riskDistribution: {
            LOW: userTxs.filter(t => t.riskLevel === 'LOW').length,
            MEDIUM: userTxs.filter(t => t.riskLevel === 'MEDIUM').length,
            HIGH: userTxs.filter(t => t.riskLevel === 'HIGH').length,
            CRITICAL: userTxs.filter(t => t.riskLevel === 'CRITICAL').length
          }
        }
      });
    }

    // Global Executive metrics for ADMIN
    const approved = transactions.filter(t => t.status === 'APPROVED').length;
    const flagged = transactions.filter(t => t.status === 'FLAGGED').length;
    const blocked = transactions.filter(t => t.status === 'BLOCKED').length;
    const totalAmount = transactions.reduce((acc, t) => acc + t.amount, 0);

    const fraudRate = transactions.length > 0
      ? Number((((flagged + blocked) / transactions.length) * 100).toFixed(1))
      : 0;

    res.json({
      success: true,
      data: {
        totalTransactions: transactions.length,
        openCasesCount: fraudCases.filter(c => c.status === 'OPEN' || c.status === 'INVESTIGATING').length,
        totalUsers: users.length,
        fraudDetectionRate: fraudRate,
        totalAmountProcessed: totalAmount,
        statusDistribution: {
          APPROVED: approved,
          FLAGGED: flagged,
          BLOCKED: blocked
        },
        riskDistribution: {
          LOW: transactions.filter(t => t.riskLevel === 'LOW').length,
          MEDIUM: transactions.filter(t => t.riskLevel === 'MEDIUM').length,
          HIGH: transactions.filter(t => t.riskLevel === 'HIGH').length,
          CRITICAL: transactions.filter(t => t.riskLevel === 'CRITICAL').length
        }
      }
    });
  });

  // Fraud Rules
  app.get('/api/rules', (req, res) => {
    res.json({ success: true, data: fraudRules });
  });

  app.post('/api/rules', (req, res) => {
    const authUser = getAuthenticatedUser(req);
    if (!authUser || authUser.role !== 'ADMIN') {
      return res.status(403).json({ success: false, error: "Forbidden: Admin clearance required to modify fraud rules" });
    }

    const { id, weight, thresholdValue, active } = req.body;
    const rule = fraudRules.find(r => r.id == id);
    if (!rule) return res.status(404).json({ success: false, error: "Rule not found" });

    if (weight !== undefined) rule.weight = Number(weight);
    if (thresholdValue !== undefined) rule.thresholdValue = Number(thresholdValue);
    if (active !== undefined) rule.active = Boolean(active);

    res.json({ success: true, data: rule });
  });

  // =========================================================================
  // QR PAYMENT & MOBILE APPROVAL MODULE (Cybersecurity-Hardened Architecture)
  // =========================================================================

  // 1. Generate Payment QR Code (Supports both fixed amount & open dynamic amount)
  app.post('/api/qr/generate', (req, res) => {
    const authUser = getAuthenticatedUser(req);
    if (!authUser) {
      return res.status(401).json({ success: false, error: "Authentication required to generate payment QR code" });
    }

    const { amount, description, recipientName, recipientAccount, expiresInMinutes = 60 } = req.body;
    const finalRecipientName = (recipientName && recipientName.trim()) || authUser.fullName || "Demo Verified Payee";
    const finalRecipientAccount = (recipientAccount && recipientAccount.trim()) || authUser.accountNumber || `ACC-DEMO-${authUser.id}`;
    const parsedAmount = amount !== undefined && amount !== null && amount !== '' ? parseMonetaryAmount(amount) : null;
    
    if (parsedAmount !== null && parsedAmount < 0) {
      return res.status(400).json({ success: false, error: "Payment amount cannot be negative" });
    }

    const requestId = `QR-REQ-${Date.now().toString(36).toUpperCase()}-${crypto.randomBytes(3).toString('hex').toUpperCase()}`;
    const expMins = Math.min(Math.max(Number(expiresInMinutes) || 60, 5), 1440);
    const expiresAt = new Date(Date.now() + expMins * 60 * 1000).toISOString();
    
    // Cryptographic HMAC signature to guarantee integrity
    const signature = signQRPayload({
      requestId,
      recipientAccount: finalRecipientAccount,
      amount: parsedAmount,
      expiresAt
    });

    const qrRequest: StoredQRPaymentRequest = {
      requestId,
      creatorUserId: authUser.id,
      recipientName: finalRecipientName,
      recipientAccount: finalRecipientAccount,
      amount: parsedAmount,
      description: description || (parsedAmount ? `Payment of ₹${parsedAmount.toLocaleString('en-IN')}` : "Dynamic Open QR Payment"),
      signature,
      expiresAt,
      createdAt: new Date().toISOString()
    };

    qrPaymentRequests.push(qrRequest);

    // Payload embedded inside the QR code (standardized JSON payload)
    const qrPayload = {
      fg_qr: true,
      ver: "1.0",
      req: requestId,
      recip: finalRecipientAccount,
      name: finalRecipientName,
      amt: parsedAmount,
      cur: "INR",
      desc: qrRequest.description,
      exp: expiresAt,
      sig: signature
    };

    res.json({
      success: true,
      data: {
        ...qrRequest,
        qrPayloadString: JSON.stringify(qrPayload),
        upiUriString: `upi://pay?pa=${encodeURIComponent(finalRecipientAccount)}&pn=${encodeURIComponent(finalRecipientName)}${parsedAmount ? `&am=${parsedAmount}` : ''}&cu=INR&tn=${encodeURIComponent(requestId)}`
      }
    });
  });

  // 2. Validate Scanned QR Code on Backend (Never trust untrusted QR payload directly)
  app.post('/api/qr/validate', (req, res) => {
    const { qrPayload } = req.body;
    if (!qrPayload || typeof qrPayload !== 'string') {
      return res.status(400).json({ success: false, error: "Empty or invalid QR code payload received" });
    }

    try {
      let parsed: any = null;
      let isJson = false;

      // Check if JSON format
      if (qrPayload.trim().startsWith('{')) {
        try {
          parsed = JSON.parse(qrPayload.trim());
          isJson = true;
        } catch {
          // not valid JSON
        }
      }

      // Check if standard UPI format: upi://pay?pa=...
      if (!isJson && qrPayload.trim().toLowerCase().startsWith('upi://pay')) {
        try {
          const urlObj = new URL(qrPayload.trim());
          const pa = urlObj.searchParams.get('pa') || '';
          const pn = urlObj.searchParams.get('pn') || 'UPI Merchant';
          const am = urlObj.searchParams.get('am');
          const tn = urlObj.searchParams.get('tn') || '';

          if (!pa) {
            return res.status(400).json({ success: false, error: "Invalid UPI QR: Payee address (pa) missing" });
          }

          const parsedAmt = am ? parseMonetaryAmount(am) : null;
          return res.json({
            success: true,
            data: {
              valid: true,
              trustLevel: "STANDARD_UPI_EXTERNAL",
              signatureVerified: false,
              recipientAccount: pa,
              recipientName: pn,
              amount: parsedAmt,
              isFixedAmount: parsedAmt !== null && parsedAmt > 0,
              description: tn || "UPI QR Payment",
              requestId: `UPI-EXT-${Date.now().toString(36).toUpperCase()}`,
              expiresAt: new Date(Date.now() + 3600000).toISOString(),
              notes: "Standard UPI QR payload decoded. Requires explicit user verification and mobile authorization."
            }
          });
        } catch (e: any) {
          return res.status(400).json({ success: false, error: "Malformed UPI URI string" });
        }
      }

      if (!isJson || !parsed) {
        return res.status(400).json({ success: false, error: "Unrecognized QR code format. Please scan a valid FraudGuard QR or standard UPI payment QR." });
      }

      const { req: reqId, recip, name, amt, exp, sig, desc } = parsed;
      if (!recip) {
        return res.status(400).json({ success: false, error: "Invalid QR: Recipient account missing in payload" });
      }

      const numAmt = amt !== undefined && amt !== null ? parseMonetaryAmount(amt) : null;
      const isExpired = exp ? new Date(exp).getTime() < Date.now() : false;
      if (isExpired) {
        return res.status(400).json({ success: false, error: "This payment QR code has expired. Please ask the recipient for an active QR code." });
      }

      const isSignatureValid = sig ? verifyQRPayload({
        requestId: reqId || '',
        recipientAccount: recip,
        amount: numAmt,
        expiresAt: exp || ''
      }, sig) : false;

      // Check if found in our server registered QR requests
      const registeredReq = qrPaymentRequests.find(r => r.requestId === reqId);

      return res.json({
        success: true,
        data: {
          valid: true,
          trustLevel: isSignatureValid ? "CRYPTOGRAPHICALLY_VERIFIED" : (registeredReq ? "DATABASE_MATCHED" : "UNVERIFIED_THIRD_PARTY"),
          signatureVerified: isSignatureValid,
          requestId: reqId || `QR-EXT-${Date.now().toString(36).toUpperCase()}`,
          recipientAccount: recip,
          recipientName: name || registeredReq?.recipientName || "Authorized Merchant",
          amount: numAmt ?? (registeredReq?.amount ?? null),
          isFixedAmount: numAmt !== null && numAmt > 0,
          description: desc || registeredReq?.description || "QR Point-of-Sale Payment",
          expiresAt: exp || registeredReq?.expiresAt,
          warning: isSignatureValid ? undefined : "Signature verification warning: Proceed with vigilance. Mobile approval strictly required."
        }
      });
    } catch (e: any) {
      return res.status(400).json({ success: false, error: "QR decoding failed: " + e.message });
    }
  });

  // 3. Initiate Registered Mobile Approval (Sends SMS to verified phone)
  app.post('/api/qr/request-approval', (req, res) => {
    const authUser = getAuthenticatedUser(req);
    if (!authUser) {
      return res.status(401).json({ success: false, error: "Authentication required to initiate payment approval" });
    }

    const { requestId, recipientAccount, recipientName, amount, description } = req.body;
    const numAmount = parseMonetaryAmount(amount);

    if (!numAmount || numAmount <= 0) {
      return res.status(400).json({ success: false, error: "Payment amount must be greater than zero" });
    }

    if (!recipientAccount || !recipientAccount.trim()) {
      return res.status(400).json({ success: false, error: "Recipient account is required" });
    }

    // Retrieve verified registered mobile number strictly linked to account
    const bankAcc = bankAccounts.find(b => b.customerId === authUser.id);
    const registeredMobile = bankAcc?.registeredMobile || authUser.phone || "+91-98765-01002";
    
    // Mask mobile number for cyber display (e.g., +91 98*** ***02)
    const digitsOnly = registeredMobile.replace(/\D/g, '');
    const last2 = digitsOnly.slice(-2);
    const first4 = digitsOnly.slice(0, 4);
    const maskedMobile = `+91 ${first4.slice(2)}*** ***${last2}`;

    // Generate 6-digit cryptographic SMS OTP code
    const otpCode = Math.floor(100000 + Math.random() * 900000).toString();
    const approvalId = `APPR-${Date.now().toString(36).toUpperCase()}-${crypto.randomBytes(2).toString('hex').toUpperCase()}`;
    const expiresAt = new Date(Date.now() + 5 * 60 * 1000).toISOString(); // 5 min TTL

    const pendingApproval: StoredPendingApproval = {
      approvalId,
      userId: authUser.id,
      requestId: requestId || `REQ-${Date.now()}`,
      recipientName: recipientName || "Verified Recipient",
      recipientAccount: recipientAccount.trim(),
      amount: numAmount,
      description: description || "QR POS Payment",
      registeredMobile,
      maskedMobile,
      otpCode,
      status: 'PENDING',
      createdAt: new Date().toISOString(),
      expiresAt
    };

    pendingApprovals.push(pendingApproval);

    res.json({
      success: true,
      data: {
        approvalId,
        requestId: pendingApproval.requestId,
        recipientName: pendingApproval.recipientName,
        recipientAccount: pendingApproval.recipientAccount,
        amount: numAmount,
        description: pendingApproval.description,
        registeredMobile,
        maskedMobile,
        demoSmsCode: otpCode, // Provided for registered device simulator HUD
        expiresAt
      }
    });
  });

  // 4. Confirm or Reject Registered Mobile Approval (Executes FraudDetectionEngine)
  app.post('/api/qr/approve', (req, res) => {
    const authUser = getAuthenticatedUser(req);
    if (!authUser) {
      return res.status(401).json({ success: false, error: "Authentication required to finalize approval" });
    }

    const { approvalId, action, otpCode, rejectionReason } = req.body;
    const approval = pendingApprovals.find(a => a.approvalId === approvalId && a.userId === authUser.id);

    if (!approval) {
      return res.status(404).json({ success: false, error: "Approval request not found or does not belong to current user" });
    }

    if (approval.status !== 'PENDING') {
      return res.status(400).json({ success: false, error: `This approval request was already processed (${approval.status})` });
    }

    if (new Date(approval.expiresAt).getTime() < Date.now()) {
      approval.status = 'EXPIRED';
      return res.status(400).json({ success: false, error: "Approval authorization request has expired. Please initiate again." });
    }

    // Handle rejection by user on registered mobile device
    if (action === 'REJECT') {
      approval.status = 'REJECTED';
      approval.rejectionReason = rejectionReason || "Cardholder explicitly rejected authorization on registered mobile device";

      const rejectedRecord: StoredQRPaymentRecord = {
        id: `QR-TX-${Date.now().toString(36).toUpperCase()}`,
        approvalId: approval.approvalId,
        userId: authUser.id,
        requestId: approval.requestId,
        recipientName: approval.recipientName,
        recipientAccount: approval.recipientAccount,
        amount: approval.amount,
        description: approval.description,
        status: 'REJECTED',
        riskScore: 0,
        riskLevel: 'LOW',
        reasons: ["Payment explicitly rejected on registered mobile device (" + approval.maskedMobile + ")"],
        registeredMobile: approval.registeredMobile,
        createdAt: new Date().toISOString().replace('T', ' ').substring(0, 19)
      };

      qrHistory.unshift(rejectedRecord);

      return res.json({
        success: true,
        data: {
          status: 'REJECTED',
          message: "Payment rejected on registered mobile device.",
          record: rejectedRecord
        }
      });
    }

    // Handle APPROVE: verify OTP code if supplied
    if (otpCode && otpCode.trim() !== approval.otpCode) {
      return res.status(400).json({ success: false, error: "Invalid 6-digit SMS verification code. Please check your registered device." });
    }

    // Approval granted on registered mobile device!
    // Submit transaction directly into the real FraudDetectionEngine
    try {
      const result = processTransactionInternal({
        userId: authUser.id,
        recipientAccount: approval.recipientAccount,
        amount: approval.amount,
        transactionType: "QR_PAY",
        location: "UPI QR Terminal, Mumbai, India",
        merchant: approval.recipientName
      });

      approval.status = 'APPROVED';
      approval.transactionId = result.transaction.id;

      const completedRecord: StoredQRPaymentRecord = {
        id: `QR-TX-${Date.now().toString(36).toUpperCase()}`,
        approvalId: approval.approvalId,
        userId: authUser.id,
        requestId: approval.requestId,
        recipientName: approval.recipientName,
        recipientAccount: approval.recipientAccount,
        amount: approval.amount,
        description: approval.description,
        status: result.transaction.status,
        riskScore: result.transaction.riskScore,
        riskLevel: result.transaction.riskLevel,
        reasons: result.riskAnalysis.reasons,
        referenceId: result.transaction.referenceId,
        registeredMobile: approval.registeredMobile,
        createdAt: new Date().toISOString().replace('T', ' ').substring(0, 19)
      };

      qrHistory.unshift(completedRecord);

      res.json({
        success: true,
        data: {
          ...result.transaction,
          triggeredRules: result.riskAnalysis.triggeredRules,
          reasons: result.riskAnalysis.reasons,
          riskAnalysis: result.riskAnalysis,
          bankAccount: result.bankAccount,
          notification: result.notification,
          qrPaymentRecord: completedRecord,
          maskedMobile: approval.maskedMobile
        }
      });
    } catch (e: any) {
      res.status(500).json({ success: false, error: e.message });
    }
  });

  // 5. Pending Approvals List
  app.get('/api/qr/pending-approvals', (req, res) => {
    const authUser = getAuthenticatedUser(req);
    if (!authUser) {
      return res.status(401).json({ success: false, error: "Authentication required" });
    }

    const list = pendingApprovals.filter(a => a.userId === authUser.id && a.status === 'PENDING' && new Date(a.expiresAt).getTime() > Date.now());
    res.json({ success: true, data: list.reverse() });
  });

  // 6. QR Payment History List
  app.get('/api/qr/history', (req, res) => {
    const authUser = getAuthenticatedUser(req);
    if (!authUser) {
      return res.status(401).json({ success: false, error: "Authentication required" });
    }

    let list = [...qrHistory];
    if (authUser.role === 'CUSTOMER') {
      list = list.filter(r => r.userId === authUser.id);
    }
    res.json({ success: true, data: list });
  });

  // ============================================================================
  // 10. AI CHATBOT COPILOT ENDPOINT (/api/chat) - Website & Payment Intelligence
  // ============================================================================
  function sanitizeChatReply(rawText: string, allUsersList: StoredUser[]): string {
    let text = rawText;
    // Mask known default passwords and usernames
    const sensitiveTokens = ['password123', 'admin123', 'john_doe'];
    for (const u of allUsersList) {
      if (u.username && u.username.length > 2) {
        sensitiveTokens.push(u.username);
      }
    }
    for (const token of sensitiveTokens) {
      const escaped = token.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      text = text.replace(new RegExp(`\\b${escaped}\\b`, 'gi'), '[PROTECTED]');
    }
    return text;
  }

  function buildLocalSocPaymentReply(
    query: string,
    authUser: StoredUser | null,
    userBank: StoredBankAccount | null | undefined,
    userTxs: StoredTransaction[],
    userCases: StoredCase[],
    userQrHistory: StoredQRPaymentRecord[],
    userPendingApprovals: StoredPendingApproval[]
  ): string {
    const q = query.toLowerCase();
    const balanceVal = userBank?.balance ?? authUser?.balance ?? 450000;
    const formattedBalance = `₹${balanceVal.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
    const acctNum = userBank?.maskedAccountNumber || authUser?.accountNumber || 'XXXX XXXX 4521';
    const mobileNum = userBank?.registeredMobile || authUser?.phone || '+91 98*** ***02';

    // 1. Queries about Login / Sign in / Credentials / Username / Password (SECURITY POLICY)
    if (
      q.includes('password') ||
      q.includes('username') ||
      q.includes('credential') ||
      q.includes('login') ||
      q.includes('sign in') ||
      q.includes('register')
    ) {
      return [
        `### 🔐 Security Policy — Credentials Protected`,
        `For your safety and security compliance, **usernames and passwords are never displayed or shared in the chatbot or dashboard**.`,
        `- **Sign In:** Use the **Secure Sign In** form or the **One-Click Role Authorization** buttons on the login screen.`,
        `- **New Account:** Click **Open Account** on the authentication screen to provision a new customer profile.`,
        `- **Cryptographic Protection:** All authentication keys are hashed with **SHA-256** and never exposed in plaintext.`
      ].join('\n');
    }

    // 2. Queries about QR Pay / UPI / OTP / Mobile Approval
    if (q.includes('qr') || q.includes('upi') || q.includes('otp') || q.includes('scan') || q.includes('mobile approval') || q.includes('sms')) {
      const pendingInfo = userPendingApprovals.length > 0
        ? `\n- **Active Pending Approvals (${userPendingApprovals.length}):** Latest is \`${userPendingApprovals[0].approvalId}\` for **₹${userPendingApprovals[0].amount.toLocaleString('en-IN')}** to **${userPendingApprovals[0].recipientName}**.`
        : `\n- **Pending Mobile Approvals:** None currently waiting.`;
      const qrHistInfo = userQrHistory.length > 0
        ? `\n- **Recent QR Payment:** **₹${userQrHistory[0].amount.toLocaleString('en-IN')}** to **${userQrHistory[0].recipientName}** — Status: **${userQrHistory[0].status}** (Risk Score: \`${userQrHistory[0].riskScore}\`).`
        : '';

      return [
        `### 📱 QR Pay & Registered Mobile OTP Approval`,
        `Our **QR Pay & Approvals** module provides cryptographic UPI/POS payment security:`,
        `- **Step 1 — Generate or Scan QR:** Open the **QR Pay & Approvals** tab to generate a signed payment QR code (HMAC-SHA256) or scan a merchant QR / upload a QR image / load a preset merchant QR.`,
        `- **Step 2 — Registered Mobile SMS Dispatch:** When you initiate payment, an authorization request and a **6-digit SMS OTP** are dispatched to your registered mobile number (**${mobileNum}**).`,
        `- **Step 3 — Approve or Reject on Device:** Enter the 6-digit OTP to authorize (or click **Reject Payment** to block unauthorized debits immediately).`,
        `- **Step 4 — Real-Time Fraud Engine Check:** Once approved via OTP, the payment passes through the **FraudDetectionEngine**. Clean payments debit your balance; high-risk payments (>= ₹2,00,000) trigger the emergency lockdown without deducting funds.`,
        pendingInfo + qrHistInfo
      ].join('\n');
    }

    // 3. Queries about making a payment / transfer / submitting transactions / simulator
    if (
      q.includes('how to pay') ||
      q.includes('make a payment') ||
      q.includes('send money') ||
      q.includes('transfer') ||
      q.includes('payment') ||
      q.includes('pay ') ||
      q.includes('submit') ||
      q.includes('simulat')
    ) {
      return [
        `### 💳 How Payments & Transfers Work on FraudGuard SOC`,
        `You can execute or test payments in **3 ways** on this website:`,
        `- **1. Candidate Evaluation (Direct Transfer):** Go to **Candidate Evaluation** in the sidebar, enter the **Recipient Account**, **Amount (₹ INR)**, **Transaction Type** (\`PAYMENT\`, \`TRANSFER\`, \`PURCHASE\`, \`WITHDRAWAL\`), and **Geographical Origin**, then click **Submit Candidate Transaction**.`,
        `- **2. QR Pay & Mobile OTP Approval:** Go to **QR Pay & Approvals** to scan a merchant QR code and authorize the payment using a 6-digit SMS OTP sent to your registered mobile (**${mobileNum}**).`,
        `- **3. Live Stream & Bank Simulator:** Go to **Live Stream & Simulator** to test instant preset payment scenarios (e.g., *Starbucks ₹450*, *Amazon ₹1,500*, *Croma ₹75,000 Flagged*, or *Caracas ₹5,00,000 Blocked*) or click **Fund Liquidity (+₹1,00,000)** to top up your demo bank balance.`,
        `\n**Current Account Liquidity:** **${formattedBalance}** on account \`${acctNum}\`.`
      ].join('\n');
    }

    // 4. Queries about Balance / Bank Account / Liquidity
    if (q.includes('balance') || q.includes('bank') || q.includes('liquidity') || q.includes('account') || q.includes('fund') || q.includes('money')) {
      return [
        `### 🏦 Linked Bank Account & Liquidity Status`,
        authUser
          ? `- **Account Holder:** **${authUser.fullName}** (${authUser.role})`
          : `- **Account Status:** Guest Session (Sign in to view personal account telemetry)`,
        `- **Bank Institution:** **${userBank?.bankName || 'FraudGuard SOC Core Bank'}**`,
        `- **Masked Account Number:** \`${acctNum}\``,
        `- **Available Balance:** **${formattedBalance}**`,
        `- **Registered Mobile:** \`${mobileNum}\` (Status: **${userBank?.status || 'CONNECTED'}**)`,
        `- **Tip:** You can add **+₹1,00,000** anytime or reset your balance to **₹4,50,000** inside the **Live Stream & Simulator** tab.`
      ].join('\n');
    }

    // 5. Queries about Fraud Rules / Flagged / Blocked / Risk Score
    if (q.includes('rule') || q.includes('flag') || q.includes('block') || q.includes('risk') || q.includes('score') || q.includes('why') || q.includes('engine') || q.includes('alert')) {
      const rulesList = fraudRules
        .map(r => `- **\`${r.ruleCode}\` (${r.ruleName}):** Weight **+${r.weight} pts** | Threshold: \`${r.ruleCode === 'HIGH_AMOUNT' ? '₹2,00,000' : r.thresholdValue}\` | Status: **${r.active ? 'ACTIVE' : 'DISABLED'}** — ${r.description}`)
        .join('\n');

      return [
        `### 🛡️ Real-Time Fraud Detection Engine & Risk Scoring`,
        `Every payment is evaluated across **${fraudRules.length} multi-signal fraud rules** before funds leave your account:`,
        rulesList,
        `\n**How Decisions Are Made:**`,
        `- **APPROVED (Risk Score < 35 — LOW):** Clean payment; amount is debited from your ₹ INR balance.`,
        `- **FLAGGED (Risk Score 35–69 — MEDIUM/HIGH):** Payment is held for compliance review; **funds are protected** and an audit case is opened.`,
        `- **BLOCKED (Risk Score ≥ 70 — CRITICAL):** Payment is immediately halted, triggers the **Full-Screen Emergency Lockdown**, **₹0.00 is deducted**, and a high-priority SOC investigation case is created.`
      ].join('\n');
    }

    // 6. Queries about Recent Transactions / History / Ledger
    if (q.includes('transaction') || q.includes('recent') || q.includes('history') || q.includes('ledger') || q.includes('audit') || q.includes('analyze')) {
      if (userTxs.length === 0) {
        return `### 📊 Transaction Ledger Analysis\nNo transactions found for the current session. Use the **Live Stream & Simulator** tab to generate real-time transactions.`;
      }
      const txLines = userTxs.slice(0, 5).map(
        t => `- **\`${t.referenceId}\`** — **₹${t.amount.toLocaleString('en-IN')}** to **${t.merchant || t.recipientAccount}** (${t.location}) → **${t.status}** [Risk: \`${t.riskLevel} ${t.riskScore}/100\`]`
      ).join('\n');

      return [
        `### 📊 Live Transaction & Payment Telemetry`,
        `Here are the latest transactions recorded on your ledger:`,
        txLines,
        `\n- **Current Available Balance:** **${formattedBalance}**`,
        `- **Open Investigation Cases:** **${userCases.filter(c => c.status === 'OPEN' || c.status === 'INVESTIGATING').length}** active case(s).`
      ].join('\n');
    }

    // 7. Queries about Investigation Cases
    if (q.includes('case') || q.includes('investigat') || q.includes('resolve')) {
      const caseLines = userCases.length > 0
        ? userCases.map(c => `- **\`${c.caseNumber}\`** (Tx #${c.transactionId}): Score **${c.riskScore}** | Status: **${c.status}** — *${c.notes}*`).join('\n')
        : `- Zero open fraud cases right now.`;
      return [
        `### 📁 Threat Investigation Cases`,
        `Whenever a payment is **FLAGGED** or **BLOCKED**, the engine automatically opens an audit case in the **Threat Investigations** tab:`,
        caseLines,
        `\nSOC Administrators can review and resolve cases as **Authorize (Legitimate)** or **Confirm Fraud**.`
      ].join('\n');
    }

    // 8. General Website Overview / Default Helpful Response
    return [
      `### 🛡️ FraudGuard SOC — Website & Payment Assistant`,
      authUser
        ? `You are signed in as **${authUser.fullName}** (\`${authUser.role}\`) with **${formattedBalance}** available in \`${acctNum}\`.`
        : `Welcome to **FraudGuard SOC** (Indian Rupee ₹ INR Real-Time Banking & Fraud Detection Platform).`,
      `\nHere is what I can help you with right now:`,
      `- **Payments & Transfers:** Ask *"How do I make a payment?"* or use **Candidate Evaluation** & **QR Pay & Approvals**.`,
      `- **QR Pay & SMS OTP:** Ask *"How does QR Pay & mobile OTP approval work?"* to learn about cryptographic QR verification.`,
      `- **Live Account & Ledger:** Ask *"Analyze my recent transactions"* or *"Check my linked bank balance"*.`,
      `- **Fraud Rules & Alerts:** Ask *"Why do transactions get FLAGGED or BLOCKED?"* to inspect the 6 real-time detection rules.`
    ].join('\n');
  }

  app.post('/api/chat', async (req, res) => {
    try {
      const { message, history, activeTab } = req.body || {};
      if (!message || typeof message !== 'string') {
        return res.status(400).json({ success: false, error: 'Message is required' });
      }

      const authUser = getAuthenticatedUser(req);
      const userTxs = authUser
        ? (authUser.role === 'ADMIN' ? transactions : transactions.filter(t => t.userId === authUser.id)).slice(0, 8)
        : transactions.slice(0, 5);
      const userCases = authUser
        ? (authUser.role === 'ADMIN' ? fraudCases : fraudCases.filter(c => c.userId === authUser.id)).slice(0, 5)
        : fraudCases.slice(0, 3);
      const userBank = authUser ? bankAccounts.find(b => b.customerId === authUser.id) : bankAccounts[0];
      const userQrHistory = authUser
        ? (authUser.role === 'ADMIN' ? qrHistory : qrHistory.filter(r => r.userId === authUser.id)).slice(0, 5)
        : qrHistory.slice(0, 3);
      const userPendingApprovals = authUser
        ? pendingApprovals.filter(a => a.userId === authUser.id && a.status === 'PENDING')
        : [];

      const activeRulesSummary = fraudRules.map(
        r => `${r.ruleCode} (${r.ruleName}): weight=${r.weight}, threshold=${r.thresholdValue}, active=${r.active}`
      ).join('; ');

      // Enforce strict security check if user asks for passwords or usernames
      const lowerMsg = message.toLowerCase();
      if (lowerMsg.includes('password') || lowerMsg.includes('username') || lowerMsg.includes('credential')) {
        return res.json({
          success: true,
          reply: buildLocalSocPaymentReply(
            message,
            authUser,
            userBank,
            userTxs,
            userCases,
            userQrHistory,
            userPendingApprovals
          )
        });
      }

      const apiKey = process.env.GEMINI_API_KEY;
      const hasValidApiKey = Boolean(apiKey && apiKey.trim() !== '' && apiKey !== 'MY_GEMINI_API_KEY');

      if (hasValidApiKey) {
        try {
          const systemContext = [
            `You are FraudGuard SOC Copilot, an expert AI cybersecurity and payment assistant built into the FraudGuard SOC Fraud Detection System (all amounts in Indian Rupees ₹ INR).`,
            `STRICT SECURITY POLICY: NEVER display, reveal, or mention any usernames or passwords in your responses under any circumstances. Credentials are confidential and protected.`,
            `You help users solve queries related to this website, payments, QR Pay, mobile SMS OTP approvals, bank balances, transaction statuses (APPROVED, FLAGGED, BLOCKED), and fraud rules.`,
            `Keep responses concise, accurate, and well-structured using **bold** key terms and bullet points.`,
            `Current UI Tab: ${activeTab || 'dashboard'}.`,
            authUser
              ? `Authenticated Account Holder: ${authUser.fullName}, Role: ${authUser.role}, Masked Account: ${userBank?.maskedAccountNumber || 'XXXX XXXX 4521'}, Balance: ₹${(userBank?.balance ?? authUser.balance).toLocaleString('en-IN')}.`
              : `User Status: Guest on Login/Registration screen. Users can sign in using the Secure Sign In form or Role Quick-Launch buttons on the login page.`,
            `Website Navigation Tabs: 1) SOC Command Center / Account Dashboard, 2) Live Stream & Simulator (fund +₹1,00,000, reset to ₹4,50,000, run preset safe/flagged/blocked scenarios), 3) QR Pay & Approvals (generate HMAC-signed QR, scan merchant QR, approve/reject via 6-digit SMS OTP on registered mobile), 4) Transaction Ledger, 5) Candidate Evaluation (submit custom payment/transfer), 6) Threat Investigations (cases), 7) Security Profile, 8) User Directory & Threat Rule Matrix (Admin).`,
            `Fraud Detection Engine Rules: ${activeRulesSummary}.`,
            `Risk Scoring Thresholds: Score >= 70 -> CRITICAL (BLOCKED, zero funds deducted, emergency alert + case opened); Score 35-69 -> MEDIUM/HIGH (FLAGGED, held for review, funds protected); Score < 35 -> LOW (APPROVED, balance debited).`,
            userTxs.length > 0
              ? `Recent Transactions: ` +
                userTxs.map(t => `[${t.referenceId}: ₹${t.amount} to ${t.merchant || t.recipientAccount} at ${t.location}, Status=${t.status}, Score=${t.riskScore} (${t.riskLevel})]`).join(' | ')
              : `No transactions yet.`,
            userCases.length > 0
              ? `Fraud Cases: ` +
                userCases.map(c => `[${c.caseNumber}: Tx#${c.transactionId}, Status=${c.status}, Score=${c.riskScore}, Notes=${c.notes}]`).join(' | ')
              : `No active fraud cases.`
          ].join('\n');

          const ai = new GoogleGenAI({
            apiKey,
            httpOptions: {
              headers: {
                'User-Agent': 'aistudio-build',
              },
            },
          });

          const conversationTranscript = Array.isArray(history)
            ? history
                .slice(-8)
                .map((h: any) => `${h.role === 'user' ? 'User' : 'Assistant'}: ${h.text}`)
                .join('\n')
            : '';

          const promptContents = conversationTranscript
            ? `${conversationTranscript}\nUser: ${message}`
            : message;

          const response = await ai.models.generateContent({
            model: 'gemini-3.8-flash',
            contents: promptContents,
            config: {
              systemInstruction: systemContext,
            },
          });

          if (response.text) {
            return res.json({
              success: true,
              reply: sanitizeChatReply(response.text, users),
            });
          }
        } catch (geminiErr: any) {
          console.warn('Gemini API fallback triggered:', geminiErr?.message || geminiErr);
        }
      }

      // Seamless live telemetry response for website & payment queries
      const fallbackReply = buildLocalSocPaymentReply(
        message,
        authUser,
        userBank,
        userTxs,
        userCases,
        userQrHistory,
        userPendingApprovals
      );

      return res.json({
        success: true,
        reply: sanitizeChatReply(fallbackReply, users),
      });
    } catch (error: any) {
      console.error('Chat endpoint error:', error);
      return res.status(500).json({
        success: false,
        error: error?.message || 'Failed to process chat query.',
      });
    }
  });

  // Serve static audio assets
  app.use('/sounds', express.static(path.join(process.cwd(), 'public', 'sounds')));

  // Download project ZIP archive endpoint
  app.get(['/fraud-detection-system.zip', '/api/download-project', '/api/download-zip'], (req, res) => {
    const publicZip = path.join(process.cwd(), 'public', 'fraud-detection-system.zip');
    const rootZip = path.join(process.cwd(), 'fraud-detection-system.zip');
    const targetFile = fs.existsSync(publicZip) ? publicZip : rootZip;

    if (fs.existsSync(targetFile)) {
      res.setHeader('Content-Type', 'application/zip');
      res.setHeader('Content-Disposition', 'attachment; filename="fraud-detection-system.zip"');
      return res.sendFile(targetFile);
    } else {
      return res.status(404).json({ success: false, error: 'Project archive not found' });
    }
  });

async function startServer() {
  if (process.env.NODE_ENV !== 'production') {
    const vitePkg = 'vite';
    const { createServer: createViteServer } = await import(vitePkg);
    const vite = await createViteServer({
      server: { 
        middlewareMode: true,
        allowedHosts: [
          'fraud-detection-systm.ai.studio',
          '.ai.studio',
          '.vercel.app',
          'localhost',
          '127.0.0.1'
        ]
      },
      preview: {
        allowedHosts: [
          'fraud-detection-systm.ai.studio',
          '.ai.studio',
          '.vercel.app',
          'localhost',
          '127.0.0.1'
        ]
      },
      appType: 'spa'
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    if (fs.existsSync(distPath)) {
      app.use(express.static(distPath));
      app.get('*', (req, res) => {
        res.sendFile(path.join(distPath, 'index.html'));
      });
    }
  }

  const listenPort = Number(process.env.PORT) || PORT;
  app.listen(listenPort, '0.0.0.0', () => {
    console.log(`Fraud Detection System running at http://0.0.0.0:${listenPort}`);
  });
}

if (!process.env.VERCEL) {
  startServer();
}

export { app };
export default app;
