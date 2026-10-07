export type TransactionChannel = 'MOBILE_APP' | 'WEB_PORTAL' | 'ATM' | 'POS_TERMINAL';

export type MerchantCategory = 
  | 'GROCERY_ESSENTIALS'
  | 'ELECTRONICS_TECH'
  | 'CRYPTO_EXCHANGE'
  | 'LUXURY_JEWELRY'
  | 'DINING_ENTERTAINMENT'
  | 'WIRE_TRANSFER_SERVICE';

export type TransactionStatus = 'NORMAL' | 'SUSPICIOUS';

export type FraudCaseStatus = 'PENDING_REVIEW' | 'CONFIRMED_FRAUD' | 'FALSE_POSITIVE' | 'DISMISSED';

export interface UserProfile {
  userId: string;
  name: string;
  email: string;
  accountAgeDays: number;
  historicalAvgAmount: number;
  usualLocation: string;
  priorTransactionsCount: number;
}

export interface TransactionData {
  transactionId: string;
  userId: string;
  amount: number;
  timestamp: string; // ISO format or HH:mm
  hourOfDay: number; // 0-23
  location: string;
  channel: TransactionChannel;
  merchantCategory: MerchantCategory;
  velocityWindowCount: number; // transactions in last 10 minutes
  userHistoricalAvg: number;
}

export interface RiskFactorsBreakdown {
  amountAnomalyScore: number;       // 0.0 - 1.0
  locationDiscrepancyScore: number;  // 0.0 - 1.0
  velocityScore: number;            // 0.0 - 1.0
  timeAnomalyScore: number;         // 0.0 - 1.0
  merchantRiskScore: number;        // 0.0 - 1.0
  weightedSumZ: number;
  finalRiskScore: number;           // 0.0 - 1.0
  triggeredAlerts: string[];
}

export interface TransactionEvaluationResult {
  transaction: TransactionData;
  status: TransactionStatus;
  riskScore: number;
  threshold: number;
  breakdown: RiskFactorsBreakdown;
  evaluatedAt: string;
  alertMessage?: string;
  caseId?: string;
}

export interface SystemConfiguration {
  fraudThreshold: number; // e.g. 0.65 (range: 0.10 to 0.95)
  amountAnomalyWeight: number; // default 0.30
  locationDiscrepancyWeight: number; // default 0.25
  velocityWeight: number; // default 0.20
  timeAnomalyWeight: number; // default 0.15
  merchantRiskWeight: number; // default 0.10
  biasOffset: number; // -0.5
  lastUpdatedBy: string;
  lastUpdatedAt: string;
}

export interface FraudCaseRecord {
  caseId: string;
  transaction: TransactionData;
  riskScore: number;
  thresholdAtEvaluation: number;
  status: FraudCaseStatus;
  detectedReasons: string[];
  createdAt: string;
  investigatorNotes: string;
  resolvedAt?: string;
}

export interface ModelPerformanceData {
  modelName: string;
  modelVersion: string;
  algorithmType: string;
  totalEvaluated: number;
  truePositives: number;
  falsePositives: number;
  trueNegatives: number;
  falseNegatives: number;
  accuracy: number;
  precision: number;
  recall: number;
  f1Score: number;
  lastRetrainedAt: string;
}
