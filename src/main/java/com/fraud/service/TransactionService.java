package com.fraud.service;

import com.fraud.collection.FraudStatistics;
import com.fraud.dao.TransactionDAO;
import com.fraud.dao.UserDAO;
import com.fraud.exception.DatabaseException;
import com.fraud.exception.FraudDetectionException;
import com.fraud.exception.ValidationException;
import com.fraud.model.Customer;
import com.fraud.model.RiskAnalysis;
import com.fraud.model.RiskLevel;
import com.fraud.model.Transaction;
import com.fraud.model.TransactionStatus;
import com.fraud.model.TransactionType;
import com.fraud.model.User;

import java.math.BigDecimal;
import java.util.List;
import java.util.Objects;
import java.util.Optional;
import java.util.logging.Level;
import java.util.logging.Logger;

/**
 * High-level business service orchestrating the complete financial transaction lifecycle.
 *
 * Demonstrates:
 * - End-to-End Enterprise Business Workflow:
 *   Input -> Validation -> Customer & Balance Verification -> Fraud Detection Analysis
 *   -> Atomic JDBC Persistence (Transaction, Alerts, Fraud Case) -> Balance Debit/Credit -> In-Memory Tracker Updates
 * - Complete coordination between:
 *   - {@link FraudDetectionService} (Phase 8 engine & Phase 4 collections)
 *   - {@link TransactionManagementService} (Phase 6 ACID unit of work)
 *   - {@link UserService} (Customer balance adjustments)
 *   - {@link FraudStatistics} (Real-time thread-safe metrics)
 */
public class TransactionService {

    private static final Logger logger = Logger.getLogger(TransactionService.class.getName());

    private final TransactionDAO transactionDAO;
    private final UserDAO userDAO;
    private final FraudDetectionService fraudDetectionService;
    private final TransactionManagementService transactionManagementService;
    private final UserService userService;
    private final FraudStatistics fraudStatistics;

    public TransactionService() {
        this(new TransactionDAO(),
             new UserDAO(),
             new FraudDetectionService(),
             new TransactionManagementService(),
             new UserService(),
             new FraudStatistics());
    }

    public TransactionService(TransactionDAO transactionDAO,
                              UserDAO userDAO,
                              FraudDetectionService fraudDetectionService,
                              TransactionManagementService transactionManagementService,
                              UserService userService,
                              FraudStatistics fraudStatistics) {
        this.transactionDAO = Objects.requireNonNull(transactionDAO, "transactionDAO must not be null");
        this.userDAO = Objects.requireNonNull(userDAO, "userDAO must not be null");
        this.fraudDetectionService = Objects.requireNonNull(fraudDetectionService, "fraudDetectionService must not be null");
        this.transactionManagementService = Objects.requireNonNull(transactionManagementService, "transactionManagementService must not be null");
        this.userService = Objects.requireNonNull(userService, "userService must not be null");
        this.fraudStatistics = Objects.requireNonNull(fraudStatistics, "fraudStatistics must not be null");
    }

