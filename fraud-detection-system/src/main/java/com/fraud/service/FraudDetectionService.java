package com.fraud.service;

import com.fraud.collection.GeoIpTracker;
import com.fraud.collection.SlidingWindowTransactionTracker;
import com.fraud.collection.TransactionHistoryLedger;
import com.fraud.dao.FraudRuleDAO;
import com.fraud.dao.TransactionDAO;
import com.fraud.dao.UserDAO;
import com.fraud.exception.DatabaseException;
import com.fraud.exception.FraudDetectionException;
import com.fraud.exception.ValidationException;
import com.fraud.model.Customer;
import com.fraud.model.FraudRule;
import com.fraud.model.RiskAnalysis;
import com.fraud.model.Transaction;
import com.fraud.model.User;
import com.fraud.strategy.FraudDetectionEngine;
import com.fraud.strategy.FraudDetectionStrategy;

import java.math.BigDecimal;
import java.util.List;
import java.util.Objects;
import java.util.Optional;

/**
 * Service managing fraud detection analysis, historical baseline synchronization,
 * and rule lifecycle management.
 *
 * Demonstrates:
 * - Enterprise Layered Architecture (Service orchestrating Engine and Repositories)
 * - Integration of Phase 4 Collections (Sliding window, Ledger, Geo/IP tracking)
 * - Integration of Phase 8 {@link FraudDetectionStrategy}
 * - Real-time synchronization of customer transaction baselines
 */
public class FraudDetectionService {

    private final FraudRuleDAO fraudRuleDAO;
    private final TransactionDAO transactionDAO;
    private final UserDAO userDAO;
    private final FraudDetectionStrategy detectionStrategy;

    // Temporal in-memory collection trackers
    private final SlidingWindowTransactionTracker slidingTracker;
    private final GeoIpTracker geoIpTracker;
    private final TransactionHistoryLedger historyLedger;

    public FraudDetectionService() {
        this(new FraudRuleDAO(), new TransactionDAO(), new UserDAO());
    }

    public FraudDetectionService(FraudRuleDAO fraudRuleDAO, TransactionDAO transactionDAO, UserDAO userDAO) {
        this.fraudRuleDAO = Objects.requireNonNull(fraudRuleDAO, "fraudRuleDAO must not be null");
        this.transactionDAO = Objects.requireNonNull(transactionDAO, "transactionDAO must not be null");
        this.userDAO = Objects.requireNonNull(userDAO, "userDAO must not be null");

        // Load active rules from DB or fallback to default rules
        List<FraudRule> activeRules;
        try {
            activeRules = fraudRuleDAO.findAllActiveRules();
            if (activeRules.isEmpty()) {
                activeRules = FraudDetectionEngine.createDefaultRules();
            }
        } catch (DatabaseException e) {
            activeRules = FraudDetectionEngine.createDefaultRules();
        }

        this.detectionStrategy = new FraudDetectionEngine(activeRules);
        this.slidingTracker = new SlidingWindowTransactionTracker(5 * 60 * 1000L); // 5 minutes
        this.geoIpTracker = new GeoIpTracker();
        this.historyLedger = new TransactionHistoryLedger();

        // Warm up in-memory baseline from historical database transactions
        warmUpHistoryFromDatabase();
    }

    public FraudDetectionService(FraudRuleDAO fraudRuleDAO,
                                 TransactionDAO transactionDAO,
                                 UserDAO userDAO,
                                 FraudDetectionStrategy detectionStrategy,
                                 SlidingWindowTransactionTracker slidingTracker,
                                 GeoIpTracker geoIpTracker,
                                 TransactionHistoryLedger historyLedger) {
        this.fraudRuleDAO = Objects.requireNonNull(fraudRuleDAO, "fraudRuleDAO must not be null");
        this.transactionDAO = Objects.requireNonNull(transactionDAO, "transactionDAO must not be null");
        this.userDAO = Objects.requireNonNull(userDAO, "userDAO must not be null");
        this.detectionStrategy = Objects.requireNonNull(detectionStrategy, "detectionStrategy must not be null");
        this.slidingTracker = Objects.requireNonNull(slidingTracker, "slidingTracker must not be null");
        this.geoIpTracker = Objects.requireNonNull(geoIpTracker, "geoIpTracker must not be null");
        this.historyLedger = Objects.requireNonNull(historyLedger, "historyLedger must not be null");
    }

