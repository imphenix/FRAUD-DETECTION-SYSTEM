package com.fraud.model;

import java.math.BigDecimal;

/**
 * Represents a Banking Customer or Account Holder.
 * 
 * Demonstrates:
 * - OOP Inheritance (extends User)
 * - Method overriding (polymorphism)
 * - Financial encapsulation (balance, account number, risk profile)
 */
public class Customer extends User {

    private String accountNumber;
    private BigDecimal balance;
    private RiskLevel riskProfile; // Historical customer baseline profile

    public Customer() {
        super();
        setRole(Role.CUSTOMER);
        this.balance = BigDecimal.ZERO;
        this.riskProfile = RiskLevel.LOW;
    }

    public Customer(Long id, String username, String passwordHash, String fullName, String email, String phone, String accountNumber, BigDecimal balance) {
        super(id, username, passwordHash, fullName, email, phone, Role.CUSTOMER);
        this.accountNumber = accountNumber;
        this.balance = balance != null ? balance : BigDecimal.ZERO;
        this.riskProfile = RiskLevel.LOW;
    }

    public Customer(Long id, String username, String passwordHash, String fullName, String email, String phone, String accountNumber, BigDecimal balance, RiskLevel riskProfile) {
        super(id, username, passwordHash, fullName, email, phone, Role.CUSTOMER);
        this.accountNumber = accountNumber;
        this.balance = balance != null ? balance : BigDecimal.ZERO;
        this.riskProfile = riskProfile != null ? riskProfile : RiskLevel.LOW;
    }

    @Override
    public String getDashboardGreeting() {
        return "Welcome back, " + getFullName() + " (Account: " + accountNumber + ")";
    }

    @Override
    public boolean hasAdminPrivileges() {
        return false;
    }

    public String getAccountNumber() {
        return accountNumber;
    }

    public void setAccountNumber(String accountNumber) {
        this.accountNumber = accountNumber;
    }

    public BigDecimal getBalance() {
        return balance;
    }

    public void setBalance(BigDecimal balance) {
        this.balance = balance != null ? balance : BigDecimal.ZERO;
    }

    public RiskLevel getRiskProfile() {
        return riskProfile;
    }

    public void setRiskProfile(RiskLevel riskProfile) {
        this.riskProfile = riskProfile != null ? riskProfile : RiskLevel.LOW;
    }

    @Override
    public String toString() {
        return "Customer{" +
                "id=" + getId() +
                ", username='" + getUsername() + '\'' +
                ", fullName='" + getFullName() + '\'' +
                ", accountNumber='" + accountNumber + '\'' +
                ", balance=" + balance +
                ", riskProfile=" + riskProfile +
                '}';
    }
}
