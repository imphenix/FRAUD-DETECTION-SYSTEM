export interface JavaFile {
  filename: string;
  className: string;
  package: string;
  description: string;
  code: string;
}

export const JAVA_SOURCE_FILES: JavaFile[] = [
  {
    filename: "User.java",
    className: "User",
    package: "com.neuralbank.fraud.model",
    description: "Represents a banking customer profile, historical baseline spend, and transaction submission capability.",
    code: `package com.neuralbank.fraud.model;

import com.neuralbank.fraud.engine.FraudDetectionSystem;
import java.util.ArrayList;
import java.util.Collections;
import java.util.List;
import java.util.Objects;

/**
 * Represents a customer in the NeuralBank Fraud Detection ecosystem.
 * Encapsulates account metadata and historical spending behavior used
 * as a baseline for anomaly detection.
 */
public class User {
    private final String userId;
    private String name;
    private String email;
    private double historicalAvgSpend;
    private String registeredLocation;
    private final List<Transaction> transactionHistory;

    public User(String userId, String name, String email, double historicalAvgSpend, String registeredLocation) {
        if (userId == null || userId.trim().isEmpty()) {
            throw new IllegalArgumentException("User ID cannot be null or empty.");
        }
        if (historicalAvgSpend < 0) {
            throw new IllegalArgumentException("Historical average spend cannot be negative.");
        }
        this.userId = userId.trim();
        this.name = Objects.requireNonNull(name, "Name cannot be null").trim();
        this.email = Objects.requireNonNull(email, "Email cannot be null").trim();
        this.historicalAvgSpend = historicalAvgSpend;
        this.registeredLocation = Objects.requireNonNull(registeredLocation, "Location cannot be null").trim();
        this.transactionHistory = new ArrayList<>();
    }

    /**
     * Submits a transaction to the central FraudDetectionSystem for real-time AI evaluation.
     */
    public FraudDetectionSystem.EvaluationResult submitTransaction(
            FraudDetectionSystem system,
            Transaction transaction
    ) {
        Objects.requireNonNull(system, "FraudDetectionSystem reference cannot be null.");
        Objects.requireNonNull(transaction, "Transaction cannot be null.");
        this.transactionHistory.add(transaction);
        return system.evaluateTransaction(transaction);
    }

    public String getUserId() { return userId; }
    public String getName() { return name; }
    public String getEmail() { return email; }
    public double getHistoricalAvgSpend() { return historicalAvgSpend; }
    public String getRegisteredLocation() { return registeredLocation; }

    public List<Transaction> getTransactionHistory() {
        return Collections.unmodifiableList(transactionHistory);
    }
}
`
  },
  {
    filename: "Admin.java",
    className: "Admin",
    package: "com.neuralbank.fraud.model",
    description: "Represents a security administrator with privileges to calibrate risk thresholds, tune weights, and generate audit reports.",
    code: `package com.neuralbank.fraud.model;

import com.neuralbank.fraud.engine.Configuration;
import com.neuralbank.fraud.engine.DetectionReport;
import com.neuralbank.fraud.engine.FraudDetectionSystem;
import java.util.Objects;

/**
 * Represents a privileged Security / Risk Administrator capable of tuning
 * detection hyperparameters and generating compliance audit reports.
 */
public class Admin {
    private final String adminId;
    private final String name;
    private final String roleTitle;

    public Admin(String adminId, String name, String roleTitle) {
        if (adminId == null || adminId.trim().isEmpty()) {
            throw new IllegalArgumentException("Admin ID cannot be null or empty.");
        }
        this.adminId = adminId.trim();
        this.name = Objects.requireNonNull(name, "Admin name cannot be null").trim();
        this.roleTitle = Objects.requireNonNull(roleTitle, "Role title cannot be null").trim();
    }

    /**
     * Updates the active system configuration in the FraudDetectionSystem.
     */
    public String configureSystem(FraudDetectionSystem system, Configuration newConfig) {
        Objects.requireNonNull(system, "FraudDetectionSystem cannot be null.");
        Objects.requireNonNull(newConfig, "Configuration cannot be null.");
        system.updateConfiguration(newConfig);
        return String.format("[CONFIRMATION] Configuration successfully updated by %s (%s). New Threshold: %.2f",
                this.name, this.roleTitle, newConfig.getFraudThreshold());
    }

    /**
     * Generates an immutable DetectionReport snapshot from the FraudDetectionSystem.
     */
    public DetectionReport generateDetectionReport(FraudDetectionSystem system) {
        Objects.requireNonNull(system, "FraudDetectionSystem cannot be null.");
        return system.generateReport();
    }

    public String getAdminId() { return adminId; }
    public String getName() { return name; }
    public String getRoleTitle() { return roleTitle; }
}
`
  },
  {
    filename: "Transaction.java",
    className: "Transaction",
    package: "com.neuralbank.fraud.model",
    description: "Immutable value object encapsulating transaction attributes, timestamp, geolocation, channel, and velocity metrics.",
    code: `package com.neuralbank.fraud.model;

import java.time.LocalDateTime;
import java.util.Objects;

/**
 * Immutable domain object representing a financial transaction.
 */
public final class Transaction {
    private final String transactionId;
    private final String userId;
    private final double amount;
    private final LocalDateTime timestamp;
    private final String location;
    private final String channel;
    private final String merchantCategory;
    private final int velocityWindowCount;
    private final double userHistoricalAvg;

    public Transaction(
            String transactionId,
            String userId,
            double amount,
            LocalDateTime timestamp,
            String location,
            String channel,
            String merchantCategory,
            int velocityWindowCount,
            double userHistoricalAvg
    ) {
        if (transactionId == null || transactionId.trim().isEmpty()) {
            throw new IllegalArgumentException("Transaction ID cannot be null or empty.");
        }
        if (userId == null || userId.trim().isEmpty()) {
            throw new IllegalArgumentException("User ID cannot be null or empty.");
        }
        if (amount <= 0) {
            throw new IllegalArgumentException("Transaction amount must be strictly positive (> 0).");
        }
        if (velocityWindowCount < 0) {
            throw new IllegalArgumentException("Velocity count cannot be negative.");
        }
        this.transactionId = transactionId.trim();
        this.userId = userId.trim();
        this.amount = amount;
        this.timestamp = Objects.requireNonNull(timestamp, "Timestamp cannot be null.");
        this.location = Objects.requireNonNull(location, "Location cannot be null.").trim();
        this.channel = Objects.requireNonNull(channel, "Channel cannot be null.").trim();
        this.merchantCategory = Objects.requireNonNull(merchantCategory, "Merchant category cannot be null.").trim();
        this.velocityWindowCount = velocityWindowCount;
        this.userHistoricalAvg = Math.max(1.0, userHistoricalAvg);
    }

    public String getTransactionId() { return transactionId; }
    public String getUserId() { return userId; }
    public double getAmount() { return amount; }
    public LocalDateTime getTimestamp() { return timestamp; }
    public String getLocation() { return location; }
    public String getChannel() { return channel; }
    public String getMerchantCategory() { return merchantCategory; }
    public int getVelocityWindowCount() { return velocityWindowCount; }
    public double getUserHistoricalAvg() { return userHistoricalAvg; }

    @Override
    public String toString() {
        return String.format(
            "Transaction[ID=%s, User=%s, Amount=₹%.2f, Time=%s, Location=%s, Channel=%s, Cat=%s, Velocity=%d, UserAvg=₹%.2f]",
            transactionId, userId, amount, timestamp, location, channel, merchantCategory, velocityWindowCount, userHistoricalAvg
        );
    }
}
`
  },
  {
    filename: "FraudCase.java",
    className: "FraudCase",
    package: "com.neuralbank.fraud.model",
    description: "Forensic incident record generated whenever a transaction's computed risk score exceeds the active fraud threshold.",
    code: `package com.neuralbank.fraud.model;

import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.Collections;
import java.util.List;
import java.util.Objects;

/**
 * Represents a flagged suspicious transaction case for forensic review.
 */
public class FraudCase {
    private final String caseId;
    private final Transaction transaction;
    private final double riskScore;
    private final double thresholdAtEvaluation;
    private String status;
    private final List<String> detectedTriggers;
    private final LocalDateTime createdAt;

    public FraudCase(
            String caseId,
            Transaction transaction,
            double riskScore,
            double thresholdAtEvaluation,
            List<String> detectedTriggers
    ) {
        this.caseId = Objects.requireNonNull(caseId, "Case ID cannot be null.");
        this.transaction = Objects.requireNonNull(transaction, "Transaction cannot be null.");
        this.riskScore = riskScore;
        this.thresholdAtEvaluation = thresholdAtEvaluation;
        this.status = "PENDING_REVIEW";
        this.detectedTriggers = new ArrayList<>(Objects.requireNonNull(detectedTriggers));
        this.createdAt = LocalDateTime.now();
    }

    public void updateStatus(String newStatus) {
        if (newStatus == null || newStatus.trim().isEmpty()) {
            throw new IllegalArgumentException("Status cannot be empty.");
        }
        this.status = newStatus.trim();
    }

    public String getCaseId() { return caseId; }
    public Transaction getTransaction() { return transaction; }
    public double getRiskScore() { return riskScore; }
    public double getThresholdAtEvaluation() { return thresholdAtEvaluation; }
    public String getStatus() { return status; }
    public List<String> getDetectedTriggers() { return Collections.unmodifiableList(detectedTriggers); }
    public LocalDateTime getCreatedAt() { return createdAt; }
}
`
  },
  {
    filename: "DetectionModel.java",
    className: "DetectionModel",
    package: "com.neuralbank.fraud.engine",
    description: "Encapsulates the NeuralBank Sigmoidal Perceptron model metadata, confusion matrix metrics, and gradient weight refinement.",
    code: `package com.neuralbank.fraud.engine;

/**
 * Represents the calibrated Sigmoidal Logistic Perceptron model and tracks
 * classification performance metrics (Precision, Recall, F1, Accuracy).
 */
public class DetectionModel {
    private final String modelName;
    private final String modelVersion;
    private int totalEvaluated;
    private int truePositives;
    private int falsePositives;

    public DetectionModel(String modelName, String modelVersion) {
        this.modelName = modelName;
        this.modelVersion = modelVersion;
        this.totalEvaluated = 1420;
        this.truePositives = 114;
        this.falsePositives = 7;
    }

    /**
     * Refines configuration feature weights using simulated performance feedback iterations.
     */
    public String refineWeights(Configuration config, double learningRate, int iterations) {
        if (learningRate <= 0 || learningRate > 1.0) {
            throw new IllegalArgumentException("Learning rate must be in (0.0, 1.0].");
        }
        if (iterations < 1) {
            throw new IllegalArgumentException("Iterations must be >= 1.");
        }

        double delta = 0.01 * iterations * learningRate;
        double newAmountW = Math.min(0.40, config.getAmountAnomalyWeight() + delta);
        double newLocW = Math.min(0.35, config.getLocationDiscrepancyWeight() + (delta * 0.6));
        double remaining = 1.0 - (newAmountW + newLocW);
        double newVelW = remaining * 0.45;
        double newTimeW = remaining * 0.35;
        double newMerchW = 1.0 - (newAmountW + newLocW + newVelW + newTimeW);

        config.updateWeights(newAmountW, newLocW, newVelW, newTimeW, newMerchW);
        this.totalEvaluated += iterations * 12;
        this.truePositives += iterations;

        return String.format(
            "[ALGORITHM UPDATE SUCCESS] Weights recalibrated after %d feedback iterations (LR=%.3f). New Amount Weight: %.3f, Location Weight: %.3f.",
            iterations, learningRate, newAmountW, newLocW
        );
    }

    public String getModelName() { return modelName; }
    public String getModelVersion() { return modelVersion; }
    public int getTotalEvaluated() { return totalEvaluated; }
    public int getTruePositives() { return truePositives; }
    public int getFalsePositives() { return falsePositives; }
}
`
  },
  {
    filename: "RuleEngine.java",
    className: "RuleEngine",
    package: "com.neuralbank.fraud.engine",
    description: "Executes feature extraction across 5 risk dimensions and computes the calibrated sigmoid probability score.",
    code: `package com.neuralbank.fraud.engine;

import com.neuralbank.fraud.model.Transaction;
import java.util.ArrayList;
import java.util.List;

/**
 * Core feature extraction and mathematical risk scoring engine.
 * Normalizes 5 orthogonal fraud signals into [0.0, 1.0] and applies
 * a calibrated Sigmoidal Logistic Perceptron transformation.
 */
public class RuleEngine {

    public static class ScoringBreakdown {
        private final double finalRiskScore;
        private final List<String> triggeredReasons;

        public ScoringBreakdown(double finalRiskScore, List<String> triggeredReasons) {
            this.finalRiskScore = finalRiskScore;
            this.triggeredReasons = triggeredReasons;
        }

        public double getFinalRiskScore() { return finalRiskScore; }
        public List<String> getTriggeredReasons() { return triggeredReasons; }
    }

    public ScoringBreakdown evaluate(Transaction tx, Configuration config) {
        List<String> triggers = new ArrayList<>();

        // 1. Amount Anomaly Score
        double baseline = Math.max(10.0, tx.getUserHistoricalAvg());
        double ratio = tx.getAmount() / baseline;
        double amountScore;
        if (ratio <= 1.2) amountScore = 0.05 * ratio;
        else if (ratio <= 3.0) amountScore = 0.15 + (ratio - 1.2) * 0.25;
        else if (ratio <= 10.0) amountScore = 0.60 + (ratio - 3.0) * 0.04;
        else amountScore = Math.min(1.0, 0.88 + Math.log10(ratio) * 0.08);

        if (ratio > 3.0) {
            triggers.add(String.format("Amount ₹%.2f is %.1fx higher than user 30-day baseline (₹%.2f)",
                    tx.getAmount(), ratio, baseline));
        }

        // 2. Location Discrepancy Score
        String loc = tx.getLocation().toUpperCase();
        double locationScore = 0.30;
        if (loc.contains("LAGOS") || loc.contains("KYIV") || loc.contains("PROXY") || loc.contains("TOR")) {
            locationScore = 0.95;
            triggers.add("Transaction location flagged as high-risk cross-border or foreign proxy: " + tx.getLocation());
        } else if (loc.contains("SAN FRANCISCO") || loc.contains("NEW YORK") || loc.contains("CHICAGO")) {
            locationScore = 0.05;
        }

        // 3. Velocity Score
        int vel = tx.getVelocityWindowCount();
        double velocityScore = vel <= 1 ? 0.02 : (vel == 2 ? 0.15 : (vel == 3 ? 0.45 : (vel == 4 ? 0.75 : 0.98)));
        if (vel >= 4) {
            triggers.add("Unusual velocity burst: " + vel + " transactions in 10-minute window");
        }

        // 4. Temporal Anomaly Score
        int hour = tx.getTimestamp().getHour();
        double timeScore = (hour >= 2 && hour <= 4) ? 0.90 : ((hour == 1 || hour == 5) ? 0.55 : 0.05);
        if (timeScore >= 0.75) {
            triggers.add("Off-hours execution during dormant sleep window (02:00 - 05:00)");
        }

        // 5. Merchant Category Risk Score
        String cat = tx.getMerchantCategory().toUpperCase();
        double merchantScore = 0.05;
        if (cat.contains("CRYPTO") || cat.contains("WIRE")) {
            merchantScore = 0.90;
            triggers.add("Elevated merchant category risk: " + tx.getMerchantCategory());
        } else if (cat.contains("LUXURY") || cat.contains("ELECTRONICS")) {
            merchantScore = 0.65;
        }

        // Linear dot product W · X
        double weightedSum =
                (amountScore * config.getAmountAnomalyWeight()) +
                (locationScore * config.getLocationDiscrepancyWeight()) +
                (velocityScore * config.getVelocityWeight()) +
                (timeScore * config.getTimeAnomalyWeight()) +
                (merchantScore * config.getMerchantRiskWeight());

        // Calibrated Sigmoidal activation
        double z = (weightedSum * 4.5) - 1.8;
        double sigmoid = 1.0 / (1.0 + Math.exp(-z));
        double finalScore = Math.round(sigmoid * 1000.0) / 1000.0;

        return new ScoringBreakdown(finalScore, triggers);
    }
}
`
  },
  {
    filename: "Configuration.java",
    className: "Configuration",
    package: "com.neuralbank.fraud.engine",
    description: "Holds validated system hyperparameters including the fraud threshold and normalized feature weights.",
    code: `package com.neuralbank.fraud.engine;

/**
 * Encapsulates fraud detection threshold and feature weights with invariant validation.
 */
public class Configuration {
    private double fraudThreshold;
    private double amountAnomalyWeight;
    private double locationDiscrepancyWeight;
    private double velocityWeight;
    private double timeAnomalyWeight;
    private double merchantRiskWeight;

    public Configuration(
            double fraudThreshold,
            double amountAnomalyWeight,
            double locationDiscrepancyWeight,
            double velocityWeight,
            double timeAnomalyWeight,
            double merchantRiskWeight
    ) {
        if (fraudThreshold < 0.10 || fraudThreshold > 0.95) {
            throw new IllegalArgumentException("Fraud threshold must be between 0.10 and 0.95.");
        }
        validateWeights(amountAnomalyWeight, locationDiscrepancyWeight, velocityWeight, timeAnomalyWeight, merchantRiskWeight);
        this.fraudThreshold = fraudThreshold;
        this.amountAnomalyWeight = amountAnomalyWeight;
        this.locationDiscrepancyWeight = locationDiscrepancyWeight;
        this.velocityWeight = velocityWeight;
        this.timeAnomalyWeight = timeAnomalyWeight;
        this.merchantRiskWeight = merchantRiskWeight;
    }

    private void validateWeights(double a, double l, double v, double t, double m) {
        if (a < 0 || l < 0 || v < 0 || t < 0 || m < 0) {
            throw new IllegalArgumentException("Feature weights cannot be negative.");
        }
        double sum = a + l + v + t + m;
        if (Math.abs(sum - 1.0) > 0.05) {
            throw new IllegalArgumentException("Feature weights must sum to 1.0 (+/- 0.05). Provided sum: " + sum);
        }
    }

    public void updateWeights(double a, double l, double v, double t, double m) {
        validateWeights(a, l, v, t, m);
        this.amountAnomalyWeight = a;
        this.locationDiscrepancyWeight = l;
        this.velocityWeight = v;
        this.timeAnomalyWeight = t;
        this.merchantRiskWeight = m;
    }

    public double getFraudThreshold() { return fraudThreshold; }
    public void setFraudThreshold(double fraudThreshold) {
        if (fraudThreshold < 0.10 || fraudThreshold > 0.95) {
            throw new IllegalArgumentException("Fraud threshold must be between 0.10 and 0.95.");
        }
        this.fraudThreshold = fraudThreshold;
    }

    public double getAmountAnomalyWeight() { return amountAnomalyWeight; }
    public double getLocationDiscrepancyWeight() { return locationDiscrepancyWeight; }
    public double getVelocityWeight() { return velocityWeight; }
    public double getTimeAnomalyWeight() { return timeAnomalyWeight; }
    public double getMerchantRiskWeight() { return merchantRiskWeight; }
}
`
  },
  {
    filename: "DetectionReport.java",
    className: "DetectionReport",
    package: "com.neuralbank.fraud.engine",
    description: "Generates formatted compliance audit summaries of analyzed transactions, incidence rates, and flagged cases.",
    code: `package com.neuralbank.fraud.engine;

import com.neuralbank.fraud.model.FraudCase;
import java.time.LocalDateTime;
import java.time.format.DateTimeFormatter;
import java.util.List;

/**
 * Immutable audit report summarizing fraud detection telemetry and flagged cases.
 */
public class DetectionReport {
    private final String reportId;
    private final LocalDateTime generatedAt;
    private final int totalTransactionsAnalyzed;
    private final double averageRiskScore;
    private final List<FraudCase> flaggedCases;

    public DetectionReport(
            String reportId,
            int totalTransactionsAnalyzed,
            double averageRiskScore,
            List<FraudCase> flaggedCases
    ) {
        this.reportId = reportId;
        this.generatedAt = LocalDateTime.now();
        this.totalTransactionsAnalyzed = totalTransactionsAnalyzed;
        this.averageRiskScore = averageRiskScore;
        this.flaggedCases = List.copyOf(flaggedCases);
    }

    public String formatReport() {
        StringBuilder sb = new StringBuilder();
        double incidenceRate = totalTransactionsAnalyzed == 0
                ? 0.0
                : (flaggedCases.size() * 100.0) / totalTransactionsAnalyzed;

        sb.append("=========================================================================\\n");
        sb.append("                 NEURALBANK AI FRAUD DETECTION AUDIT REPORT              \\n");
        sb.append("=========================================================================\\n");
        sb.append(String.format("Report ID: %s | Generated: %s%n",
                reportId, generatedAt.format(DateTimeFormatter.ofPattern("yyyy-MM-dd HH:mm:ss"))));
        sb.append(String.format("Total Transactions Analyzed: %d%n", totalTransactionsAnalyzed));
        sb.append(String.format("Suspicious Incidents Flagged: %d%n", flaggedCases.size()));
        sb.append(String.format("Fraud Incidence Rate: %.2f%%%n", incidenceRate));
        sb.append(String.format("System Average Risk Score: %.4f%n", averageRiskScore));
        sb.append("-------------------------------------------------------------------------\\n");
        sb.append("DETECTED SUSPICIOUS CASES DETAIL:\\n");

        for (FraudCase fc : flaggedCases) {
            sb.append(String.format("  * Case ID: %s | Tx ID: %s | Amount: ₹%.2f | Risk Score: %.3f%n",
                    fc.getCaseId(),
                    fc.getTransaction().getTransactionId(),
                    fc.getTransaction().getAmount(),
                    fc.getRiskScore()));
            sb.append(String.format("    Status: %s | Location: %s | Time: %s%n",
                    fc.getStatus(),
                    fc.getTransaction().getLocation(),
                    fc.getTransaction().getTimestamp()));
            sb.append("    Triggers:\\n");
            for (String trigger : fc.getDetectedTriggers()) {
                sb.append("      - ").append(trigger).append("\\n");
            }
        }
        sb.append("=========================================================================");
        return sb.toString();
    }
}
`
  },
  {
    filename: "FraudDetectionSystem.java",
    className: "FraudDetectionSystem",
    package: "com.neuralbank.fraud.engine",
    description: "Central orchestrator linking RuleEngine, DetectionModel, Configuration, and FraudCase management.",
    code: `package com.neuralbank.fraud.engine;

import com.neuralbank.fraud.model.FraudCase;
import com.neuralbank.fraud.model.Transaction;
import java.util.ArrayList;
import java.util.Collections;
import java.util.List;
import java.util.Objects;

/**
 * Central orchestrator of the NeuralBank AI-Powered Fraud Detection System.
 */
public class FraudDetectionSystem {
    private Configuration configuration;
    private final RuleEngine ruleEngine;
    private final DetectionModel detectionModel;
    private final List<FraudCase> detectedCases;
    private final List<Transaction> evaluatedTransactions;
    private double cumulativeRiskScore = 0.0;
    private int caseSequence = 1003;

    public static class EvaluationResult {
        private final Transaction transaction;
        private final String status;
        private final double riskScore;
        private final double threshold;
        private final String message;
        private final FraudCase generatedCase;

        public EvaluationResult(
                Transaction transaction,
                String status,
                double riskScore,
                double threshold,
                String message,
                FraudCase generatedCase
        ) {
            this.transaction = transaction;
            this.status = status;
            this.riskScore = riskScore;
            this.threshold = threshold;
            this.message = message;
            this.generatedCase = generatedCase;
        }

        public Transaction getTransaction() { return transaction; }
        public String getStatus() { return status; }
        public double getRiskScore() { return riskScore; }
        public double getThreshold() { return threshold; }
        public String getMessage() { return message; }
        public FraudCase getGeneratedCase() { return generatedCase; }
    }

    public FraudDetectionSystem(Configuration configuration, DetectionModel detectionModel) {
        this.configuration = Objects.requireNonNull(configuration);
        this.detectionModel = Objects.requireNonNull(detectionModel);
        this.ruleEngine = new RuleEngine();
        this.detectedCases = new ArrayList<>();
        this.evaluatedTransactions = new ArrayList<>();
    }

    public EvaluationResult evaluateTransaction(Transaction tx) {
        Objects.requireNonNull(tx, "Transaction cannot be null.");
        RuleEngine.ScoringBreakdown breakdown = ruleEngine.evaluate(tx, configuration);
        double score = breakdown.getFinalRiskScore();
        double threshold = configuration.getFraudThreshold();

        evaluatedTransactions.add(tx);
        cumulativeRiskScore += score;

        if (score > threshold) {
            caseSequence++;
            String caseId = "FC-" + caseSequence;
            FraudCase fraudCase = new FraudCase(caseId, tx, score, threshold, breakdown.getTriggeredReasons());
            detectedCases.add(fraudCase);
            String alertMsg = String.format(
                    "ALERT: Transaction %s flagged as SUSPICIOUS! Risk Score (%.3f) exceeds threshold (%.2f).",
                    tx.getTransactionId(), score, threshold
            );
            return new EvaluationResult(tx, "SUSPICIOUS", score, threshold, alertMsg, fraudCase);
        } else {
            String okMsg = String.format(
                    "APPROVED: Transaction %s cleared as NORMAL. Risk Score: %.3f (Threshold: %.2f).",
                    tx.getTransactionId(), score, threshold
            );
            return new EvaluationResult(tx, "NORMAL", score, threshold, okMsg, null);
        }
    }

    public void updateConfiguration(Configuration newConfig) {
        this.configuration = Objects.requireNonNull(newConfig);
    }

    public DetectionReport generateReport() {
        double avgRisk = evaluatedTransactions.isEmpty()
                ? 0.0
                : cumulativeRiskScore / evaluatedTransactions.size();
        return new DetectionReport(
                "REP-" + (System.currentTimeMillis() / 1000),
                evaluatedTransactions.size(),
                avgRisk,
                detectedCases
        );
    }

    public Configuration getConfiguration() { return configuration; }
    public DetectionModel getDetectionModel() { return detectionModel; }
    public List<FraudCase> getDetectedCases() { return Collections.unmodifiableList(detectedCases); }
}
`
  },
  {
    filename: "Main.java",
    className: "Main",
    package: "com.neuralbank.fraud",
    description: "Executable Java entry point demonstrating normal and suspicious transactions, admin tuning, and report generation.",
    code: `package com.neuralbank.fraud;

import com.neuralbank.fraud.engine.*;
import com.neuralbank.fraud.model.*;
import java.time.LocalDateTime;

/**
 * Main driver class demonstrating end-to-end execution of the NeuralBank
 * AI-Powered Fraud Detection System.
 */
public class Main {
    public static void main(String[] args) {
        System.out.println("=========================================================================");
        System.out.println("   NEURALBANK 🧠 AI-POWERED FRAUD DETECTION SYSTEM (JAVA v21 RUNTIME)   ");
        System.out.println("=========================================================================\\n");

        // 1. Initialize Default Configuration & Detection Model
        Configuration defaultConfig = new Configuration(0.65, 0.30, 0.25, 0.20, 0.15, 0.10);
        DetectionModel model = new DetectionModel("NeuralBank-PerceptronRiskNet", "v2.4.1-calibrated");
        FraudDetectionSystem system = new FraudDetectionSystem(defaultConfig, model);

        User alice = new User("USR-4092", "Alice Chen", "alice.chen@example.com", 45.00, "San Francisco, CA");
        Admin riskAdmin = new Admin("ADM-01", "Marcus Vance", "Lead Risk Officer");

        System.out.println("[BOOTSTRAP] System initialized with model: " + model.getModelName() + " (" + model.getModelVersion() + ")");
        System.out.println("[BOOTSTRAP] Default Fraud Threshold: " + defaultConfig.getFraudThreshold());
        System.out.println("[BOOTSTRAP] Active User: " + alice.getName() + " (" + alice.getUserId() + ") | 30-Day Avg Spend: ₹" + String.format("%.2f", alice.getHistoricalAvgSpend()) + "\\n");

        // 2. Scenario 1: Normal Transaction
        System.out.println(">>> SCENARIO 1: PROCESSING NORMAL TRANSACTION");
        Transaction normalTx = new Transaction(
                "TX-88219",
                alice.getUserId(),
                42.50,
                LocalDateTime.of(2026, 9, 28, 12, 30),
                "San Francisco, CA",
                "MOBILE_APP",
                "GROCERY_ESSENTIALS",
                1,
                alice.getHistoricalAvgSpend()
        );
        System.out.println("Transaction Input: " + normalTx);
        FraudDetectionSystem.EvaluationResult res1 = alice.submitTransaction(system, normalTx);
        System.out.println("Evaluation Outcome:");
        System.out.println("  * Transaction Status : " + res1.getStatus());
        System.out.println("  * Computed Risk Score: " + String.format("%.3f", res1.getRiskScore()));
        System.out.println("  * Detection Threshold: " + String.format("%.2f", res1.getThreshold()));
        System.out.println("  * System Message     : " + res1.getMessage() + "\\n");

        // 3. Scenario 2: Suspicious High-Risk Transaction
        System.out.println(">>> SCENARIO 2: PROCESSING SUSPICIOUS TRANSACTION");
        Transaction suspiciousTx = new Transaction(
                "TX-99401",
                alice.getUserId(),
                4950.00,
                LocalDateTime.of(2026, 9, 28, 3, 42),
                "Lagos, Nigeria (Foreign Proxy)",
                "WEB_PORTAL",
                "CRYPTO_EXCHANGE",
                6,
                alice.getHistoricalAvgSpend()
        );
        System.out.println("Transaction Input: " + suspiciousTx);
        FraudDetectionSystem.EvaluationResult res2 = alice.submitTransaction(system, suspiciousTx);
        System.out.println("Evaluation Outcome:");
        System.out.println("  * Transaction Status : " + res2.getStatus());
        System.out.println("  * Computed Risk Score: " + String.format("%.3f", res2.getRiskScore()));
        System.out.println("  * Detection Threshold: " + String.format("%.2f", res2.getThreshold()));
        System.out.println("  * Fraud Alert Banner : " + res2.getMessage());
        if (res2.getGeneratedCase() != null) {
            System.out.println("  * Generated Case ID  : " + res2.getGeneratedCase().getCaseId());
            System.out.println("  * Forensic Triggers  :");
            for (String reason : res2.getGeneratedCase().getDetectedTriggers()) {
                System.out.println("      - " + reason);
            }
        }
        System.out.println();

        // 4. Scenario 3: Admin Updates Threshold Configuration
        System.out.println(">>> SCENARIO 3: ADMIN SYSTEM CONFIGURATION UPDATE");
        Configuration updatedConfig = new Configuration(0.70, 0.30, 0.25, 0.20, 0.15, 0.10);
        System.out.println(riskAdmin.configureSystem(system, updatedConfig) + "\\n");

        // 5. Scenario 4: Algorithm Refinement via Feedback
        System.out.println(">>> SCENARIO 4: ALGORITHM REFINEMENT VIA PERFORMANCE FEEDBACK");
        System.out.println(model.refineWeights(system.getConfiguration(), 0.05, 10) + "\\n");

        // 6. Scenario 5: Generate Audit Report
        System.out.println(">>> SCENARIO 5: GENERATE AUDIT DETECTION REPORT");
        DetectionReport report = riskAdmin.generateDetectionReport(system);
        System.out.println(report.formatReport());
    }
}
`
  }
];

