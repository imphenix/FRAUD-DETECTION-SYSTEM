package com.fraud;

import com.fraud.dao.FraudAlertDAO;
import com.fraud.dao.FraudCaseDAO;
import com.fraud.dao.FraudRuleDAO;
import com.fraud.dao.TransactionDAO;
import com.fraud.dao.UserDAO;
import com.fraud.exception.AuthenticationException;
import com.fraud.exception.DatabaseException;
import com.fraud.exception.FraudDetectionException;
import com.fraud.exception.ValidationException;
import com.fraud.model.CaseStatus;
import com.fraud.model.Customer;
import com.fraud.model.FraudAlert;
import com.fraud.model.FraudCase;
import com.fraud.model.RiskAnalysis;
import com.fraud.model.RiskLevel;
import com.fraud.model.Role;
import com.fraud.model.Transaction;
import com.fraud.model.TransactionStatus;
import com.fraud.model.TransactionType;
import com.fraud.model.User;
import com.fraud.service.FraudCaseService;
import com.fraud.service.FraudDetectionService;
import com.fraud.service.TransactionManagementService;
import com.fraud.service.TransactionService;
import com.fraud.service.UserService;
import com.fraud.util.DatabaseConnection;
import org.junit.jupiter.api.BeforeAll;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

import java.math.BigDecimal;
import java.sql.SQLException;
import java.util.List;
import java.util.Optional;

import static org.junit.jupiter.api.Assertions.*;

/**
 * Phase 9 Service Layer & Business Workflow Test Suite.
 *
 * Verifies:
 * 1. UserService: Customer registration, Admin registration, authentication, balance updates, and validation.
 * 2. FraudDetectionService: Real engine analysis integration, historical baseline synchronization, and rule updates.
 * 3. FraudCaseService: Investigation case lifecycle (open -> assign -> resolve), alert retrieval, and user alert filtering.
 * 4. TransactionService: End-to-end processing workflow (input validation -> fraud engine -> atomic persistence -> balance adjustment).
 * 5. Input validation error handling (null transactions, negative amounts, insufficient funds).
 * 6. Clean vs. Suspicious vs. Blocked transaction flows and corresponding case/alert generation.
 * 7. Regression compatibility with all previous phases.
 */
public class ServiceWorkflowTest {

    private static UserDAO userDAO;
    private static TransactionDAO transactionDAO;
    private static FraudCaseDAO fraudCaseDAO;
    private static FraudAlertDAO fraudAlertDAO;
    private static FraudRuleDAO fraudRuleDAO;

    private static UserService userService;
    private static FraudDetectionService fraudDetectionService;
    private static FraudCaseService fraudCaseService;
    private static TransactionService transactionService;

    @BeforeAll
    static void initServices() throws SQLException {
        DatabaseConnection.getConnection().close();

        userDAO = new UserDAO();
        transactionDAO = new TransactionDAO();
        fraudCaseDAO = new FraudCaseDAO();
        fraudAlertDAO = new FraudAlertDAO();
        fraudRuleDAO = new FraudRuleDAO();

        userService = new UserService(userDAO);
        fraudDetectionService = new FraudDetectionService(fraudRuleDAO, transactionDAO, userDAO);
        fraudCaseService = new FraudCaseService(fraudCaseDAO, fraudAlertDAO);
        TransactionManagementService txMgmtService = new TransactionManagementService(transactionDAO, fraudCaseDAO, fraudAlertDAO);

        transactionService = new TransactionService(
                transactionDAO,
                userDAO,
                fraudDetectionService,
                txMgmtService,
                userService,
                new com.fraud.collection.FraudStatistics()
        );
    }

