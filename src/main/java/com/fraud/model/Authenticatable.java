package com.fraud.model;

/**
 * Contract for any domain entity that can be authenticated within the system.
 * 
 * Demonstrates:
 * - Interface abstraction
 * - Polymorphic authentication checking across different user types
 */
public interface Authenticatable {

    /**
     * Authenticates the entity using the provided plain-text password.
     * Implementations compare with salted/hashed credentials.
     * 
     * @param password the plain-text candidate password
     * @return true if credentials match and account is active, false otherwise
     */
    boolean authenticate(String password);

    /**
     * Checks if the entity's account is active and permitted to authenticate.
     * 
     * @return true if active, false if suspended or locked
     */
    boolean isActive();
}
