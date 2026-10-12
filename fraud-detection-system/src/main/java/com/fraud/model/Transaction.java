package com.fraud.model;

import java.math.BigDecimal;
import java.sql.Timestamp;
import java.util.Objects;
import java.util.UUID;

/**
 * Domain entity representing a financial transaction.
 * 
 * Demonstrates:
 * - Precise financial encapsulation using BigDecimal (prevents IEEE-754 floating point errors)
 * - Defensive defaults and constructors
 * - Clear mapping to the relational schema
 */
public class Transaction {

    private Long id;
    private String referenceId;
    private Long userId;
    private String senderAccount;
    private String recipientAccount;
    private BigDecimal amount;
    private TransactionType transactionType;
    private TransactionStatus status;
    private String location;
    private String ipAddress;
    private String deviceFingerprint;
    private int riskScore; // 0 to 100
    private RiskLevel riskLevel;
    private String notes;
    private Timestamp createdAt;

    public Transaction() {
        this.referenceId = "TX-" + UUID.randomUUID().toString().substring(0, 18).toUpperCase();
        this.amount = BigDecimal.ZERO;
        this.transactionType = TransactionType.TRANSFER;
        this.status = TransactionStatus.PENDING;
        this.riskScore = 0;
        this.riskLevel = RiskLevel.LOW;
        this.createdAt = new Timestamp(System.currentTimeMillis());
    }

    public Transaction(Long userId, String senderAccount, String recipientAccount, BigDecimal amount,
                       TransactionType transactionType, String location) {
        this();
        this.userId = userId;
        this.senderAccount = senderAccount;
        this.recipientAccount = recipientAccount;
        this.amount = amount != null ? amount : BigDecimal.ZERO;
        this.transactionType = transactionType != null ? transactionType : TransactionType.TRANSFER;
        this.location = location;
    }

    public Transaction(Long id, String referenceId, Long userId, String senderAccount, String recipientAccount,
                       BigDecimal amount, TransactionType transactionType, TransactionStatus status,
                       String location, String ipAddress, String deviceFingerprint, int riskScore,
                       RiskLevel riskLevel, String notes, Timestamp createdAt) {
        this.id = id;
        this.referenceId = referenceId != null ? referenceId : "TX-" + UUID.randomUUID().toString().substring(0, 18).toUpperCase();
        this.userId = userId;
        this.senderAccount = senderAccount;
        this.recipientAccount = recipientAccount;
        this.amount = amount != null ? amount : BigDecimal.ZERO;
        this.transactionType = transactionType != null ? transactionType : TransactionType.TRANSFER;
        this.status = status != null ? status : TransactionStatus.PENDING;
        this.location = location;
        this.ipAddress = ipAddress;
        this.deviceFingerprint = deviceFingerprint;
        this.riskScore = riskScore;
        this.riskLevel = riskLevel != null ? riskLevel : RiskLevel.fromScore(riskScore);
        this.notes = notes;
        this.createdAt = createdAt != null ? createdAt : new Timestamp(System.currentTimeMillis());
    }

    // Getters and Setters
    public Long getId() {
        return id;
    }

    public void setId(Long id) {
        this.id = id;
    }

    public String getReferenceId() {
        return referenceId;
    }

    public void setReferenceId(String referenceId) {
        this.referenceId = referenceId;
    }

    public Long getUserId() {
        return userId;
    }

    public void setUserId(Long userId) {
        this.userId = userId;
    }

    public String getSenderAccount() {
        return senderAccount;
    }

    public void setSenderAccount(String senderAccount) {
        this.senderAccount = senderAccount;
    }

    public String getRecipientAccount() {
        return recipientAccount;
    }

    public void setRecipientAccount(String recipientAccount) {
        this.recipientAccount = recipientAccount;
    }

    public BigDecimal getAmount() {
        return amount;
    }

    public void setAmount(BigDecimal amount) {
        this.amount = amount != null ? amount : BigDecimal.ZERO;
    }

    public TransactionType getTransactionType() {
        return transactionType;
    }

    public void setTransactionType(TransactionType transactionType) {
        this.transactionType = transactionType;
    }

    public TransactionStatus getStatus() {
        return status;
    }

    public void setStatus(TransactionStatus status) {
        this.status = status;
    }

    public String getLocation() {
        return location;
    }

    public void setLocation(String location) {
        this.location = location;
    }

    public String getIpAddress() {
        return ipAddress;
    }

    public void setIpAddress(String ipAddress) {
        this.ipAddress = ipAddress;
    }

    public String getDeviceFingerprint() {
        return deviceFingerprint;
    }

    public void setDeviceFingerprint(String deviceFingerprint) {
        this.deviceFingerprint = deviceFingerprint;
    }

    public int getRiskScore() {
        return riskScore;
    }

    public void setRiskScore(int riskScore) {
        this.riskScore = riskScore;
        this.riskLevel = RiskLevel.fromScore(riskScore);
    }

    public RiskLevel getRiskLevel() {
        return riskLevel;
    }

    public void setRiskLevel(RiskLevel riskLevel) {
        this.riskLevel = riskLevel;
    }

    public String getNotes() {
        return notes;
    }

    public void setNotes(String notes) {
        this.notes = notes;
    }

    public Timestamp getCreatedAt() {
        return createdAt;
    }

    public void setCreatedAt(Timestamp createdAt) {
        this.createdAt = createdAt;
    }

    @Override
    public boolean equals(Object o) {
        if (this == o) return true;
        if (!(o instanceof Transaction)) return false;
        Transaction that = (Transaction) o;
        return Objects.equals(id, that.id) || Objects.equals(referenceId, that.referenceId);
    }

    @Override
    public int hashCode() {
        return Objects.hash(id, referenceId);
    }

    @Override
    public String toString() {
        return "Transaction{" +
                "id=" + id +
                ", referenceId='" + referenceId + '\'' +
                ", userId=" + userId +
                ", amount=" + amount +
                ", type=" + transactionType +
                ", status=" + status +
                ", riskScore=" + riskScore +
                ", riskLevel=" + riskLevel +
                ", location='" + location + '\'' +
                '}';
    }
}
