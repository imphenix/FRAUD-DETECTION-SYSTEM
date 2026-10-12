package com.fraud;

import com.fraud.model.*;
import com.fraud.util.HashUtil;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

import java.math.BigDecimal;
import java.util.*;

import static org.junit.jupiter.api.Assertions.*;

/**
 * Phase 3 Unit & Integration Tests.
 * Verifies domain models, inheritance, polymorphism, immutability, encapsulation,
 * enums, and Authenticatable interface behavior.
 */
public class ModelTest {

    @Test
    @DisplayName("Verify User hierarchy, Inheritance, and Polymorphism")
    void testUserInheritanceAndPolymorphism() {
        String adminPass = "adminSecurePass";
        String customerPass = "custSecurePass";

        Admin admin = new Admin(1L, "admin_user", HashUtil.sha256(adminPass), "Chief Admin", "admin@bank.com", "+1-555-0101", "Security Operations", 5);
        Customer customer = new Customer(2L, "cust_user", HashUtil.sha256(customerPass), "Jane Doe", "jane@example.com", "+1-555-0102", "ACC-778899", new BigDecimal("15000.50"), RiskLevel.LOW);

        // Polymorphic reference list
        List<User> users = Arrays.asList(admin, customer);

        // Verify role encapsulation
        assertEquals(Role.ADMIN, admin.getRole());
        assertEquals(Role.CUSTOMER, customer.getRole());

        // Verify polymorphic behavior
        assertTrue(users.get(0).hasAdminPrivileges());
        assertFalse(users.get(1).hasAdminPrivileges());

        assertTrue(users.get(0).getDashboardGreeting().contains("Security Administrator"));
        assertTrue(users.get(1).getDashboardGreeting().contains("Welcome back, Jane Doe"));

        // Verify specific subclass properties
        assertEquals("Security Operations", admin.getDepartment());
        assertEquals(5, admin.getSecurityClearanceLevel());
        assertEquals("ACC-778899", customer.getAccountNumber());
        assertEquals(new BigDecimal("15000.50"), customer.getBalance());
    }

    @Test
    @DisplayName("Verify Authenticatable interface and Password Hashing")
    void testAuthenticatableBehavior() {
        Admin admin = new Admin();
        admin.setUsername("security_officer");
        admin.setPlainPassword("mySecretPassword");
        admin.setActive(true);

        // Successful authentication
        assertTrue(admin.authenticate("mySecretPassword"), "Correct password should authenticate");

        // Failed authentication with incorrect password
        assertFalse(admin.authenticate("wrongPassword"), "Incorrect password must not authenticate");
        assertFalse(admin.authenticate(null), "Null password must not authenticate");

        // Disabled account must reject authentication even with valid password
        admin.setActive(false);
        assertFalse(admin.authenticate("mySecretPassword"), "Disabled account must not authenticate");
    }

    @Test
    @DisplayName("Verify Enums fromScore and fromString mappings")
    void testEnums() {
        // RiskLevel boundary scores
        assertEquals(RiskLevel.LOW, RiskLevel.fromScore(10));
        assertEquals(RiskLevel.MEDIUM, RiskLevel.fromScore(45));
        assertEquals(RiskLevel.HIGH, RiskLevel.fromScore(70));
        assertEquals(RiskLevel.CRITICAL, RiskLevel.fromScore(95));

        assertEquals(RiskLevel.HIGH, RiskLevel.fromString("high"));
        assertEquals(RiskLevel.LOW, RiskLevel.fromString("unknown_val"));

        // TransactionType & Status
        assertEquals(TransactionType.PURCHASE, TransactionType.fromString("purchase"));
        assertEquals(TransactionType.TRANSFER, TransactionType.fromString(null));

        assertEquals(TransactionStatus.FLAGGED, TransactionStatus.fromString("flagged"));
        assertEquals(TransactionStatus.BLOCKED, TransactionStatus.fromString("rejected"));
        assertEquals(TransactionStatus.PENDING, TransactionStatus.fromString(null));

        // CaseStatus
        assertEquals(CaseStatus.INVESTIGATING, CaseStatus.fromString("under_investigation"));
        assertEquals(CaseStatus.RESOLVED, CaseStatus.fromString("resolved_fraud"));
        assertEquals(CaseStatus.FALSE_POSITIVE, CaseStatus.fromString("dismissed"));
        assertEquals(CaseStatus.OPEN, CaseStatus.fromString(null));
    }

