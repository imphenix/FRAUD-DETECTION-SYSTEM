package com.fraud.model;

/**
 * Status lifecycle of a compliance investigation case.
 */
public enum CaseStatus {
    OPEN,
    INVESTIGATING,
    RESOLVED,
    FALSE_POSITIVE;

    public static CaseStatus fromString(String value) {
        if (value == null) return OPEN;
        String clean = value.trim().toUpperCase();
        if ("UNDER_INVESTIGATION".equals(clean)) return INVESTIGATING;
        if ("RESOLVED_FRAUD".equals(clean) || "RESOLVED_LEGITIMATE".equals(clean)) return RESOLVED;
        if ("DISMISSED".equals(clean)) return FALSE_POSITIVE;
        try {
            return CaseStatus.valueOf(clean);
        } catch (IllegalArgumentException e) {
            return OPEN;
        }
    }
}