export const CLASS_EXPLANATIONS: { className: string; role: string; principles: string[] }[] = [
  {
    className: "Transaction.java",
    role: "Immutable data transfer & domain object representing a single financial event.",
    principles: [
      "Declared final with exclusively private final fields to guarantee thread-safety and immutability.",
      "Defensive validation: strictly enforces non-empty IDs, positive transaction amounts (> 0), valid timestamps, and non-negative velocity counts.",
      "Encapsulates all 5 risk dimensions: Amount, Location, Velocity, Timestamp, and Merchant Category."
    ]
  },
  {
    className: "RuleEngine.java",
    role: "Stateless mathematical scoring engine that normalizes multi-dimensional transaction features into [0.0, 1.0].",
    principles: [
      "Separation of Concerns: decouples mathematical feature extraction from case storage and user management.",
      "Implements a calibrated Sigmoidal Logistic Perceptron: RiskScore = 1 / (1 + e^-(4.5 * WeightedSum - 1.8)).",
      "Generates human-readable forensic explanations for every triggered anomaly rule."
    ]
  },
  {
    className: "Configuration.java",
    role: "Encapsulates tunable system hyperparameters and enforces mathematical invariants.",
    principles: [
      "Validates that the fraud threshold stays within safe operational bounds [0.10, 0.95].",
      "Enforces weight normalization invariant: all 5 feature weights must be non-negative and sum to 1.00 (±0.05).",
      "Prevents invalid administrative configurations from corrupting the scoring pipeline."
    ]
  },
  {
    className: "FraudDetectionSystem.java",
    role: "Central facade and orchestrator coordinating RuleEngine, DetectionModel, Configuration, and FraudCase persistence.",
    principles: [
      "Facade Pattern: exposes a clean evaluateTransaction(Transaction) contract to callers.",
      "Automatically instantiates and archives a FraudCase whenever RiskScore > FraudThreshold.",
      "Maintains unmodifiable views of historical cases for audit reporting."
    ]
  },
  {
    className: "User.java & Admin.java",
    role: "Actor domain models representing standard banking customers and privileged risk officers.",
    principles: [
      "Role-Based Responsibility: User submits transactions and tracks personal history; Admin updates Configuration and generates DetectionReports.",
      "Encapsulation: exposes unmodifiable collections and validated state transitions."
    ]
  },
  {
    className: "FraudCase.java & DetectionReport.java",
    role: "Forensic incident tracking and compliance reporting models.",
    principles: [
      "FraudCase links the triggering Transaction with its exact risk score, threshold at evaluation time, and forensic triggers.",
      "DetectionReport aggregates total volume, fraud incidence percentage, average risk score, and detailed case logs."
    ]
  }
];