    @Test
    @DisplayName("Verify Transaction Encapsulation and Default Invariants")
    void testTransactionModel() {
        Transaction tx = new Transaction(101L, "ACC-SENDER", "ACC-RECIP", new BigDecimal("4500.00"), TransactionType.TRANSFER, "New York, USA");

        assertNotNull(tx.getReferenceId(), "Transaction should generate reference ID by default");
        assertTrue(tx.getReferenceId().startsWith("TX-"));
        assertEquals(TransactionStatus.PENDING, tx.getStatus());
        assertEquals(0, tx.getRiskScore());
        assertEquals(RiskLevel.LOW, tx.getRiskLevel());

        // Update risk score and verify automatic risk level sync
        tx.setRiskScore(80);
        assertEquals(80, tx.getRiskScore());
        assertEquals(RiskLevel.HIGH, tx.getRiskLevel());

        tx.setRiskScore(90);
        assertEquals(RiskLevel.CRITICAL, tx.getRiskLevel());
    }

    @Test
    @DisplayName("Verify FraudCase and FraudAlert Domain Entities")
    void testFraudCaseAndAlert() {
        FraudAlert alert = new FraudAlert(500L, "HIGH_AMOUNT", RiskLevel.HIGH, "Transaction exceeds 50000 limit");
        assertEquals(500L, alert.getTransactionId());
        assertEquals("HIGH_AMOUNT", alert.getRuleCode());
        assertEquals(RiskLevel.HIGH, alert.getSeverity());
        assertNotNull(alert.getTriggeredAt());

        FraudCase fCase = new FraudCase(500L, 20L, 85, "Multiple velocity spikes detected");
        assertNotNull(fCase.getCaseNumber());
        assertTrue(fCase.getCaseNumber().startsWith("CASE-"));
        assertEquals(CaseStatus.OPEN, fCase.getStatus());
        assertEquals(85, fCase.getRiskScore());

        fCase.setStatus(CaseStatus.INVESTIGATING);
        fCase.setAssignedTo(1L);
        assertEquals(CaseStatus.INVESTIGATING, fCase.getStatus());
        assertEquals(1L, fCase.getAssignedTo());
    }

    @Test
    @DisplayName("Verify FraudRule Configuration Model")
    void testFraudRule() {
        FraudRule rule = new FraudRule("RAPID_TX", "Rapid Transactions", "Detects high velocity txs", 25, 3.0);
        assertEquals("RAPID_TX", rule.getRuleCode());
        assertEquals(25, rule.getWeight());
        assertEquals(3.0, rule.getThresholdValue());
        assertTrue(rule.isActive());

        rule.setActive(false);
        assertFalse(rule.isActive());
    }

    @Test
    @DisplayName("Verify RiskAnalysis Immutability and Boundary Invariants")
    void testRiskAnalysisImmutability() {
        Set<String> mutableRules = new HashSet<>();
        mutableRules.add("HIGH_AMOUNT");
        mutableRules.add("ODD_HOUR");

        List<String> mutableReasons = new ArrayList<>();
        mutableReasons.add("Amount 75,000 exceeds threshold.");
        mutableReasons.add("Executed at 03:15 AM.");

        RiskAnalysis analysis = new RiskAnalysis(80, RiskLevel.HIGH, mutableRules, mutableReasons);

        assertEquals(80, analysis.getRiskScore());
        assertEquals(RiskLevel.HIGH, analysis.getRiskLevel());
        assertTrue(analysis.isFlagged());
        assertTrue(analysis.isBlocked()); // Score >= 75
        assertEquals(2, analysis.getTriggeredRules().size());

        // Mutating external collections must not mutate internal state (defensive copy test)
        mutableRules.add("NEW_EXTERNAL_RULE");
        mutableReasons.add("New Reason");

        assertEquals(2, analysis.getTriggeredRules().size(), "Defensive copy must prevent external modification");
        assertEquals(2, analysis.getReasons().size());

        // Attempting to modify returned unmodifiable collections must throw UnsupportedOperationException
        assertThrows(UnsupportedOperationException.class, () -> analysis.getTriggeredRules().add("ILLEGAL"));
        assertThrows(UnsupportedOperationException.class, () -> analysis.getReasons().add("ILLEGAL"));

        // Boundary bounding test: below 0 clamped to 0, above 100 clamped to 100
        RiskAnalysis underflow = new RiskAnalysis(-20, null, null, null);
        assertEquals(0, underflow.getRiskScore());
        assertEquals(RiskLevel.LOW, underflow.getRiskLevel());

        RiskAnalysis overflow = new RiskAnalysis(150, null, null, null);
        assertEquals(100, overflow.getRiskScore());
        assertEquals(RiskLevel.CRITICAL, overflow.getRiskLevel());
    }
}
