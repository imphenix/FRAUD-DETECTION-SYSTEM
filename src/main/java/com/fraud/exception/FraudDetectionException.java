package com.fraud.exception;

/**
 * Custom checked exception thrown during fraud detection rule evaluation,
 * thread pool execution errors, or invalid risk scoring states.
 */
public class FraudDetectionException extends Exception {

    private static final long serialVersionUID = 1L;

    public FraudDetectionException(String message) {
        super(message);
    }

    public FraudDetectionException(String message, Throwable cause) {
        super(message, cause);
    }
}
