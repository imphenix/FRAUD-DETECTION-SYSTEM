package com.fraud;

import com.fraud.dao.*;
import com.fraud.exception.DatabaseException;
import com.fraud.model.*;
import com.fraud.util.DatabaseConnection;
import com.fraud.util.HashUtil;
import org.junit.jupiter.api.BeforeAll;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

import java.math.BigDecimal;
import java.sql.Connection;
import java.sql.SQLException;
import java.sql.Timestamp;
import java.util.List;
import java.util.Optional;

import static org.junit.jupiter.api.Assertions.*;

/**
 * Phase 5 Integration Tests verifying complete DAO CRUD and custom query operations.
 * Tests:
 * - UserDAO: CRUD, findByUsername, findByAccountNumber, password hashing, Admin/Customer polymorphic mapping
 * - TransactionDAO: CRUD, findByUserId, findRecentByUserId, findByReferenceId, findByStatus
 * - FraudCaseDAO: CRUD, findOpenCases, findByTransactionId, findByUserId, findByCaseNumber
 * - FraudAlertDAO: CRUD, findAlertsByTransactionId, findByUserId (JOIN query)
 * - FraudRuleDAO: CRUD, findAllActiveRules, findByRuleCode
 * - Ambient Connection support for Phase 6 transaction propagation
 */
public class DAOTest {

    private static UserDAO userDAO;
    private static TransactionDAO transactionDAO;
    private static FraudCaseDAO fraudCaseDAO;
    private static FraudAlertDAO fraudAlertDAO;
    private static FraudRuleDAO fraudRuleDAO;

    @BeforeAll
    static void setup() throws SQLException {
        // Initialize pool and ensure schema is present
        DatabaseConnection.getConnection().close();
        userDAO = new UserDAO();
        transactionDAO = new TransactionDAO();
        fraudCaseDAO = new FraudCaseDAO();
        fraudAlertDAO = new FraudAlertDAO();
        fraudRuleDAO = new FraudRuleDAO();
    }

    @Test
    @DisplayName("UserDAO: Full CRUD, Custom Queries & Subclass Polymorphism")
    void testUserDAO() throws DatabaseException {
        String testUser = "test_user_" + System.currentTimeMillis();
        String testAcc = "ACC-" + System.currentTimeMillis();

        Customer customer = new Customer(null, testUser, HashUtil.sha256("pass123"), "Test Customer",
                testUser + "@example.com", "+1-555-9999", testAcc, new BigDecimal("8500.00"), RiskLevel.LOW);

        // 1. Save (INSERT)
        User saved = userDAO.save(customer);
        assertNotNull(saved.getId(), "User ID must be generated");
        assertTrue(saved.getId() > 0);

        // 2. Select by ID (findById)
        Optional<User> fetched = userDAO.findById(saved.getId());
        assertTrue(fetched.isPresent());
        assertInstanceOf(Customer.class, fetched.get());
        Customer fetchedCust = (Customer) fetched.get();
        assertEquals(testUser, fetchedCust.getUsername());
        assertEquals(testAcc, fetchedCust.getAccountNumber());
        assertEquals(new BigDecimal("8500.00"), fetchedCust.getBalance());

        // 3. Custom Query: findByUsername
        Optional<User> byUsername = userDAO.findByUsername(testUser);
        assertTrue(byUsername.isPresent());
        assertEquals(saved.getId(), byUsername.get().getId());

        // 4. Custom Query: findByAccountNumber
        Optional<User> byAccount = userDAO.findByAccountNumber(testAcc);
        assertTrue(byAccount.isPresent());
        assertEquals(saved.getId(), byAccount.get().getId());

        // 5. Update
        fetchedCust.setFullName("Updated Name Test");
        fetchedCust.setBalance(new BigDecimal("12000.00"));
        userDAO.update(fetchedCust);

        Optional<User> updated = userDAO.findById(saved.getId());
        assertTrue(updated.isPresent());
        assertEquals("Updated Name Test", updated.get().getFullName());
        assertEquals(new BigDecimal("12000.00"), ((Customer) updated.get()).getBalance());

        // 6. Delete
        boolean deleted = userDAO.deleteById(saved.getId());
        assertTrue(deleted);
        assertFalse(userDAO.existsById(saved.getId()));
    }

