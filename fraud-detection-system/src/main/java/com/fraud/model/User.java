package com.fraud.model;

import com.fraud.util.HashUtil;

import java.sql.Timestamp;
import java.util.Objects;

/**
 * Abstract base class for all user entities in the system.
 * 
 * Demonstrates:
 * - OOP Abstraction (cannot be directly instantiated)
 * - Encapsulation (private fields with controlled accessors)
 * - Implementation of Authenticatable interface
 * - Template method pattern via abstract getDashboardGreeting()
 * - Secure credential hashing (never stores plaintext passwords)
 */
public abstract class User implements Authenticatable {

    private Long id;
    private String username;
    private String passwordHash;
    private String fullName;
    private String email;
    private String phone;
    private Role role;
    private boolean active;
    private Timestamp createdAt;
    private Timestamp updatedAt;

    // Default constructor
    protected User() {
        this.active = true;
        this.createdAt = new Timestamp(System.currentTimeMillis());
        this.updatedAt = new Timestamp(System.currentTimeMillis());
    }

    // Parameterized constructor
    protected User(Long id, String username, String passwordHash, String fullName, String email, String phone, Role role) {
        this.id = id;
        this.username = username;
        this.passwordHash = passwordHash;
        this.fullName = fullName;
        this.email = email;
        this.phone = phone;
        this.role = role;
        this.active = true;
        this.createdAt = new Timestamp(System.currentTimeMillis());
        this.updatedAt = new Timestamp(System.currentTimeMillis());
    }

    /**
     * Implements Authenticatable: verifies candidate password against SHA-256 hash.
     */
    @Override
    public boolean authenticate(String candidatePassword) {
        if (!this.active || candidatePassword == null || this.passwordHash == null) {
            return false;
        }
        String candidateHash = HashUtil.sha256(candidatePassword);
        return this.passwordHash.equalsIgnoreCase(candidateHash);
    }

    @Override
    public boolean isActive() {
        return active;
    }

    public void setActive(boolean active) {
        this.active = active;
        this.updatedAt = new Timestamp(System.currentTimeMillis());
    }

    /**
     * Polymorphic method overridden by subclasses to provide specialized greetings.
     */
    public abstract String getDashboardGreeting();

    /**
     * Polymorphic method to check permissions.
     */
    public abstract boolean hasAdminPrivileges();

    // Getters and Setters
    public Long getId() {
        return id;
    }

    public void setId(Long id) {
        this.id = id;
    }

    public String getUsername() {
        return username;
    }

    public void setUsername(String username) {
        this.username = username;
    }

    public String getPasswordHash() {
        return passwordHash;
    }

    public void setPasswordHash(String passwordHash) {
        this.passwordHash = passwordHash;
    }

    /**
     * Helper to set and immediately hash a plaintext password.
     */
    public void setPlainPassword(String plainPassword) {
        if (plainPassword != null) {
            this.passwordHash = HashUtil.sha256(plainPassword);
        }
    }

    public String getFullName() {
        return fullName;
    }

    public void setFullName(String fullName) {
        this.fullName = fullName;
    }

    public String getEmail() {
        return email;
    }

    public void setEmail(String email) {
        this.email = email;
    }

    public String getPhone() {
        return phone;
    }

    public void setPhone(String phone) {
        this.phone = phone;
    }

    public Role getRole() {
        return role;
    }

    protected void setRole(Role role) {
        this.role = role;
    }

    public Timestamp getCreatedAt() {
        return createdAt;
    }

    public void setCreatedAt(Timestamp createdAt) {
        this.createdAt = createdAt;
    }

    public Timestamp getUpdatedAt() {
        return updatedAt;
    }

    public void setUpdatedAt(Timestamp updatedAt) {
        this.updatedAt = updatedAt;
    }

    @Override
    public boolean equals(Object o) {
        if (this == o) return true;
        if (!(o instanceof User)) return false;
        User user = (User) o;
        return Objects.equals(id, user.id) || Objects.equals(username, user.username);
    }

    @Override
    public int hashCode() {
        return Objects.hash(id, username);
    }

    @Override
    public String toString() {
        return "User{" +
                "id=" + id +
                ", username='" + username + '\'' +
                ", fullName='" + fullName + '\'' +
                ", email='" + email + '\'' +
                ", role=" + role +
                ", active=" + active +
                '}';
    }
}
