package com.fraud.task;

import com.fraud.collection.FraudStatistics;
import com.fraud.exception.DatabaseException;
import com.fraud.model.RiskAnalysis;
import com.fraud.model.Transaction;
import com.fraud.model.TransactionProcessingResult;
import com.fraud.service.TransactionManagementService;

import java.util.Objects;
import java.util.concurrent.Callable;

/**
 * Callable task representing concurrent analysis and atomic persistence of an individual transaction.
 *
 * Demonstrates:
 * - Implementation of java.util.concurrent.Callable<T>
 * - Delegation of actual business logic to TransactionManagementService (no duplicate logic)
 * - Safe concurrent updates to shared FraudStatistics
 * - Encapsulation of processing diagnostics and error propagation via TransactionProcessingResult
 */
public class TransactionAnalysisTask implements Callable<TransactionProcessingResult> {

    private final Transaction transaction;
    private final RiskAnalysis riskAnalysis;
    private final TransactionManagementService transactionManagementService;
    private final FraudStatistics sharedStatistics;

    public TransactionAnalysisTask(Transaction transaction,
                                   RiskAnalysis riskAnalysis,
                                   TransactionManagementService transactionManagementService,
                                   FraudStatistics sharedStatistics) {
        this.transaction = Objects.requireNonNull(transaction, "transaction must not be null");
        this.riskAnalysis = riskAnalysis; // can be null (defaults to clean approval in service)
        this.transactionManagementService = Objects.requireNonNull(transactionManagementService, "transactionManagementService must not be null");
        this.sharedStatistics = sharedStatistics; // can be null if statistics tracking is optional
    }

    @Override
    public TransactionProcessingResult call() throws Exception {
        long startTime = System.currentTimeMillis();
        String refId = transaction.getReferenceId();

        try {
            // Process the transaction through Phase 6 ACID workflow (own connection & rollback on failure)
            Transaction processed = transactionManagementService.processTransactionWithRiskAssessment(transaction, riskAnalysis);

            // Safely record metrics in the shared thread-safe FraudStatistics
            if (sharedStatistics != null) {
                sharedStatistics.recordTransaction(processed);
            }

            long elapsed = System.currentTimeMillis() - startTime;
            return TransactionProcessingResult.success(
                    processed.getId(),
                    processed.getReferenceId(),
                    processed.getStatus(),
                    riskAnalysis,
                    elapsed
            );

        } catch (DatabaseException e) {
            long elapsed = System.currentTimeMillis() - startTime;
            // Return failure result capturing error diagnostic, or rethrow if strict propagation is desired
            return TransactionProcessingResult.failure(refId, e.getMessage(), elapsed);
        } catch (Exception e) {
            long elapsed = System.currentTimeMillis() - startTime;
            return TransactionProcessingResult.failure(refId, "Unexpected error: " + e.getMessage(), elapsed);
        }
    }

    public Transaction getTransaction() {
        return transaction;
    }

    public RiskAnalysis getRiskAnalysis() {
        return riskAnalysis;
    }
}
