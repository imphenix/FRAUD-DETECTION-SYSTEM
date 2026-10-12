package com.fraud.service;

import com.fraud.collection.FraudStatistics;
import com.fraud.model.RiskAnalysis;
import com.fraud.model.Transaction;
import com.fraud.model.TransactionProcessingResult;
import com.fraud.task.TransactionAnalysisTask;

import java.util.ArrayList;
import java.util.List;
import java.util.Objects;
import java.util.concurrent.Callable;
import java.util.concurrent.ExecutionException;
import java.util.concurrent.ExecutorService;
import java.util.concurrent.Executors;
import java.util.concurrent.Future;
import java.util.concurrent.RejectedExecutionException;
import java.util.concurrent.TimeUnit;
import java.util.concurrent.TimeoutException;
import java.util.logging.Level;
import java.util.logging.Logger;

/**
 * Service managing concurrent transaction processing using a bounded thread pool.
 *
 * Demonstrates:
 * - Enterprise Concurrency Architecture
 * - Bounded thread pool management via java.util.concurrent.ExecutorService (newFixedThreadPool)
 * - Future-based asynchronous result collection
 * - Proper lifecycle termination (shutdown, awaitTermination, shutdownNow)
 * - Safe concurrent updates to thread-safe shared FraudStatistics
 * - Independent ACID transaction boundaries per worker thread
 */
public class FraudMonitoringService {

    private static final Logger logger = Logger.getLogger(FraudMonitoringService.class.getName());
    public static final int DEFAULT_THREAD_POOL_SIZE = 4;

    private final ExecutorService executorService;
    private final TransactionManagementService transactionManagementService;
    private final FraudStatistics sharedStatistics;
    private final int threadPoolSize;

    public FraudMonitoringService() {
        this(DEFAULT_THREAD_POOL_SIZE, new TransactionManagementService(), new FraudStatistics());
    }

    public FraudMonitoringService(int threadPoolSize) {
        this(threadPoolSize, new TransactionManagementService(), new FraudStatistics());
    }

    public FraudMonitoringService(int threadPoolSize,
                                  TransactionManagementService transactionManagementService,
                                  FraudStatistics sharedStatistics) {
        if (threadPoolSize <= 0) {
            throw new IllegalArgumentException("Thread pool size must be greater than 0");
        }
        this.threadPoolSize = threadPoolSize;
        this.executorService = Executors.newFixedThreadPool(threadPoolSize);
        this.transactionManagementService = Objects.requireNonNull(transactionManagementService, "transactionManagementService cannot be null");
        this.sharedStatistics = Objects.requireNonNull(sharedStatistics, "sharedStatistics cannot be null");
    }

    /**
     * Submits a single transaction for asynchronous processing.
     *
     * @param transaction candidate transaction
     * @param riskAnalysis risk analysis parameters
     * @return Future containing the processing result
     * @throws RejectedExecutionException if the executor has been shut down
     */
    public Future<TransactionProcessingResult> submitTransaction(Transaction transaction, RiskAnalysis riskAnalysis) {
        TransactionAnalysisTask task = new TransactionAnalysisTask(
                transaction,
                riskAnalysis,
                transactionManagementService,
                sharedStatistics
        );
        return executorService.submit(task);
    }

    /**
     * Submits an arbitrary Callable task to the bounded thread pool.
     */
    public <T> Future<T> submitTask(Callable<T> task) {
        return executorService.submit(task);
    }

    /**
     * Submits a batch of transactions to be analyzed concurrently by the thread pool,
     * waits for all tasks to complete, and returns the list of collected results.
     *
     * Note: Concurrency enables high throughput where each transaction maintains its
     * own ACID boundary via TransactionManagementService.
     *
     * @param tasks list of transaction-analysis pairs
     * @return list of collected TransactionProcessingResult objects
     * @throws InterruptedException if current thread is interrupted while waiting
     */
    public List<TransactionProcessingResult> processTransactionsConcurrently(List<TransactionTaskItem> tasks) throws InterruptedException {
        if (tasks == null || tasks.isEmpty()) {
            return List.of();
        }

        List<Future<TransactionProcessingResult>> futures = new ArrayList<>(tasks.size());

        for (TransactionTaskItem item : tasks) {
            futures.add(submitTransaction(item.getTransaction(), item.getRiskAnalysis()));
        }

        List<TransactionProcessingResult> results = new ArrayList<>(futures.size());

        for (Future<TransactionProcessingResult> future : futures) {
            try {
                results.add(future.get());
            } catch (ExecutionException e) {
                logger.log(Level.SEVERE, "ExecutionException in worker thread: " + e.getMessage(), e);
                results.add(TransactionProcessingResult.failure("UNKNOWN", "Task execution failed: " + e.getCause().getMessage(), 0));
            } catch (InterruptedException e) {
                Thread.currentThread().interrupt();
                logger.log(Level.WARNING, "Thread interrupted while awaiting future result", e);
                throw e;
            }
        }

        return results;
    }

    /**
     * Helper item wrapping a Transaction and its RiskAnalysis for concurrent submission.
     */
    public static class TransactionTaskItem {
        private final Transaction transaction;
        private final RiskAnalysis riskAnalysis;

        public TransactionTaskItem(Transaction transaction, RiskAnalysis riskAnalysis) {
            this.transaction = transaction;
            this.riskAnalysis = riskAnalysis;
        }

        public Transaction getTransaction() {
            return transaction;
        }

        public RiskAnalysis getRiskAnalysis() {
            return riskAnalysis;
        }
    }

    public FraudStatistics getSharedStatistics() {
        return sharedStatistics;
    }

    public int getThreadPoolSize() {
        return threadPoolSize;
    }

    public boolean isShutdown() {
        return executorService.isShutdown();
    }

    public boolean isTerminated() {
        return executorService.isTerminated();
    }

    /**
     * Clean shutdown of the underlying ExecutorService:
     * 1. Rejects new tasks.
     * 2. Waits up to timeoutSeconds for active tasks to terminate.
     * 3. Invokes shutdownNow() if timeout elapses.
     */
    public void shutdown(long timeoutSeconds) {
        executorService.shutdown();
        try {
            if (!executorService.awaitTermination(timeoutSeconds, TimeUnit.SECONDS)) {
                logger.log(Level.WARNING, "Executor pool did not terminate within timeout; forcing shutdownNow()");
                executorService.shutdownNow();
            }
        } catch (InterruptedException e) {
            logger.log(Level.WARNING, "Interrupted while awaiting executor termination; forcing shutdownNow()", e);
            executorService.shutdownNow();
            Thread.currentThread().interrupt();
        }
    }

    /**
     * Immediate shutdown without waiting.
     */
    public void shutdownNow() {
        executorService.shutdownNow();
    }
}
