package com.fraud;

import com.fraud.collection.FraudStatistics;
import com.fraud.dao.FraudAlertDAO;
import com.fraud.dao.FraudCaseDAO;
import com.fraud.dao.TransactionDAO;
import com.fraud.model.FraudAlert;
import com.fraud.model.FraudCase;
import com.fraud.model.RiskAnalysis;
import com.fraud.model.RiskLevel;
import com.fraud.model.Transaction;
import com.fraud.model.TransactionProcessingResult;
import com.fraud.model.TransactionStatus;
import com.fraud.model.TransactionType;
import com.fraud.service.FraudMonitoringService;
import com.fraud.service.TransactionManagementService;
import com.fraud.task.TransactionAnalysisTask;
import com.fraud.util.DatabaseConnection;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.BeforeAll;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

import java.math.BigDecimal;
import java.sql.SQLException;
import java.util.ArrayList;
import java.util.Collections;
import java.util.List;
import java.util.Optional;
import java.util.Set;
import java.util.concurrent.Callable;
import java.util.concurrent.CountDownLatch;
import java.util.concurrent.ExecutionException;
import java.util.concurrent.ExecutorService;
import java.util.concurrent.Executors;
import java.util.concurrent.Future;
import java.util.concurrent.RejectedExecutionException;
import java.util.concurrent.TimeUnit;
import java.util.concurrent.atomic.AtomicInteger;

import static org.junit.jupiter.api.Assertions.*;

/**
 * Phase 7 Multithreading & Synchronization Test Suite.
 *
 * Verifies:
 * 1. Concurrent transaction processing across worker threads.
 * 2. Callable and Future result contracts.
 * 3. Thread-safe updates to shared FraudStatistics without lost updates (race condition test).
 * 4. Proper ExecutorService lifecycle shutdown and timeout handling.
 * 5. Exception propagation and handling under concurrent tasks.
 * 6. Concurrency does not break ACID transaction boundaries (each thread maintains its own connection).
 */
public class MultithreadingTest {

    private static TransactionDAO transactionDAO;
    private static FraudCaseDAO fraudCaseDAO;
    private static FraudAlertDAO fraudAlertDAO;
    private static TransactionManagementService transactionManagementService;

    private FraudMonitoringService monitoringService;

    @BeforeAll
    static void initGlobal() throws SQLException {
        DatabaseConnection.getConnection().close();
        transactionDAO = new TransactionDAO();
        fraudCaseDAO = new FraudCaseDAO();
        fraudAlertDAO = new FraudAlertDAO();
        transactionManagementService = new TransactionManagementService(transactionDAO, fraudCaseDAO, fraudAlertDAO);
    }

    @BeforeEach
    void setupService() {
        monitoringService = new FraudMonitoringService(4, transactionManagementService, new FraudStatistics());
    }

    @AfterEach
    void tearDown() {
        if (monitoringService != null && !monitoringService.isShutdown()) {
            monitoringService.shutdown(2);
        }
    }

    @Test
    @DisplayName("1. Concurrent Transaction Processing: Process multiple transactions concurrently and verify results")
    void testConcurrentTransactionProcessing() throws Exception {
        int txCount = 8;
        List<FraudMonitoringService.TransactionTaskItem> items = new ArrayList<>();

        for (int i = 0; i < txCount; i++) {
            Transaction tx = new Transaction(2L, "ACC-98421001", "ACC-DEST-" + i,
                    new BigDecimal("100.00"), TransactionType.PAYMENT, "London");
            tx.setReferenceId("TX-CONC-" + i + "-" + System.currentTimeMillis());

            RiskAnalysis analysis = (i % 2 == 0)
                    ? RiskAnalysis.clean()
                    : new RiskAnalysis(50, RiskLevel.MEDIUM, Set.of("RAPID_TRANSACTIONS"), List.of("Spike in velocity"));

            items.add(new FraudMonitoringService.TransactionTaskItem(tx, analysis));
        }

        List<TransactionProcessingResult> results = monitoringService.processTransactionsConcurrently(items);

        assertEquals(txCount, results.size());
        for (TransactionProcessingResult result : results) {
            assertTrue(result.isSuccess(), "All concurrent valid transactions should succeed");
            assertNotNull(result.getTransactionId());
            assertNotNull(result.getFinalStatus());
            assertTrue(result.getProcessingTimeMs() >= 0);
        }

        // Verify shared statistics updated accurately
        FraudStatistics stats = monitoringService.getSharedStatistics();
        assertEquals(txCount, stats.getTotalTransactions());
        assertEquals(txCount / 2, stats.getCountByStatus(TransactionStatus.APPROVED));
        assertEquals(txCount / 2, stats.getCountByStatus(TransactionStatus.FLAGGED));
    }

