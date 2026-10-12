package com.fraud.exception;

/**
 * Custom checked exception thrown for invalid credentials, expired sessions,
 * or unauthorized role access attempts.
 */
public class AuthenticationException extends Exception {

    private static final long serialVersionUID = 1L;

    public AuthenticationException(String message) {
        super(message);
    }

    public AuthenticationException(String message, Throwable cause) {
        super(message, cause);
    }
}
