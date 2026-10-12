package com.fraud.model;

/**
 * Risk classification levels calculated by the multi-factor scoring engine.
 */
public enum RiskLevel {
    LOW(0, 39),
    MEDIUM(40, 69),
    HIGH(70, 84),
    CRITICAL(85, 100);

    private final int minScore;
    private final int maxScore;

    RiskLevel(int minScore, int maxScore) {
        this.minScore = minScore;
        this.maxScore = maxScore;
    }

    public int getMinScore() {
        return minScore;
    }

    public int getMaxScore() {
        return maxScore;
    }

    /**
     * Determines RiskLevel from an aggregate numeric score (0 to 100).
     */
    public static RiskLevel fromScore(int score) {
        if (score >= 85) return CRITICAL;
        if (score >= 70) return HIGH;
        if (score >= 40) return MEDIUM;
        return LOW;
    }

    public static RiskLevel fromString(String value) {
        if (value == null) return LOW;
        try {
            return RiskLevel.valueOf(value.trim().toUpperCase());
        } catch (IllegalArgumentException e) {
            return LOW;
        }
    }
}