    @Test
    @DisplayName("TransactionDAO: Full CRUD, findByUserId, findRecentByUserId & Status Filtering")
    void testTransactionDAO() throws DatabaseException {
        Long testUserId = 2L; // Existing seeded customer john_doe
        String refId = "TX-TEST-" + System.currentTimeMillis();

        Transaction tx = new Transaction(testUserId, "ACC-98421001", "ACC-BENEFICIARY",
                new BigDecimal("2500.50"), TransactionType.TRANSFER, "Toronto, Canada");
        tx.setReferenceId(refId);
        tx.setIpAddress("198.51.100.12");
        tx.setDeviceFingerprint("FP-BROWSER-CHROME-01");
        tx.setRiskScore(15);
        tx.setStatus(TransactionStatus.PENDING);

        // 1. Save
        Transaction saved = transactionDAO.save(tx);
        assertNotNull(saved.getId());

        // 2. Find by Reference ID
        Optional<Transaction> byRef = transactionDAO.findByReferenceId(refId);
        assertTrue(byRef.isPresent());
        assertEquals(new BigDecimal("2500.50"), byRef.get().getAmount());
        assertEquals(TransactionType.TRANSFER, byRef.get().getTransactionType());

        // 3. Find by User ID
        List<Transaction> userTxs = transactionDAO.findByUserId(testUserId);
        assertFalse(userTxs.isEmpty());
        assertTrue(userTxs.stream().anyMatch(t -> refId.equals(t.getReferenceId())));

        // 4. Find recent by User ID with limit
        List<Transaction> recent = transactionDAO.findRecentByUserId(testUserId, 2);
        assertTrue(recent.size() <= 2);

        // 5. Update status & risk score
        saved.setStatus(TransactionStatus.APPROVED);
        saved.setRiskScore(20);
        transactionDAO.update(saved);

        Optional<Transaction> updated = transactionDAO.findById(saved.getId());
        assertTrue(updated.isPresent());
        assertEquals(TransactionStatus.APPROVED, updated.get().getStatus());

        // 6. Delete
        assertTrue(transactionDAO.deleteById(saved.getId()));
        assertFalse(transactionDAO.findById(saved.getId()).isPresent());
    }

    @Test
    @DisplayName("FraudCaseDAO: CRUD, findOpenCases, findByTransactionId & Assignee Null Handling")
    void testFraudCaseDAO() throws DatabaseException {
        // Create an anchor transaction first
        Transaction tx = new Transaction(2L, "ACC-98421001", "ACC-UNKNOWN",
                new BigDecimal("8000.00"), TransactionType.TRANSFER, "Kyiv, Ukraine");
        tx = transactionDAO.save(tx);

        String caseNum = "CASE-TEST-" + System.currentTimeMillis();
        FraudCase fCase = new FraudCase(tx.getId(), 2L, 75, "Suspicious international transfer");
        fCase.setCaseNumber(caseNum);
        fCase.setStatus(CaseStatus.OPEN);
        fCase.setAssignedTo(null); // Explicit null assignee check

        // 1. Save
        FraudCase saved = fraudCaseDAO.save(fCase);
        assertNotNull(saved.getId());
        assertNull(saved.getAssignedTo());

        // 2. Find by Transaction ID
        Optional<FraudCase> byTx = fraudCaseDAO.findByTransactionId(tx.getId());
        assertTrue(byTx.isPresent());
        assertEquals(caseNum, byTx.get().getCaseNumber());

        // 3. Find by Case Number
        Optional<FraudCase> byNum = fraudCaseDAO.findByCaseNumber(caseNum);
        assertTrue(byNum.isPresent());

        // 4. Find open cases
        List<FraudCase> openCases = fraudCaseDAO.findOpenCases();
        assertFalse(openCases.isEmpty());
        assertTrue(openCases.stream().anyMatch(c -> caseNum.equals(c.getCaseNumber())));

        // 5. Update: assign to Admin (ID 1) and change status
        saved.setAssignedTo(1L);
        saved.setStatus(CaseStatus.INVESTIGATING);
        saved.setInvestigationNotes("Assigned to security admin for KYC verification");
        fraudCaseDAO.update(saved);

        Optional<FraudCase> updated = fraudCaseDAO.findById(saved.getId());
        assertTrue(updated.isPresent());
        assertEquals(1L, updated.get().getAssignedTo());
        assertEquals(CaseStatus.INVESTIGATING, updated.get().getStatus());

        // Cleanup
        fraudCaseDAO.deleteById(saved.getId());
        transactionDAO.deleteById(tx.getId());
    }