    @Test
    @DisplayName("2. Callable and Future Results: verify Future returns meaningful processing results")
    void testCallableResults() throws Exception {
        String refId = "TX-CALLABLE-" + System.currentTimeMillis();
        Transaction tx = new Transaction(2L, "ACC-98421001", "ACC-BENEFICIARY",
                new BigDecimal("5000.00"), TransactionType.TRANSFER, "Paris");
        tx.setReferenceId(refId);

        RiskAnalysis analysis = new RiskAnalysis(70, RiskLevel.HIGH, Set.of("HIGH_AMOUNT"), List.of("Exceeds norm"));

        Future<TransactionProcessingResult> future = monitoringService.submitTransaction(tx, analysis);
        assertNotNull(future);

        // Future.get() blocks until worker thread completes
        TransactionProcessingResult result = future.get(5, TimeUnit.SECONDS);

        assertNotNull(result);
        assertTrue(result.isSuccess());
        assertEquals(refId, result.getReferenceId());
        assertEquals(TransactionStatus.FLAGGED, result.getFinalStatus());
        assertEquals(70, result.getRiskAnalysis().getRiskScore());
    }

    @Test
    @DisplayName("3. Thread-Safe FraudStatistics: Detects race conditions and ensures no lost updates")
    void testThreadSafeFraudStatistics() throws Exception {
        FraudStatistics sharedStats = new FraudStatistics();
        int threadCount = 10;
        int updatesPerThread = 50;
        int totalExpectedUpdates = threadCount * updatesPerThread;

        ExecutorService testExecutor = Executors.newFixedThreadPool(threadCount);
        CountDownLatch startLatch = new CountDownLatch(1);
        CountDownLatch doneLatch = new CountDownLatch(threadCount);

        for (int t = 0; t < threadCount; t++) {
            final int threadId = t;
            testExecutor.submit(() -> {
                try {
                    startLatch.await(); // Simultaneous start to maximize contention
                    for (int i = 0; i < updatesPerThread; i++) {
                        Transaction tx = new Transaction(1L, "A", "B", new BigDecimal("10.00"),
                                TransactionType.PURCHASE, "Test");
                        if (threadId % 2 == 0) {
                            tx.setStatus(TransactionStatus.FLAGGED);
                            tx.setRiskScore(60);
                        } else {
                            tx.setStatus(TransactionStatus.APPROVED);
                            tx.setRiskScore(10);
                        }
                        sharedStats.recordTransaction(tx);
                    }
                } catch (InterruptedException e) {
                    Thread.currentThread().interrupt();
                } finally {
                    doneLatch.countDown();
                }
            });
        }

        startLatch.countDown(); // Fire all threads concurrently
        boolean finishedInTime = doneLatch.await(10, TimeUnit.SECONDS);
        testExecutor.shutdown();

        assertTrue(finishedInTime, "All worker threads must complete within timeout");

        // Verify deterministic count without lost updates
        assertEquals(totalExpectedUpdates, sharedStats.getTotalTransactions(),
                "Shared FraudStatistics must have exactly the expected count without race-condition lost updates");

        int expectedFlagged = (threadCount / 2) * updatesPerThread;
        int expectedApproved = (threadCount - (threadCount / 2)) * updatesPerThread;

        assertEquals(expectedFlagged, sharedStats.getFlaggedCount());
        assertEquals(expectedApproved, sharedStats.getCountByStatus(TransactionStatus.APPROVED));

        BigDecimal expectedTotalAmount = new BigDecimal("10.00").multiply(new BigDecimal(totalExpectedUpdates));
        assertEquals(expectedTotalAmount, sharedStats.getTotalAmountProcessed());
    }

