package com.fraud.strategy;

import com.fraud.collection.GeoIpTracker;
import com.fraud.collection.SlidingWindowTransactionTracker;
import com.fraud.collection.TransactionHistoryLedger;
import com.fraud.model.Customer;
import com.fraud.model.FraudRule;
import com.fraud.model.RiskAnalysis;
import com.fraud.model.RiskLevel;
import com.fraud.model.Transaction;
import com.fraud.model.TransactionStatus;

import java.math.BigDecimal;
import java.sql.Timestamp;
import java.time.LocalDateTime;
import java.time.ZoneId;
import java.util.ArrayList;
import java.util.Collections;
import java.util.HashMap;
import java.util.LinkedHashSet;
import java.util.List;
import java.util.Map;
import java.util.Objects;
import java.util.Set;

/**
 * Real, multi-signal, rule-based Fraud Detection Engine.
 *
 * Demonstrates:
 * - Strategy Pattern Implementation (implements {@link FraudDetectionStrategy})
 * - Weighted risk calculation based on 6 independent fraud signals:
 *   1. HIGH_AMOUNT: Flags single transactions exceeding configured threshold.
 *   2. RAPID_TRANSACTIONS: Evaluates recent transactions within a sliding time window.
 *   3. UNUSUAL_LOCATION: Detects location deviation from customer historical baseline.
 *   4. ODD_HOUR: Evaluates transactions during high-risk nocturnal hours (01:00 to 05:00).
 *   5. AMOUNT_DEVIATION: Flags transaction amounts surging beyond 300% of historical average.
 *   6. REPEATED_FAILURES: Detects repeated failed/rejected transaction attempts in history.
 * - Respects active/inactive configuration and custom threshold/weight parameters.
 * - Thread-safe and stateless: does not store mutable state across evaluations.
 * - Strict separation of concerns: ZERO SQL/JDBC code within the engine.
 */
public class FraudDetectionEngine implements FraudDetectionStrategy {

    public static final String RULE_HIGH_AMOUNT = "HIGH_AMOUNT";
    public static final String RULE_RAPID_TRANSACTIONS = "RAPID_TRANSACTIONS";
    public static final String RULE_UNUSUAL_LOCATION = "UNUSUAL_LOCATION";
    public static final String RULE_ODD_HOUR = "ODD_HOUR";
    public static final String RULE_AMOUNT_DEVIATION = "AMOUNT_DEVIATION";
    public static final String RULE_REPEATED_FAILURES = "REPEATED_FAILURES";

    // Map of ruleCode -> FraudRule configuration
    private final Map<String, FraudRule> ruleConfigMap;

    public FraudDetectionEngine() {
        this(createDefaultRules());
    }

    public FraudDetectionEngine(List<FraudRule> rules) {
        this.ruleConfigMap = new HashMap<>();
        if (rules != null) {
            for (FraudRule rule : rules) {
                if (rule != null && rule.getRuleCode() != null) {
                    ruleConfigMap.put(rule.getRuleCode().trim().toUpperCase(), rule);
                }
            }
        }
    }

    /**
     * Factory providing baseline fallback rules matching schema.sql definitions.
     */
    public static List<FraudRule> createDefaultRules() {
        List<FraudRule> defaults = new ArrayList<>();
        defaults.add(new FraudRule(1, RULE_HIGH_AMOUNT, "High Transaction Amount", "Flags single transactions exceeding absolute threshold (₹2,00,000)", 30, 200000.0, true, null));
        defaults.add(new FraudRule(2, RULE_RAPID_TRANSACTIONS, "Rapid Velocity Spike", "Flags transactions exceeding velocity within sliding window", 25, 3.0, true, null));
        defaults.add(new FraudRule(3, RULE_UNUSUAL_LOCATION, "Geographic Location Mismatch", "Flags transactions originating outside typical Indian regions", 20, 1.0, true, null));
        defaults.add(new FraudRule(4, RULE_ODD_HOUR, "Unusual Off-Hours Transaction", "Flags transactions executed during nocturnal hours (01:00-05:00)", 15, 1.0, true, null));
        defaults.add(new FraudRule(5, RULE_AMOUNT_DEVIATION, "Surge Above Customer Average", "Flags transactions that exceed 300% of historical average", 25, 3.0, true, null));
        defaults.add(new FraudRule(6, RULE_REPEATED_FAILURES, "Multiple Prior Failed Attempts", "Flags transactions preceded by repeated rejected attempts", 20, 2.0, true, null));
        return defaults;
    }

