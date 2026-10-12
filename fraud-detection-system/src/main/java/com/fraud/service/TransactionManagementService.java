package com.fraud.service;

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
import com.fraud.util.DatabaseConnection;

import java.sql.Connection;
import java.sql.SQLException;
import java.util.ArrayList;
import java.util.List;
import java.util.Objects;
import java.util.logging.Level;
import java.util.logging.Logger;

/**
 * Service orchestrating ACID JDBC transaction management across multiple DAO operations.
 *
 * Demonstrates:
 * - Enterprise Layered Architecture (Service layer coordinating DAOs)
 * - ACID compliance: Atomic multi-table persistence via caller-owned JDBC Connection
 * - Connection lifecycle: setAutoCommit(false) -> execute operations -> commit()
 * - Failure resilience: rollback() on exception -> restore setAutoCommit(true) in finally block
 * - Centralized transaction boundary without scattering transaction logic in DAOs
 */
public class TransactionManagementService {

    private static final Logger logger = Logger.getLogger(TransactionManagementService.class.getName());

    private final TransactionDAO transactionDAO;
    private final FraudCaseDAO fraudCaseDAO;
    private final FraudAlertDAO fraudAlertDAO;

    public TransactionManagementService() {
        this(new TransactionDAO(), new FraudCaseDAO(), new FraudAlertDAO());
    }

    public TransactionManagementService(TransactionDAO transactionDAO, FraudCaseDAO fraudCaseDAO, FraudAlertDAO fraudAlertDAO) {
        this.transactionDAO = Objects.requireNonNull(transactionDAO, "transactionDAO must not be null");
        this.fraudCaseDAO = Objects.requireNonNull(fraudCaseDAO, "fraudCaseDAO must not be null");
        this.fraudAlertDAO = Objects.requireNonNull(fraudAlertDAO, "fraudAlertDAO must not be null");
    }

