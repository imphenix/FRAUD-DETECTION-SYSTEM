package com.fraud.model;

import java.sql.Timestamp;
import java.util.Objects;

/**
 * Domain entity representing an individual alert triggered by a specific fraud detection rule.
 */
public class FraudAlert {

    private Long id;
    private Long transactionId;
    private String ruleCode;
    private RiskLevel severity;
    private String message;
    private Timestamp triggeredAt;

    public FraudAlert() {
        this.severity = RiskLevel.MEDIUM;
        this.triggeredAt = new Timestamp(System.currentTimeMillis());
    }

    public FraudAlert(Long transactionId, String ruleCode, RiskLevel severity, String message) {
        this.transactionId = transactionId;
        this.ruleCode = ruleCode;
        this.severity = severity != null ? severity : RiskLevel.MEDIUM;
        this.message = message;
        this.triggeredAt = new Timestamp(System.currentTimeMillis());
    }

    public FraudAlert(Long id, Long transactionId, String ruleCode, RiskLevel severity, String message, Timestamp triggeredAt) {
        this.id = id;
        this.transactionId = transactionId;
        this.ruleCode = ruleCode;
        this.severity = severity != null ? severity : RiskLevel.MEDIUM;
        this.message = message;
        this.triggeredAt = triggeredAt != null ? triggeredAt : new Timestamp(System.currentTimeMillis());
    }

    // Getters and Setters
    public Long getId() {
        return id;
    }

    public void setId(Long id) {
        this.id = id;
    }

    public Long getTransactionId() {
        return transactionId;
    }

    public void setTransactionId(Long transactionId) {
        this.transactionId = transactionId;
    }

    public String getRuleCode() {
        return ruleCode;
    }

    public void setRuleCode(String ruleCode) {
        this.ruleCode = ruleCode;
    }

    public RiskLevel getSeverity() {
        return severity;
    }

    public void setSeverity(RiskLevel severity) {
        this.severity = severity;
    }

    public String getMessage() {
        return message;
    }

    public void setMessage(String message) {
        this.message = message;
    }

    public Timestamp getTriggeredAt() {
        return triggeredAt;
    }

    public void setTriggeredAt(Timestamp triggeredAt) {
        this.triggeredAt = triggeredAt;
    }

    @Override
    public boolean equals(Object o) {
        if (this == o) return true;
        if (!(o instanceof FraudAlert)) return false;
        FraudAlert that = (FraudAlert) o;
        return Objects.equals(id, that.id) ||
                (Objects.equals(transactionId, that.transactionId) && Objects.equals(ruleCode, that.ruleCode));
    }

    @Override
    public int hashCode() {
        return Objects.hash(id, transactionId, ruleCode);
    }

    @Override
    public String toString() {
        return "FraudAlert{" +
                "id=" + id +
                ", transactionId=" + transactionId +
                ", ruleCode='" + ruleCode + '\'' +
                ", severity=" + severity +
                ", message='" + message + '\'' +
                ", triggeredAt=" + triggeredAt +
                '}';
    }
}