    @Test
    @DisplayName("4. Executor Lifecycle: verifies shutdown and rejection of subsequent tasks")
    void testExecutorShutdown() {
        FraudMonitoringService service = new FraudMonitoringService(2);
        assertFalse(service.isShutdown());

        service.shutdown(2);
        assertTrue(service.isShutdown());

        // Subsequent submissions should throw RejectedExecutionException
        Transaction tx = new Transaction(2L, "A", "B", BigDecimal.ONE, TransactionType.TRANSFER, "Tokyo");
        assertThrows(RejectedExecutionException.class, () -> {
            service.submitTransaction(tx, RiskAnalysis.clean());
        });
    }

    @Test
    @DisplayName("5. Exception Propagation: processing failure is captured and returned rather than swallowed")
    void testExceptionPropagation() throws Exception {
        // Transaction with invalid foreign key
        String badRef = "TX-ERR-" + System.currentTimeMillis();
        Transaction invalidTx = new Transaction(9999999L, "ACC-INVALID", "ACC-DEST",
                new BigDecimal("500.00"), TransactionType.TRANSFER, "Berlin");
        invalidTx.setReferenceId(badRef);

        Future<TransactionProcessingResult> future = monitoringService.submitTransaction(invalidTx, RiskAnalysis.clean());
        TransactionProcessingResult result = future.get(5, TimeUnit.SECONDS);

        assertNotNull(result);
        assertFalse(result.isSuccess(), "Invalid transaction processing must report failure");
        assertEquals(TransactionStatus.FAILED, result.getFinalStatus());
        assertNotNull(result.getErrorMessage());
        assertTrue(result.getErrorMessage().length() > 0);
    }

    @Test
    @DisplayName("6. ACID Boundaries: Concurrent execution maintains separate database connection and rollback semantics")
    void testConcurrentProcessingDoesNotBreakExistingTransactionSemantics() throws Exception {
        // Submit 1 valid transaction and 1 invalid transaction concurrently
        String validRef = "TX-ACID-VALID-" + System.currentTimeMillis();
        Transaction validTx = new Transaction(2L, "ACC-98421001", "ACC-VAL",
                new BigDecimal("200.00"), TransactionType.PURCHASE, "Chicago");
        validTx.setReferenceId(validRef);

        String invalidRef = "TX-ACID-INVALID-" + System.currentTimeMillis();
        Transaction invalidTx = new Transaction(8888888L, "ACC-BAD", "ACC-VAL",
                new BigDecimal("200.00"), TransactionType.PURCHASE, "Chicago");
        invalidTx.setReferenceId(invalidRef);

        Future<TransactionProcessingResult> f1 = monitoringService.submitTransaction(validTx, RiskAnalysis.clean());
        Future<TransactionProcessingResult> f2 = monitoringService.submitTransaction(invalidTx, RiskAnalysis.clean());

        TransactionProcessingResult res1 = f1.get();
        TransactionProcessingResult res2 = f2.get();

        // Valid transaction committed
        assertTrue(res1.isSuccess());
        Optional<Transaction> dbValid = transactionDAO.findByReferenceId(validRef);
        assertTrue(dbValid.isPresent());

        // Invalid transaction rolled back
        assertFalse(res2.isSuccess());
        Optional<Transaction> dbInvalid = transactionDAO.findByReferenceId(invalidRef);
        assertFalse(dbInvalid.isPresent(), "Failed concurrent transaction must be rolled back completely");
    }
}
