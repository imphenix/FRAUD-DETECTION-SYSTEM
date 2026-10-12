package com.fraud.collection;

import com.fraud.model.RiskLevel;
import com.fraud.model.Transaction;
import com.fraud.model.TransactionStatus;

import java.math.BigDecimal;
import java.util.Collections;
import java.util.EnumMap;
import java.util.Map;

/**
 * Analytical aggregator for calculating real-time risk statistics and volumetric metrics.
 *
 * Demonstrates:
 * - Use of java.util.EnumMap for efficient key-indexing of Enum types
 * - Thread-safe statistical operations
 * - Financial aggregation using BigDecimal
 */
public class FraudStatistics {

    private final Map<RiskLevel, Integer> riskDistribution;
    private final Map<TransactionStatus, Integer> statusDistribution;
    private int totalTransactions;
    private int flaggedCount;
    private int blockedCount;
    private BigDecimal totalAmountProcessed;

    public FraudStatistics() {
        this.riskDistribution = new EnumMap<>(RiskLevel.class);
        this.statusDistribution = new EnumMap<>(TransactionStatus.class);

        // Pre-initialize enum keys to 0
        for (RiskLevel level : RiskLevel.values()) {
            riskDistribution.put(level, 0);
        }
        for (TransactionStatus status : TransactionStatus.values()) {
            statusDistribution.put(status, 0);
        }

        this.totalTransactions = 0;
        this.flaggedCount = 0;
        this.blockedCount = 0;
        this.totalAmountProcessed = BigDecimal.ZERO;
    }

    /**
     * Records a transaction into aggregate statistics.
     */
    public synchronized void recordTransaction(Transaction tx) {
        if (tx == null) {
            return;
        }

        totalTransactions++;

        // Risk Level mapping
        RiskLevel level = tx.getRiskLevel() != null ? tx.getRiskLevel() : RiskLevel.LOW;
        riskDistribution.put(level, riskDistribution.getOrDefault(level, 0) + 1);

        // Status mapping
        TransactionStatus status = tx.getStatus() != null ? tx.getStatus() : TransactionStatus.PENDING;
        statusDistribution.put(status, statusDistribution.getOrDefault(status, 0) + 1);

        if (status == TransactionStatus.FLAGGED) {
            flaggedCount++;
        } else if (status == TransactionStatus.BLOCKED) {
            blockedCount++;
        }

        if (tx.getAmount() != null) {
            totalAmountProcessed = totalAmountProcessed.add(tx.getAmount());
        }
    }

    public synchronized Map<RiskLevel, Integer> getRiskDistribution() {
        return Collections.unmodifiableMap(new EnumMap<>(riskDistribution));
    }

    public synchronized Map<TransactionStatus, Integer> getStatusDistribution() {
        return Collections.unmodifiableMap(new EnumMap<>(statusDistribution));
    }

    public synchronized int getCountByRisk(RiskLevel level) {
        return riskDistribution.getOrDefault(level, 0);
    }

    public synchronized int getCountByStatus(TransactionStatus status) {
        return statusDistribution.getOrDefault(status, 0);
    }

    public synchronized int getTotalTransactions() {
        return totalTransactions;
    }

    public synchronized int getFlaggedCount() {
        return flaggedCount;
    }

    public synchronized int getBlockedCount() {
        return blockedCount;
    }

    public synchronized BigDecimal getTotalAmountProcessed() {
        return totalAmountProcessed;
    }

    /**
     * Calculates fraud rate percentage: (flagged + blocked) / total * 100.
     */
    public synchronized double getFraudDetectionRatePercentage() {
        if (totalTransactions == 0) {
            return 0.0;
        }
        return ((double) (flaggedCount + blockedCount) / totalTransactions) * 100.0;
    }

    public synchronized void reset() {
        for (RiskLevel level : RiskLevel.values()) {
            riskDistribution.put(level, 0);
        }
        for (TransactionStatus status : TransactionStatus.values()) {
            statusDistribution.put(status, 0);
        }
        totalTransactions = 0;
        flaggedCount = 0;
        blockedCount = 0;
        totalAmountProcessed = BigDecimal.ZERO;
    }
}
