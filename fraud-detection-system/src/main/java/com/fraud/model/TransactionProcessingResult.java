package com.fraud.model;

import java.util.Objects;

/**
 * Immutable Value Object representing the outcome of concurrent transaction processing.
 *
 * Demonstrates:
 * - Immutability (all fields final, no setters)
 * - Safe concurrent result transmission across threads
 * - Diagnostic error encapsulation
 */
public final class TransactionProcessingResult {

    private final Long transactionId;
    private final String referenceId;
    private final boolean success;
    private final TransactionStatus finalStatus;
    private final RiskAnalysis riskAnalysis;
    private final String errorMessage;
    private final long processingTimeMs;

    private TransactionProcessingResult(Long transactionId, String referenceId, boolean success,
                                        TransactionStatus finalStatus, RiskAnalysis riskAnalysis,
                                        String errorMessage, long processingTimeMs) {
        this.transactionId = transactionId;
        this.referenceId = referenceId;
        this.success = success;
        this.finalStatus = finalStatus;
        this.riskAnalysis = riskAnalysis;
        this.errorMessage = errorMessage;
        this.processingTimeMs = processingTimeMs;
    }

    public static TransactionProcessingResult success(Long transactionId, String referenceId,
                                                      TransactionStatus finalStatus, RiskAnalysis riskAnalysis,
                                                      long processingTimeMs) {
        return new TransactionProcessingResult(transactionId, referenceId, true, finalStatus,
                riskAnalysis, null, processingTimeMs);
    }

    public static TransactionProcessingResult failure(String referenceId, String errorMessage,
                                                      long processingTimeMs) {
        return new TransactionProcessingResult(null, referenceId, false, TransactionStatus.FAILED,
                null, errorMessage, processingTimeMs);
    }

    public Long getTransactionId() {
        return transactionId;
    }

    public String getReferenceId() {
        return referenceId;
    }

    public boolean isSuccess() {
        return success;
    }

    public TransactionStatus getFinalStatus() {
        return finalStatus;
    }

    public RiskAnalysis getRiskAnalysis() {
        return riskAnalysis;
    }

    public String getErrorMessage() {
        return errorMessage;
    }

    public long getProcessingTimeMs() {
        return processingTimeMs;
    }

    @Override
    public boolean equals(Object o) {
        if (this == o) return true;
        if (!(o instanceof TransactionProcessingResult)) return false;
        TransactionProcessingResult that = (TransactionProcessingResult) o;
        return success == that.success &&
                processingTimeMs == that.processingTimeMs &&
                Objects.equals(transactionId, that.transactionId) &&
                Objects.equals(referenceId, that.referenceId) &&
                finalStatus == that.finalStatus &&
                Objects.equals(riskAnalysis, that.riskAnalysis) &&
                Objects.equals(errorMessage, that.errorMessage);
    }

    @Override
    public int hashCode() {
        return Objects.hash(transactionId, referenceId, success, finalStatus, riskAnalysis, errorMessage, processingTimeMs);
    }

    @Override
    public String toString() {
        return "TransactionProcessingResult{" +
                "transactionId=" + transactionId +
                ", referenceId='" + referenceId + '\'' +
                ", success=" + success +
                ", finalStatus=" + finalStatus +
                ", processingTimeMs=" + processingTimeMs +
                (errorMessage != null ? ", error='" + errorMessage + '\'' : "") +
                '}';
    }
}
