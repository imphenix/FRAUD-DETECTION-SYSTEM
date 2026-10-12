package com.fraud.model;

/**
 * Types of financial transactions supported by the platform.
 */
public enum TransactionType {
    PURCHASE,
    TRANSFER,
    WITHDRAWAL,
    DEPOSIT,
    PAYMENT;

    /**
     * Case-insensitive safe factory method.
     */
    public static TransactionType fromString(String value) {
        if (value == null) {
            return TRANSFER;
        }
        try {
            return TransactionType.valueOf(value.trim().toUpperCase());
        } catch (IllegalArgumentException e) {
            return TRANSFER;
        }
    }
}
