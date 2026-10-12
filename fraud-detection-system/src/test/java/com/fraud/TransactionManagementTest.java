package com.fraud;

import com.fraud.dao.FraudAlertDAO;
import com.fraud.dao.FraudCaseDAO;
import com.fraud.dao.TransactionDAO;
import com.fraud.exception.DatabaseException;
import com.fraud.model.CaseStatus;
import com.fraud.model.FraudAlert;
import com.fraud.model.FraudCase;
import com.fraud.model.RiskAnalysis;
import com.fraud.model.RiskLevel;
import com.fraud.model.Transaction;
import com.fraud.model.TransactionStatus;
import com.fraud.model.TransactionType;
import com.fraud.service.TransactionManagementService;
import com.fraud.util.DatabaseConnection;
import org.junit.jupiter.api.BeforeAll;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

import java.math.BigDecimal;
import java.sql.Connection;
import java.sql.SQLException;
import java.util.ArrayList;
import java.util.Collections;
import java.util.HashSet;
import java.util.List;
import java.util.Optional;
import java.util.Set;

import static org.junit.jupiter.api.Assertions.*;

/**
 * Phase 6 Tests verifying JDBC Transaction Management and ACID guarantees.
 * Tests:
 * 1. Successful commit with clean risk assessment (transaction APPROVED, no alerts/cases)
 * 2. Successful commit with suspicious risk assessment (transaction FLAGGED, alerts created, case opened)
 * 3. Successful commit with critical risk assessment (transaction BLOCKED, alerts created, case opened)
 * 4. Rollback on database failure (guaranteeing transaction and alerts are not partially persisted)
 * 5. Database consistency remains intact after rollback
 * 6. Batch atomic transaction commit and rollback
 */
public class TransactionManagementTest {

    private static TransactionManagementService transactionService;
    private static TransactionDAO transactionDAO;
    private static FraudCaseDAO fraudCaseDAO;
    private static FraudAlertDAO fraudAlertDAO;

    @BeforeAll
    static void setup() throws SQLException {
        DatabaseConnection.getConnection().close();
        transactionDAO = new TransactionDAO();
        fraudCaseDAO = new FraudCaseDAO();
        fraudAlertDAO = new FraudAlertDAO();
        transactionService = new TransactionManagementService(transactionDAO, fraudCaseDAO, fraudAlertDAO);
    }

    @Test
    @DisplayName("Transaction Management: Successful Commit - Clean Transaction Approved")
    void testSuccessfulCommitCleanTransaction() throws DatabaseException {
        String refId = "TX-CLEAN-" + System.currentTimeMillis();
        Transaction tx = new Transaction(2L, "ACC-98421001", "ACC-MERCHANT",
                new BigDecimal("150.00"), TransactionType.PURCHASE, "New York, USA");
        tx.setReferenceId(refId);

        RiskAnalysis cleanAnalysis = RiskAnalysis.clean();

        Transaction processed = transactionService.processTransactionWithRiskAssessment(tx, cleanAnalysis);

        assertNotNull(processed.getId());
        assertEquals(TransactionStatus.APPROVED, processed.getStatus());
        assertEquals(0, processed.getRiskScore());
        assertEquals(RiskLevel.LOW, processed.getRiskLevel());

        // Verify DB state
        Optional<Transaction> fromDb = transactionDAO.findById(processed.getId());
        assertTrue(fromDb.isPresent());
        assertEquals(TransactionStatus.APPROVED, fromDb.get().getStatus());

        // Verify no alerts or cases were generated
        List<FraudAlert> alerts = fraudAlertDAO.findAlertsByTransactionId(processed.getId());
        assertTrue(alerts.isEmpty());

        Optional<FraudCase> fCase = fraudCaseDAO.findByTransactionId(processed.getId());
        assertFalse(fCase.isPresent());
    }

    @Test
    @DisplayName("Transaction Management: Successful Commit - Suspicious Transaction Flagged with Alerts & Case")
    void testSuccessfulCommitSuspiciousTransaction() throws DatabaseException {
        String refId = "TX-FLAGGED-" + System.currentTimeMillis();
        Transaction tx = new Transaction(2L, "ACC-98421001", "ACC-UNKNOWN",
                new BigDecimal("55000.00"), TransactionType.TRANSFER, "Singapore");
        tx.setReferenceId(refId);

        Set<String> triggeredRules = new HashSet<>();
        triggeredRules.add("HIGH_AMOUNT");
        triggeredRules.add("UNUSUAL_LOCATION");

        List<String> reasons = List.of("Amount exceeds 50000 limit", "Originating location unfamiliar");

        // Risk score 65 -> HIGH -> FLAGGED
        RiskAnalysis riskAnalysis = new RiskAnalysis(65, RiskLevel.HIGH, triggeredRules, reasons);

        Transaction processed = transactionService.processTransactionWithRiskAssessment(tx, riskAnalysis);

        assertNotNull(processed.getId());
        assertEquals(TransactionStatus.FLAGGED, processed.getStatus());
        assertEquals(65, processed.getRiskScore());
        assertEquals(RiskLevel.HIGH, processed.getRiskLevel());

        // Verify Transaction in DB
        Optional<Transaction> fromDb = transactionDAO.findById(processed.getId());
        assertTrue(fromDb.isPresent());
        assertEquals(TransactionStatus.FLAGGED, fromDb.get().getStatus());

        // Verify Alerts persisted in same transaction
        List<FraudAlert> alerts = fraudAlertDAO.findAlertsByTransactionId(processed.getId());
        assertEquals(2, alerts.size());

        // Verify FraudCase opened in same transaction
        Optional<FraudCase> fCase = fraudCaseDAO.findByTransactionId(processed.getId());
        assertTrue(fCase.isPresent());
        assertEquals(CaseStatus.INVESTIGATING, fCase.get().getStatus());
        assertEquals(65, fCase.get().getRiskScore());
        assertEquals(2L, fCase.get().getUserId());
    }