    /**
     * Warms up in-memory historical baselines from database upon initialization.
     */
    private void warmUpHistoryFromDatabase() {
        try {
            List<Transaction> all = transactionDAO.findAll();
            for (Transaction tx : all) {
                recordBaseline(tx);
            }
        } catch (DatabaseException ignored) {
            // Graceful fallback: startup with empty baselines if database not yet initialized
        }
    }

    /**
     * Evaluates a candidate transaction against configured fraud rules and customer history.
     *
     * @param transaction the candidate financial transaction
     * @return immutable {@link RiskAnalysis} outcome
     * @throws ValidationException if input parameters are invalid
     * @throws FraudDetectionException if error occurs during evaluation
     */
    public RiskAnalysis analyzeTransaction(Transaction transaction) throws ValidationException, FraudDetectionException {
        if (transaction == null) {
            throw new ValidationException("Transaction cannot be null for fraud analysis");
        }
        if (transaction.getAmount() == null || transaction.getAmount().compareTo(BigDecimal.ZERO) <= 0) {
            throw new ValidationException("Transaction amount must be strictly positive");
        }
        if (transaction.getUserId() == null) {
            throw new ValidationException("Transaction userId is required for fraud analysis");
        }

        Customer customer = null;
        try {
            Optional<User> userOpt = userDAO.findById(transaction.getUserId());
            if (userOpt.isPresent() && userOpt.get() instanceof Customer) {
                customer = (Customer) userOpt.get();
            }
        } catch (DatabaseException e) {
            throw new FraudDetectionException("Failed to load customer profile context: " + e.getMessage(), e);
        }

        try {
            return detectionStrategy.analyze(transaction, customer, historyLedger, slidingTracker, geoIpTracker);
        } catch (Exception e) {
            throw new FraudDetectionException("Fraud analysis failed: " + e.getMessage(), e);
        }
    }

    /**
     * Records a transaction into in-memory temporal baselines (sliding window, ledger, geo tracker).
     */
    public void recordBaseline(Transaction transaction) {
        if (transaction != null && transaction.getUserId() != null) {
            slidingTracker.recordTransaction(transaction);
            historyLedger.appendTransaction(transaction);
            geoIpTracker.recordOrigin(transaction);
        }
    }

    /**
     * Retrieves all active rules configured in the database.
     */
    public List<FraudRule> getActiveRules() throws DatabaseException {
        return fraudRuleDAO.findAllActiveRules();
    }

    /**
     * Retrieves all rules configured in the database.
     */
    public List<FraudRule> getAllRules() throws DatabaseException {
        return fraudRuleDAO.findAll();
    }

    /**
     * Updates an existing fraud rule's weight, threshold, or active status.
     */
    public FraudRule updateRule(FraudRule rule) throws ValidationException, DatabaseException {
        if (rule == null || rule.getId() == null) {
            throw new ValidationException("FraudRule and ID are required for update");
        }
        if (rule.getWeight() < 0 || rule.getWeight() > 100) {
            throw new ValidationException("Rule weight must be between 0 and 100");
        }
        if (rule.getThresholdValue() < 0) {
            throw new ValidationException("Threshold value cannot be negative");
        }
        return fraudRuleDAO.update(rule);
    }

    public SlidingWindowTransactionTracker getSlidingTracker() {
        return slidingTracker;
    }

    public GeoIpTracker getGeoIpTracker() {
        return geoIpTracker;
    }

    public TransactionHistoryLedger getHistoryLedger() {
        return historyLedger;
    }

    public FraudDetectionStrategy getDetectionStrategy() {
        return detectionStrategy;
    }
}