    @Test
    @DisplayName("FraudAlertDAO: CRUD, findAlertsByTransactionId & findByUserId Join Query")
    void testFraudAlertDAO() throws DatabaseException {
        Transaction tx = new Transaction(3L, "ACC-98421002", "ACC-EXT",
                new BigDecimal("99000.00"), TransactionType.PURCHASE, "Tokyo, Japan");
        tx = transactionDAO.save(tx);

        FraudAlert alert = new FraudAlert(tx.getId(), "HIGH_AMOUNT", RiskLevel.CRITICAL, "Single purchase exceeds threshold");

        // 1. Save
        FraudAlert saved = fraudAlertDAO.save(alert);
        assertNotNull(saved.getId());

        // 2. Find alerts by transaction ID
        List<FraudAlert> txAlerts = fraudAlertDAO.findAlertsByTransactionId(tx.getId());
        assertEquals(1, txAlerts.size());
        assertEquals("HIGH_AMOUNT", txAlerts.get(0).getRuleCode());
        assertEquals(RiskLevel.CRITICAL, txAlerts.get(0).getSeverity());

        // 3. Find alerts by user ID (JOIN query)
        List<FraudAlert> userAlerts = fraudAlertDAO.findByUserId(3L);
        assertFalse(userAlerts.isEmpty());
        assertTrue(userAlerts.stream().anyMatch(a -> "HIGH_AMOUNT".equals(a.getRuleCode())));

        // 4. Update
        saved.setMessage("Updated alert resolution note");
        saved.setSeverity(RiskLevel.HIGH);
        fraudAlertDAO.update(saved);

        Optional<FraudAlert> updated = fraudAlertDAO.findById(saved.getId());
        assertTrue(updated.isPresent());
        assertEquals("Updated alert resolution note", updated.get().getMessage());
        assertEquals(RiskLevel.HIGH, updated.get().getSeverity());

        // Cleanup
        fraudAlertDAO.deleteById(saved.getId());
        transactionDAO.deleteById(tx.getId());
    }

    @Test
    @DisplayName("FraudRuleDAO: CRUD, findAllActiveRules & findByRuleCode")
    void testFraudRuleDAO() throws DatabaseException {
        // 1. Find all active seed rules
        List<FraudRule> activeRules = fraudRuleDAO.findAllActiveRules();
        assertNotNull(activeRules);
        assertTrue(activeRules.size() >= 6, "Must load at least 6 initial seed rules");

        // 2. Find by rule code
        Optional<FraudRule> highAmount = fraudRuleDAO.findByRuleCode("HIGH_AMOUNT");
        assertTrue(highAmount.isPresent());
        assertEquals("HIGH_AMOUNT", highAmount.get().getRuleCode());
        assertEquals(30, highAmount.get().getWeight());

        // 3. Create a custom rule
        String ruleCode = "TEST_CUSTOM_" + System.currentTimeMillis();
        FraudRule custom = new FraudRule(ruleCode, "Custom Velocity Rule", "Test Rule", 18, 4.0);
        FraudRule saved = fraudRuleDAO.save(custom);
        assertNotNull(saved.getId());

        // 4. Update rule
        saved.setThresholdValue(5.0);
        saved.setActive(false);
        fraudRuleDAO.update(saved);

        Optional<FraudRule> updated = fraudRuleDAO.findById(saved.getId());
        assertTrue(updated.isPresent());
        assertEquals(5.0, updated.get().getThresholdValue());
        assertFalse(updated.get().isActive());

        // 5. Delete rule
        assertTrue(fraudRuleDAO.deleteById(saved.getId()));
        assertFalse(fraudRuleDAO.findById(saved.getId()).isPresent());
    }

    @Test
    @DisplayName("Verify Ambient Connection Support for Phase 6 Transactions")
    void testAmbientConnectionPropagation() throws Exception {
        try (Connection conn = DatabaseConnection.getConnection()) {
            conn.setAutoCommit(false); // Begin manual transaction

            String txRef = "TX-TXN-AMB-" + System.currentTimeMillis();
            Transaction tx = new Transaction(1L, "ACC-ADMIN-001", "ACC-TEST", new BigDecimal("100.00"), TransactionType.TRANSFER, "Ambience");
            tx.setReferenceId(txRef);

            // Save inside ambient connection
            Transaction saved = transactionDAO.save(tx, conn);
            assertNotNull(saved.getId());

            // Create alert inside same ambient connection
            FraudAlert alert = new FraudAlert(saved.getId(), "HIGH_AMOUNT", RiskLevel.LOW, "Ambient test");
            FraudAlert savedAlert = fraudAlertDAO.save(alert, conn);
            assertNotNull(savedAlert.getId());

            // Rollback ambient transaction
            conn.rollback();

            // Verify both were rolled back
            assertFalse(transactionDAO.findById(saved.getId()).isPresent());
            assertFalse(fraudAlertDAO.findById(savedAlert.getId()).isPresent());
        }
    }
}
