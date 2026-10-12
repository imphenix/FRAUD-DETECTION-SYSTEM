package com.fraud.model;

import java.util.ArrayList;
import java.util.Collections;
import java.util.HashSet;
import java.util.List;
import java.util.Objects;
import java.util.Set;

/**
 * Value Object encapsulating the result of a multi-factor risk analysis.
 * 
 * Demonstrates:
 * - Immutability (final fields, unmodifiable collections, defensive copies)
 * - Safe Value Object semantics
 * - Rich evaluation diagnostics without side effects
 */
public final class RiskAnalysis {

    private final int riskScore; // 0 to 100
    private final RiskLevel riskLevel;
    private final Set<String> triggeredRules; // Unique rule codes that flagged this transaction
    private final List<String> reasons; // Explanatory diagnostics
    private final boolean flagged;
    private final boolean blocked;

    /**
     * Parameterized Constructor with defensive copying to ensure strict immutability.
     */
    public RiskAnalysis(int riskScore, RiskLevel riskLevel, Set<String> triggeredRules, List<String> reasons) {
        // Enforce boundary invariant (0-100)
        this.riskScore = Math.max(0, Math.min(100, riskScore));
        this.riskLevel = riskLevel != null ? riskLevel : RiskLevel.fromScore(this.riskScore);
        
        // Defensive copies
        this.triggeredRules = triggeredRules != null 
                ? Collections.unmodifiableSet(new HashSet<>(triggeredRules)) 
                : Collections.emptySet();
        this.reasons = reasons != null 
                ? Collections.unmodifiableList(new ArrayList<>(reasons)) 
                : Collections.emptyList();
        
        // Action flags based on standard bank risk thresholds
        this.flagged = this.riskScore >= 40 || !this.triggeredRules.isEmpty();
        this.blocked = this.riskScore >= 75;
    }

    /**
     * Factory for zero-risk approval result.
     */
    public static RiskAnalysis clean() {
        return new RiskAnalysis(0, RiskLevel.LOW, Collections.emptySet(), Collections.singletonList("Transaction passed all fraud rules."));
    }

    public int getRiskScore() {
        return riskScore;
    }

    public RiskLevel getRiskLevel() {
        return riskLevel;
    }

    public Set<String> getTriggeredRules() {
        return triggeredRules;
    }

    public List<String> getReasons() {
        return reasons;
    }

    public boolean isFlagged() {
        return flagged;
    }

    public boolean isBlocked() {
        return blocked;
    }

    @Override
    public boolean equals(Object o) {
        if (this == o) return true;
        if (!(o instanceof RiskAnalysis)) return false;
        RiskAnalysis that = (RiskAnalysis) o;
        return riskScore == that.riskScore &&
                riskLevel == that.riskLevel &&
                Objects.equals(triggeredRules, that.triggeredRules) &&
                Objects.equals(reasons, that.reasons);
    }

    @Override
    public int hashCode() {
        return Objects.hash(riskScore, riskLevel, triggeredRules, reasons);
    }

    @Override
    public String toString() {
        return "RiskAnalysis{" +
                "score=" + riskScore +
                ", level=" + riskLevel +
                ", flagged=" + flagged +
                ", blocked=" + blocked +
                ", triggeredRules=" + triggeredRules +
                '}';
    }
}
