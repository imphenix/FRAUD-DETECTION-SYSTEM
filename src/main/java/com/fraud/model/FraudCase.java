package com.fraud.model;

import java.sql.Timestamp;
import java.util.Objects;
import java.util.UUID;

/**
 * Domain entity representing an investigation case opened by compliance officers or system admins.
 */
public class FraudCase {

    private Long id;
    private String caseNumber;
    private Long transactionId;
    private Long userId;
    private Long assignedTo; // Admin ID assigned to investigate
    private CaseStatus status;
    private int riskScore;
    private String investigationNotes;
    private String resolutionDetails;
    private Timestamp createdAt;
    private Timestamp updatedAt;

    public FraudCase() {
        this.caseNumber = "CASE-" + UUID.randomUUID().toString().substring(0, 8).toUpperCase();
        this.status = CaseStatus.OPEN;
        this.createdAt = new Timestamp(System.currentTimeMillis());
        this.updatedAt = new Timestamp(System.currentTimeMillis());
    }

    public FraudCase(Long transactionId, Long userId, int riskScore, String investigationNotes) {
        this();
        this.transactionId = transactionId;
        this.userId = userId;
        this.riskScore = riskScore;
        this.investigationNotes = investigationNotes;
    }

    public FraudCase(Long id, String caseNumber, Long transactionId, Long userId, Long assignedTo,
                     CaseStatus status, int riskScore, String investigationNotes, String resolutionDetails,
                     Timestamp createdAt, Timestamp updatedAt) {
        this.id = id;
        this.caseNumber = caseNumber != null ? caseNumber : "CASE-" + UUID.randomUUID().toString().substring(0, 8).toUpperCase();
        this.transactionId = transactionId;
        this.userId = userId;
        this.assignedTo = assignedTo;
        this.status = status != null ? status : CaseStatus.OPEN;
        this.riskScore = riskScore;
        this.investigationNotes = investigationNotes;
        this.resolutionDetails = resolutionDetails;
        this.createdAt = createdAt != null ? createdAt : new Timestamp(System.currentTimeMillis());
        this.updatedAt = updatedAt != null ? updatedAt : new Timestamp(System.currentTimeMillis());
    }

    // Getters and Setters
    public Long getId() {
        return id;
    }

    public void setId(Long id) {
        this.id = id;
    }

    public String getCaseNumber() {
        return caseNumber;
    }

    public void setCaseNumber(String caseNumber) {
        this.caseNumber = caseNumber;
    }

    public Long getTransactionId() {
        return transactionId;
    }

    public void setTransactionId(Long transactionId) {
        this.transactionId = transactionId;
    }

    public Long getUserId() {
        return userId;
    }

    public void setUserId(Long userId) {
        this.userId = userId;
    }

    public Long getAssignedTo() {
        return assignedTo;
    }

    public void setAssignedTo(Long assignedTo) {
        this.assignedTo = assignedTo;
    }

    public CaseStatus getStatus() {
        return status;
    }

    public void setStatus(CaseStatus status) {
        this.status = status;
        this.updatedAt = new Timestamp(System.currentTimeMillis());
    }

    public int getRiskScore() {
        return riskScore;
    }

    public void setRiskScore(int riskScore) {
        this.riskScore = riskScore;
    }

    public String getInvestigationNotes() {
        return investigationNotes;
    }

    public void setInvestigationNotes(String investigationNotes) {
        this.investigationNotes = investigationNotes;
        this.updatedAt = new Timestamp(System.currentTimeMillis());
    }

    public String getResolutionDetails() {
        return resolutionDetails;
    }

    public void setResolutionDetails(String resolutionDetails) {
        this.resolutionDetails = resolutionDetails;
        this.updatedAt = new Timestamp(System.currentTimeMillis());
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
        if (!(o instanceof FraudCase)) return false;
        FraudCase fraudCase = (FraudCase) o;
        return Objects.equals(id, fraudCase.id) || Objects.equals(caseNumber, fraudCase.caseNumber);
    }

    @Override
    public int hashCode() {
        return Objects.hash(id, caseNumber);
    }

    @Override
    public String toString() {
        return "FraudCase{" +
                "id=" + id +
                ", caseNumber='" + caseNumber + '\'' +
                ", transactionId=" + transactionId +
                ", userId=" + userId +
                ", assignedTo=" + assignedTo +
                ", status=" + status +
                ", riskScore=" + riskScore +
                '}';
    }
}