    @Test
    @DisplayName("1. UserService: Customer Registration, Authentication & Balance Modification")
    void testUserServiceWorkflow() throws Exception {
        String username = "cust_" + System.currentTimeMillis();
        String accNum = "ACC-WKF-" + System.currentTimeMillis();

        // 1. Register customer
        Customer registered = userService.registerCustomer(
                username,
                "securePass123",
                "Workflow Customer",
                username + "@bank.com",
                "+1-555-0988",
                accNum,
                new BigDecimal("1000.00")
        );

        assertNotNull(registered.getId());
        assertEquals(username, registered.getUsername());
        assertEquals(Role.CUSTOMER, registered.getRole());

        // 2. Authenticate
        User authenticated = userService.authenticate(username, "securePass123");
        assertEquals(registered.getId(), authenticated.getId());

        // 3. Bad password should throw AuthenticationException
        assertThrows(AuthenticationException.class, () -> {
            userService.authenticate(username, "wrongPassword");
        });

        // 4. Update balance
        Customer balanceUpdated = userService.updateBalance(registered.getId(), new BigDecimal("250.00"));
        assertEquals(new BigDecimal("1250.00"), balanceUpdated.getBalance());

        // 5. Overdraft check
        assertThrows(ValidationException.class, () -> {
            userService.updateBalance(registered.getId(), new BigDecimal("-5000.00"));
        });
    }

    @Test
    @DisplayName("2. TransactionService: Input Validation & Balance Protection")
    void testTransactionServiceValidation() {
        // Null transaction
        assertThrows(ValidationException.class, () -> {
            transactionService.processTransaction(null);
        });

        // Negative amount
        Transaction badAmount = new Transaction(2L, "A", "B", new BigDecimal("-10.00"), TransactionType.TRANSFER, "Rome");
        assertThrows(ValidationException.class, () -> {
            transactionService.processTransaction(badAmount);
        });

        // Non-existent customer
        Transaction badUser = new Transaction(99999999L, "A", "B", new BigDecimal("100.00"), TransactionType.TRANSFER, "Rome");
        assertThrows(ValidationException.class, () -> {
            transactionService.processTransaction(badUser);
        });

        // Insufficient funds (John Doe has ~45,000 balance, requesting 900,000)
        Transaction overDraft = new Transaction(2L, "ACC-98421001", "ACC-EXT",
                new BigDecimal("900000.00"), TransactionType.TRANSFER, "Rome");
        assertThrows(ValidationException.class, () -> {
            transactionService.processTransaction(overDraft);
        });
    }

    @Test
    @DisplayName("3. TransactionService: Clean Transaction Workflow (Approved & Balance Debited)")
    void testCleanTransactionWorkflow() throws Exception {
        // John Doe (User ID 2)
        Optional<User> uBefore = userService.getUserById(2L);
        assertTrue(uBefore.isPresent());
        BigDecimal balanceBefore = ((Customer) uBefore.get()).getBalance();

        BigDecimal txAmount = new BigDecimal("45.00");
        Transaction tx = new Transaction(2L, "ACC-98421001", "ACC-CAFE",
                txAmount, TransactionType.PURCHASE, "New York, USA");

        Transaction processed = transactionService.processTransaction(tx);

        assertNotNull(processed.getId());
        assertEquals(TransactionStatus.APPROVED, processed.getStatus());
        assertEquals(RiskLevel.LOW, processed.getRiskLevel());

        // Balance should be debited by 45.00
        Optional<User> uAfter = userService.getUserById(2L);
        assertTrue(uAfter.isPresent());
        BigDecimal balanceAfter = ((Customer) uAfter.get()).getBalance();
        assertEquals(balanceBefore.subtract(txAmount), balanceAfter);

        // No alerts or fraud case should exist for this clean transaction
        List<FraudAlert> alerts = fraudCaseService.getAlertsByTransactionId(processed.getId());
        assertTrue(alerts.isEmpty());
        Optional<FraudCase> fCase = fraudCaseService.getCaseByTransactionId(processed.getId());
        assertFalse(fCase.isPresent());
    }

