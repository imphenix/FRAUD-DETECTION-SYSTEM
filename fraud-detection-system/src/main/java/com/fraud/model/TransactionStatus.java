package com.fraud.model;

/**
 * Processing and compliance status of a financial transaction.
 */
public enum TransactionStatus {
    PENDING,
    APPROVED,
    FLAGGED,
    BLOCKED,
    FAILED;

    public static TransactionStatus fromString(String value) {
        if (value == null) {
            return PENDING;
        }
        String clean = value.trim().toUpperCase();
        if ("REJECTED".equals(clean)) {
            return BLOCKED;
        }
        try {
            return TransactionStatus.valueOf(clean);
        } catch (IllegalArgumentException e) {
            return PENDING;
        }
    }
}
