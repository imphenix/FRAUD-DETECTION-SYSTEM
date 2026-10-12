package com.fraud.model;

import java.sql.Timestamp;
import java.util.Objects;

/**
 * Domain entity representing a configurable rule in the fraud detection engine.
 * 
 * Demonstrates:
 * - Clean encapsulation
 * - Configurable weights and boundary thresholds
 */
public class FraudRule {

    private Integer id;
    private String ruleCode;
    private String ruleName;
    private String description;
    private int weight; // 0 to 100 contribution
    private double thresholdValue;
    private boolean active;
    private Timestamp createdAt;

    public FraudRule() {
        this.weight = 20;
        this.active = true;
        this.createdAt = new Timestamp(System.currentTimeMillis());
    }

    public FraudRule(String ruleCode, String ruleName, String description, int weight, double thresholdValue) {
        this();
        this.ruleCode = ruleCode;
        this.ruleName = ruleName;
        this.description = description;
        this.weight = weight;
        this.thresholdValue = thresholdValue;
    }

    public FraudRule(Integer id, String ruleCode, String ruleName, String description, int weight, double thresholdValue, boolean active, Timestamp createdAt) {
        this.id = id;
        this.ruleCode = ruleCode;
        this.ruleName = ruleName;
        this.description = description;
        this.weight = weight;
        this.thresholdValue = thresholdValue;
        this.active = active;
        this.createdAt = createdAt != null ? createdAt : new Timestamp(System.currentTimeMillis());
    }

    // Getters and Setters
    public Integer getId() {
        return id;
    }

    public void setId(Integer id) {
        this.id = id;
    }

    public String getRuleCode() {
        return ruleCode;
    }

    public void setRuleCode(String ruleCode) {
        this.ruleCode = ruleCode;
    }

    public String getRuleName() {
        return ruleName;
    }

    public void setRuleName(String ruleName) {
        this.ruleName = ruleName;
    }

    public String getDescription() {
        return description;
    }

    public void setDescription(String description) {
        this.description = description;
    }

    public int getWeight() {
        return weight;
    }

    public void setWeight(int weight) {
        this.weight = weight;
    }

    public double getThresholdValue() {
        return thresholdValue;
    }

    public void setThresholdValue(double thresholdValue) {
        this.thresholdValue = thresholdValue;
    }

    public boolean isActive() {
        return active;
    }

    public void setActive(boolean active) {
        this.active = active;
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
        if (!(o instanceof FraudRule)) return false;
        FraudRule fraudRule = (FraudRule) o;
        return Objects.equals(id, fraudRule.id) || Objects.equals(ruleCode, fraudRule.ruleCode);
    }

    @Override
    public int hashCode() {
        return Objects.hash(id, ruleCode);
    }

    @Override
    public String toString() {
        return "FraudRule{" +
                "id=" + id +
                ", ruleCode='" + ruleCode + '\'' +
                ", ruleName='" + ruleName + '\'' +
                ", weight=" + weight +
                ", threshold=" + thresholdValue +
                ", active=" + active +
                '}';
    }
}