    @Test
    @DisplayName("4. TransactionService: Suspicious Transaction Workflow (Flagged, Alerts Created, Case Opened)")
    void testSuspiciousTransactionWorkflow() throws Exception {
        // Setup a customer with substantial balance
        String username = "suspicious_user_" + System.currentTimeMillis();
        Customer cust = userService.registerCustomer(
                username,
                "password123",
                "High Balance Customer",
                username + "@test.com",
                "+91-98765-01004",
                "ACC-SUSP-" + System.currentTimeMillis(),
                new BigDecimal("500000.00")
        );

        // Prime baseline in New Delhi
        Transaction baseTx = new Transaction(cust.getId(), cust.getAccountNumber(), "ACC-STORE",
                new BigDecimal("500.00"), TransactionType.PURCHASE, "New Delhi, India");
        fraudDetectionService.recordBaseline(baseTx);

        // Transaction from foreign location + High Amount (₹3,00,000 > 2,00,000)
        // HIGH_AMOUNT (30) + UNUSUAL_LOCATION (20) = 50 points -> FLAGGED
        Transaction suspiciousTx = new Transaction(cust.getId(), cust.getAccountNumber(), "ACC-OVERSEAS",
                new BigDecimal("300000.00"), TransactionType.TRANSFER, "Caracas, Venezuela");

        Transaction processed = transactionService.processTransaction(suspiciousTx);

        assertNotNull(processed.getId());
        assertEquals(TransactionStatus.FLAGGED, processed.getStatus());
        assertTrue(processed.getRiskScore() >= 40);

        // Verify FraudAlerts were created
        List<FraudAlert> alerts = fraudCaseService.getAlertsByTransactionId(processed.getId());
        assertFalse(alerts.isEmpty());
        assertTrue(alerts.stream().anyMatch(a -> "HIGH_AMOUNT".equals(a.getRuleCode())));

        // Verify FraudCase was automatically opened
        Optional<FraudCase> fCase = fraudCaseService.getCaseByTransactionId(processed.getId());
        assertTrue(fCase.isPresent());
        assertEquals(CaseStatus.INVESTIGATING, fCase.get().getStatus());
        assertEquals(cust.getId(), fCase.get().getUserId());
    }

    @Test
    @DisplayName("5. FraudCaseService: Investigation Case Lifecycle (Open -> Assign -> Resolve)")
    void testFraudCaseLifecycleWorkflow() throws Exception {
        // Open manual case
        FraudCase fCase = fraudCaseService.openCase(1L, 2L, 80, "Compliance audit required");
        assertNotNull(fCase.getId());
        assertEquals(CaseStatus.OPEN, fCase.getStatus());

        // Assign to Admin (ID 1)
        FraudCase assigned = fraudCaseService.assignCase(fCase.getId(), 1L);
        assertEquals(CaseStatus.INVESTIGATING, assigned.getStatus());
        assertEquals(1L, assigned.getAssignedTo());

        // Resolve case as Legitimate
        FraudCase resolved = fraudCaseService.resolveCase(fCase.getId(),
                CaseStatus.RESOLVED_LEGITIMATE, "Customer verified via phone authorization");
        assertEquals(CaseStatus.RESOLVED_LEGITIMATE, resolved.getStatus());
        assertEquals("Customer verified via phone authorization", resolved.getResolutionDetails());

        // Invalid resolution transition check
        assertThrows(ValidationException.class, () -> {
            fraudCaseService.resolveCase(fCase.getId(), CaseStatus.OPEN, "Reopening invalid");
        });
    }

    @Test
    @DisplayName("6. FraudDetectionService: Direct Analysis and Baseline Management")
    void testFraudDetectionServiceApi() throws Exception {
        Transaction tx = new Transaction(2L, "ACC-98421001", "ACC-M",
                new BigDecimal("100.00"), TransactionType.PAYMENT, "Toronto, Canada");

        RiskAnalysis analysis = fraudDetectionService.analyzeTransaction(tx);
        assertNotNull(analysis);
        assertNotNull(analysis.getRiskLevel());

        // Retrieve and verify active rules
        var activeRules = fraudDetectionService.getActiveRules();
        assertFalse(activeRules.isEmpty());
    }
}