    /**
     * Executes the complete end-to-end transaction processing business workflow:
     * 1. Validates all business inputs (amount, sender, recipient, user).
     * 2. Verifies customer existence and checks available funds if withdrawal/transfer/payment.
     * 3. Evaluates fraud risk via {@link FraudDetectionService} using Phase 8's {@link com.fraud.strategy.FraudDetectionEngine}.
     * 4. Persists the transaction, alerts, and fraud cases atomically via {@link TransactionManagementService}.
     * 5. If approved, adjusts customer balance.
     * 6. Updates temporal in-memory baselines and shared {@link FraudStatistics}.
     *
     * @param transaction candidate transaction
     * @return the processed and persisted {@link Transaction}
     * @throws ValidationException on invalid input parameters or insufficient balance
     * @throws FraudDetectionException on risk evaluation errors
     * @throws DatabaseException on database or transaction failure
     */
    public Transaction processTransaction(Transaction transaction)
            throws ValidationException, FraudDetectionException, DatabaseException {

        // Step 1: Input Validation
        validateTransactionInput(transaction);

        // Step 2: Customer validation and balance sufficiency check
        Optional<User> userOpt = userDAO.findById(transaction.getUserId());
        if (userOpt.isEmpty() || !(userOpt.get() instanceof Customer)) {
            throw new ValidationException("Sender customer not found with ID: " + transaction.getUserId());
        }
        Customer customer = (Customer) userOpt.get();

        // Check funds for debit transactions
        if (transaction.getTransactionType() != TransactionType.DEPOSIT) {
            if (customer.getBalance().compareTo(transaction.getAmount()) < 0) {
                throw new ValidationException(String.format("Insufficient balance: account has ₹%.2f, transaction requires ₹%.2f",
                        customer.getBalance().doubleValue(), transaction.getAmount().doubleValue()));
            }
        }

        // Step 3: Run Real Fraud Detection Engine analysis
        RiskAnalysis riskAnalysis = fraudDetectionService.analyzeTransaction(transaction);

        // Step 4: Atomic JDBC Transaction Execution (save tx PENDING -> save alerts/case -> update status -> commit)
        Transaction processed = transactionManagementService.processTransactionWithRiskAssessment(transaction, riskAnalysis);

        // Step 5: If APPROVED, adjust account balance
        if (processed.getStatus() == TransactionStatus.APPROVED) {
            BigDecimal delta = (processed.getTransactionType() == TransactionType.DEPOSIT)
                    ? processed.getAmount()
                    : processed.getAmount().negate();
            try {
                userService.updateBalance(customer.getId(), delta);
            } catch (ValidationException e) {
                logger.log(Level.WARNING, "Failed to update balance after transaction approval: " + e.getMessage());
            }
        }

        // Step 6: Update temporal in-memory collection baselines & thread-safe statistics
        fraudDetectionService.recordBaseline(processed);
        fraudStatistics.recordTransaction(processed);

        return processed;
    }

    /**
     * Retrieves a transaction by its primary key ID.
     */
    public Optional<Transaction> getTransactionById(long id) throws DatabaseException {
        return transactionDAO.findById(id);
    }

    /**
     * Retrieves a transaction by its unique reference ID.
     */
    public Optional<Transaction> getTransactionByReferenceId(String refId) throws DatabaseException {
        if (refId == null || refId.trim().isEmpty()) {
            return Optional.empty();
        }
        return transactionDAO.findByReferenceId(refId.trim());
    }

    /**
     * Retrieves all transactions for a customer in reverse chronological order.
     */
    public List<Transaction> getTransactionsByUserId(long userId) throws DatabaseException {
        return transactionDAO.findByUserId(userId);
    }

    /**
     * Retrieves the most recent transactions for a customer limited by count.
     */
    public List<Transaction> getRecentTransactions(long userId, int limit) throws DatabaseException {
        return transactionDAO.findRecentByUserId(userId, limit);
    }

    /**
     * Retrieves transactions by compliance status.
     */
    public List<Transaction> getTransactionsByStatus(TransactionStatus status) throws DatabaseException {
        return transactionDAO.findByStatus(status);
    }

    /**
     * Retrieves all transactions in the system.
     */
    public List<Transaction> getAllTransactions() throws DatabaseException {
        return transactionDAO.findAll();
    }

    public FraudStatistics getFraudStatistics() {
        return fraudStatistics;
    }

    public FraudDetectionService getFraudDetectionService() {
        return fraudDetectionService;
    }

    private void validateTransactionInput(Transaction tx) throws ValidationException {
        if (tx == null) {
            throw new ValidationException("Transaction cannot be null");
        }
        if (tx.getUserId() == null || tx.getUserId() <= 0) {
            throw new ValidationException("Valid customer userId is required");
        }
        if (tx.getAmount() == null || tx.getAmount().compareTo(BigDecimal.ZERO) <= 0) {
            throw new ValidationException("Transaction amount must be strictly positive");
        }
        if (tx.getSenderAccount() == null || tx.getSenderAccount().trim().isEmpty()) {
            throw new ValidationException("Sender account is required");
        }
        if (tx.getRecipientAccount() == null || tx.getRecipientAccount().trim().isEmpty()) {
            throw new ValidationException("Recipient account is required");
        }
        if (tx.getTransactionType() == null) {
            throw new ValidationException("Transaction type is required");
        }
        if (tx.getLocation() == null || tx.getLocation().trim().isEmpty()) {
            throw new ValidationException("Transaction location is required");
        }
    }
}