    @Override
    public RiskAnalysis analyze(Transaction transaction,
                                Customer customer,
                                TransactionHistoryLedger ledger,
                                SlidingWindowTransactionTracker slidingTracker,
                                GeoIpTracker geoIpTracker) {

        if (transaction == null) {
            throw new IllegalArgumentException("Transaction cannot be null for fraud analysis");
        }

        int totalScore = 0;
        Set<String> triggeredRules = new LinkedHashSet<>();
        List<String> reasons = new ArrayList<>();

        // 1. Evaluate Rule: HIGH_AMOUNT
        FraudRule highAmountRule = getActiveRule(RULE_HIGH_AMOUNT);
        if (highAmountRule != null && transaction.getAmount() != null) {
            double threshold = highAmountRule.getThresholdValue();
            if (transaction.getAmount().doubleValue() > threshold) {
                totalScore += highAmountRule.getWeight();
                triggeredRules.add(RULE_HIGH_AMOUNT);
                reasons.add(String.format("Transaction amount (₹%.2f) exceeds threshold limit of ₹%.2f",
                        transaction.getAmount().doubleValue(), threshold));
            }
        }

        // 2. Evaluate Rule: RAPID_TRANSACTIONS (Sliding-window velocity)
        FraudRule rapidRule = getActiveRule(RULE_RAPID_TRANSACTIONS);
        if (rapidRule != null && slidingTracker != null && transaction.getUserId() != null) {
            long now = transaction.getCreatedAt() != null ? transaction.getCreatedAt().getTime() : System.currentTimeMillis();
            int recentCount = slidingTracker.getTransactionCountInWindow(transaction.getUserId(), now);
            double velocityThreshold = rapidRule.getThresholdValue();
            if (recentCount >= velocityThreshold) {
                totalScore += rapidRule.getWeight();
                triggeredRules.add(RULE_RAPID_TRANSACTIONS);
                reasons.add(String.format("High transaction velocity detected: %d transactions in the sliding window (threshold: %.0f)",
                        recentCount, velocityThreshold));
            }
        }

        // 3. Evaluate Rule: UNUSUAL_LOCATION
        FraudRule locationRule = getActiveRule(RULE_UNUSUAL_LOCATION);
        if (locationRule != null && geoIpTracker != null && transaction.getUserId() != null && transaction.getLocation() != null) {
            if (geoIpTracker.isUnusualLocation(transaction.getUserId(), transaction.getLocation())) {
                totalScore += locationRule.getWeight();
                triggeredRules.add(RULE_UNUSUAL_LOCATION);
                reasons.add(String.format("Transaction location '%s' deviates from customer historical baseline",
                        transaction.getLocation()));
            }
        }

        // 4. Evaluate Rule: ODD_HOUR (Nocturnal hours check: 01:00 to 04:59)
        FraudRule oddHourRule = getActiveRule(RULE_ODD_HOUR);
        if (oddHourRule != null) {
            Timestamp ts = transaction.getCreatedAt() != null ? transaction.getCreatedAt() : new Timestamp(System.currentTimeMillis());
            LocalDateTime ldt = ts.toInstant().atZone(ZoneId.systemDefault()).toLocalDateTime();
            int hour = ldt.getHour();
            // High risk nocturnal window: between 1 AM and 5 AM
            if (hour >= 1 && hour < 5) {
                totalScore += oddHourRule.getWeight();
                triggeredRules.add(RULE_ODD_HOUR);
                reasons.add(String.format("Transaction initiated at off-hours nocturnal window (%02d:%02d)",
                        hour, ldt.getMinute()));
            }
        }

        // 5. Evaluate Rule: AMOUNT_DEVIATION (Surge above historical average)
        FraudRule deviationRule = getActiveRule(RULE_AMOUNT_DEVIATION);
        if (deviationRule != null && ledger != null && transaction.getUserId() != null && transaction.getAmount() != null) {
            List<Transaction> history = ledger.getHistoryChronological(transaction.getUserId());
            // Need at least 2 historical transactions to establish a meaningful average
            if (history != null && history.size() >= 2) {
                double avg = ledger.calculateAverageTransactionAmount(transaction.getUserId());
                if (avg > 0) {
                    double multiplierThreshold = deviationRule.getThresholdValue(); // e.g. 3.0 = 300%
                    double ratio = transaction.getAmount().doubleValue() / avg;
                    if (ratio >= multiplierThreshold) {
                        totalScore += deviationRule.getWeight();
                        triggeredRules.add(RULE_AMOUNT_DEVIATION);
                        reasons.add(String.format("Transaction amount (₹%.2f) is %.1fx customer average (₹%.2f)",
                                transaction.getAmount().doubleValue(), ratio, avg));
                    }
                }
            }
        }

        // 6. Evaluate Rule: REPEATED_FAILURES
        FraudRule failuresRule = getActiveRule(RULE_REPEATED_FAILURES);
        if (failuresRule != null && ledger != null && transaction.getUserId() != null) {
            List<Transaction> history = ledger.getHistoryChronological(transaction.getUserId());
            if (history != null && !history.isEmpty()) {
                int failureCount = 0;
                // Count recent failed/rejected transactions
                for (Transaction past : history) {
                    if (past.getStatus() == TransactionStatus.FAILED) {
                        failureCount++;
                    }
                }
                double failureThreshold = failuresRule.getThresholdValue();
                if (failureCount >= failureThreshold) {
                    totalScore += failuresRule.getWeight();
                    triggeredRules.add(RULE_REPEATED_FAILURES);
                    reasons.add(String.format("Multiple prior failed transactions detected: %d failures (threshold: %.0f)",
                            failureCount, failureThreshold));
                }
            }
        }

        // Clamp score between 0 and 100
        int clampedScore = Math.min(100, Math.max(0, totalScore));
        RiskLevel riskLevel = RiskLevel.fromScore(clampedScore);

        return new RiskAnalysis(clampedScore, riskLevel, triggeredRules, reasons);
    }

    /**
     * Retrieves an active FraudRule if present and enabled in configuration.
     */
    public FraudRule getActiveRule(String ruleCode) {
        if (ruleCode == null) return null;
        FraudRule rule = ruleConfigMap.get(ruleCode.trim().toUpperCase());
        return (rule != null && rule.isActive()) ? rule : null;
    }

    public Map<String, FraudRule> getRuleConfigMap() {
        return Collections.unmodifiableMap(ruleConfigMap);
    }
}