    @Test
    @DisplayName("Transaction Management: Successful Commit - Critical Transaction Blocked")
    void testSuccessfulCommitBlockedTransaction() throws DatabaseException {
        String refId = "TX-BLOCKED-" + System.currentTimeMillis();
        Transaction tx = new Transaction(3L, "ACC-98421002", "ACC-SUSPECT",
                new BigDecimal("120000.00"), TransactionType.TRANSFER, "Lagos, Nigeria");
        tx.setReferenceId(refId);

        Set<String> rules = Set.of("HIGH_AMOUNT", "RAPID_TRANSACTIONS", "UNUSUAL_LOCATION");
        List<String> reasons = List.of("Massive amount spike", "Velocity spike detected", "High risk foreign geo");

        // Score 90 -> CRITICAL -> BLOCKED
        RiskAnalysis riskAnalysis = new RiskAnalysis(90, RiskLevel.CRITICAL, rules, reasons);

        Transaction processed = transactionService.processTransactionWithRiskAssessment(tx, riskAnalysis);

        assertNotNull(processed.getId());
        assertEquals(TransactionStatus.BLOCKED, processed.getStatus());
        assertEquals(90, processed.getRiskScore());

        // Verify FraudCase in OPEN status for emergency review
        Optional<FraudCase> fCase = fraudCaseDAO.findByTransactionId(processed.getId());
        assertTrue(fCase.isPresent());
        assertEquals(CaseStatus.OPEN, fCase.get().getStatus());
    }

    @Test
    @DisplayName("Transaction Management: Rollback on Failure & State Consistency")
    void testRollbackOnFailure() throws DatabaseException {
        // Attempt to create a transaction referencing a non-existent foreign key (user_id = 99999999)
        // Foreign key constraint will fail on insert, triggering catch block and rollback()
        String refId = "TX-FAIL-" + System.currentTimeMillis();
        Transaction invalidTx = new Transaction(99999999L, "ACC-NONEXISTENT", "ACC-DEST",
                new BigDecimal("500.00"), TransactionType.TRANSFER, "Chicago, USA");
        invalidTx.setReferenceId(refId);

        RiskAnalysis analysis = RiskAnalysis.clean();

        assertThrows(DatabaseException.class, () -> {
            transactionService.processTransactionWithRiskAssessment(invalidTx, analysis);
        });

        // Verify the transaction was rolled back and does not exist in DB
        Optional<Transaction> fromDb = transactionDAO.findByReferenceId(refId);
        assertFalse(fromDb.isPresent(), "Rolled back transaction must not exist in database");
    }

    @Test
    @DisplayName("Transaction Management: Batch Atomic Commit & Rollback")
    void testBatchTransactionAtomicity() throws DatabaseException {
        long countBefore = transactionDAO.count();

        // 1. Successful batch of 3 transactions
        List<Transaction> batch = new ArrayList<>();
        for (int i = 0; i < 3; i++) {
            Transaction tx = new Transaction(2L, "ACC-98421001", "ACC-RECP-" + i,
                    new BigDecimal("10.00"), TransactionType.PAYMENT, "London");
            tx.setReferenceId("TX-BATCH-OK-" + i + "-" + System.currentTimeMillis());
            batch.add(tx);
        }

        List<Transaction> saved = transactionService.processBatchTransactions(batch);
        assertEquals(3, saved.size());
        assertEquals(countBefore + 3, transactionDAO.count());

        // 2. Failing batch: first 2 valid, 3rd invalid (bad foreign key)
        long countBeforeFail = transactionDAO.count();
        List<Transaction> failingBatch = new ArrayList<>();
        failingBatch.add(new Transaction(2L, "A", "B", new BigDecimal("10"), TransactionType.TRANSFER, "Paris"));
        failingBatch.add(new Transaction(2L, "A", "C", new BigDecimal("20"), TransactionType.TRANSFER, "Paris"));
        // Invalid transaction with non-existent foreign key
        Transaction badTx = new Transaction(88888888L, "A", "D", new BigDecimal("30"), TransactionType.TRANSFER, "Paris");
        failingBatch.add(badTx);

        assertThrows(DatabaseException.class, () -> {
            transactionService.processBatchTransactions(failingBatch);
        });

        // Verify all 3 in failing batch were rolled back (count remains unchanged)
        assertEquals(countBeforeFail, transactionDAO.count(), "Failed batch must completely roll back without partial insertions");
    }
}