    /**
     * Executes the complete transaction workflow within an atomic JDBC transaction:
     * 1. Acquire pooled connection and set autoCommit = false.
     * 2. Insert transaction in PENDING state.
     * 3. Evaluate risk analysis:
     *    - If flagged/suspicious, persist FraudAlert(s) within the ambient connection.
     *    - If high-risk/blocked, persist a FraudCase linked to the transaction within the ambient connection.
     * 4. Update the transaction with calculated risk score, risk level, notes, and final status (APPROVED / FLAGGED / BLOCKED).
     * 5. Commit the transaction.
     * 6. On any SQLException or error: rollback the transaction, clean up, and throw DatabaseException.
     *
     * @param transaction the candidate financial transaction
     * @param riskAnalysis the risk assessment result
     * @return the persisted transaction with generated ID and updated status
     * @throws DatabaseException on failure, guaranteeing complete rollback
     */
    public Transaction processTransactionWithRiskAssessment(Transaction transaction, RiskAnalysis riskAnalysis) throws DatabaseException {
        if (transaction == null) {
            throw new IllegalArgumentException("Transaction cannot be null");
        }

        Connection conn = null;
        boolean originalAutoCommit = true;

        try {
            conn = DatabaseConnection.getConnection();
            originalAutoCommit = conn.getAutoCommit();
            conn.setAutoCommit(false); // Begin caller-owned JDBC transaction

            // Step 1: Save transaction in initial PENDING state
            transaction.setStatus(TransactionStatus.PENDING);
            transaction = transactionDAO.save(transaction, conn);

            // Step 2: Process Risk Assessment and create auxiliary records if necessary
            if (riskAnalysis != null) {
                // Determine final transaction status based on risk assessment
                if (riskAnalysis.isBlocked()) {
                    transaction.setStatus(TransactionStatus.BLOCKED);
                } else if (riskAnalysis.isFlagged()) {
                    transaction.setStatus(TransactionStatus.FLAGGED);
                } else {
                    transaction.setStatus(TransactionStatus.APPROVED);
                }

                transaction.setRiskScore(riskAnalysis.getRiskScore());
                transaction.setRiskLevel(riskAnalysis.getRiskLevel());

                if (!riskAnalysis.getReasons().isEmpty()) {
                    transaction.setNotes(String.join("; ", riskAnalysis.getReasons()));
                }

                // Create Fraud Alerts for triggered rules
                for (String ruleCode : riskAnalysis.getTriggeredRules()) {
                    FraudAlert alert = new FraudAlert(
                            transaction.getId(),
                            ruleCode,
                            riskAnalysis.getRiskLevel(),
                            "Rule [" + ruleCode + "] triggered with score contribution " + riskAnalysis.getRiskScore()
                    );
                    fraudAlertDAO.save(alert, conn);
                }

                // If flagged or blocked, automatically open a FraudCase
                if (riskAnalysis.isBlocked() || riskAnalysis.isFlagged()) {
                    String reason = riskAnalysis.getReasons().isEmpty()
                            ? "Suspicious transaction detected with risk score " + riskAnalysis.getRiskScore()
                            : String.join("; ", riskAnalysis.getReasons());

                    FraudCase fraudCase = new FraudCase(
                            transaction.getId(),
                            transaction.getUserId(),
                            riskAnalysis.getRiskScore(),
                            reason
                    );
                    fraudCase.setStatus(riskAnalysis.isBlocked() ? CaseStatus.OPEN : CaseStatus.INVESTIGATING);
                    fraudCaseDAO.save(fraudCase, conn);
                }

                // Step 3: Update the transaction record with final status and score
                transaction = transactionDAO.update(transaction, conn);
            } else {
                // If no risk analysis provided, default to APPROVED
                transaction.setStatus(TransactionStatus.APPROVED);
                transaction = transactionDAO.update(transaction, conn);
            }

            // Step 4: Commit all operations atomically
            conn.commit();
            logger.log(Level.INFO, "Transaction {0} committed successfully with status {1}",
                    new Object[]{transaction.getReferenceId(), transaction.getStatus()});

            return transaction;

        } catch (Exception e) {
            // Step 5: Rollback on any failure
            if (conn != null) {
                try {
                    conn.rollback();
                    logger.log(Level.WARNING, "Transaction rolled back due to error: " + e.getMessage());
                } catch (SQLException rollbackEx) {
                    logger.log(Level.SEVERE, "Failed to rollback transaction", rollbackEx);
                }
            }
            if (e instanceof DatabaseException) {
                throw (DatabaseException) e;
            }
            throw new DatabaseException("Failed to process transaction atomically: " + e.getMessage(), e);

        } finally {
            // Step 6: Restore connection autoCommit state and return to pool
            if (conn != null) {
                try {
                    conn.setAutoCommit(originalAutoCommit);
                } catch (SQLException e) {
                    logger.log(Level.WARNING, "Failed to reset connection autoCommit", e);
                }
                DatabaseConnection.closeConnection(conn);
            }
        }
    }

    /**
     * Batch processes multiple transactions within a single atomic JDBC transaction.
     * If any transaction fails, the entire batch is rolled back.
     */
    public List<Transaction> processBatchTransactions(List<Transaction> transactions) throws DatabaseException {
        if (transactions == null || transactions.isEmpty()) {
            return List.of();
        }

        Connection conn = null;
        boolean originalAutoCommit = true;
        List<Transaction> savedList = new ArrayList<>();

        try {
            conn = DatabaseConnection.getConnection();
            originalAutoCommit = conn.getAutoCommit();
            conn.setAutoCommit(false);

            for (Transaction tx : transactions) {
                tx.setStatus(TransactionStatus.APPROVED);
                Transaction saved = transactionDAO.save(tx, conn);
                savedList.add(saved);
            }

            conn.commit();
            return savedList;

        } catch (Exception e) {
            if (conn != null) {
                try {
                    conn.rollback();
                } catch (SQLException ex) {
                    logger.log(Level.SEVERE, "Failed to rollback batch transaction", ex);
                }
            }
            throw new DatabaseException("Batch transaction failed and was rolled back: " + e.getMessage(), e);

        } finally {
            if (conn != null) {
                try {
                    conn.setAutoCommit(originalAutoCommit);
                } catch (SQLException e) {
                    logger.log(Level.WARNING, "Failed to reset autoCommit", e);
                }
                DatabaseConnection.closeConnection(conn);
            }
        }
    }
}
