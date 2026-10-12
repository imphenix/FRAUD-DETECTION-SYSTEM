package com.fraud;

import com.fraud.collection.*;
import com.fraud.model.RiskLevel;
import com.fraud.model.Transaction;
import com.fraud.model.TransactionStatus;
import com.fraud.model.TransactionType;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

import java.math.BigDecimal;
import java.sql.Timestamp;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.Set;

import static org.junit.jupiter.api.Assertions.*;

/**
 * Phase 4 Tests verifying Java Collections Framework implementations:
 * - List: ordered transaction ledger, recent retrieval, sorting
 * - Set: unique location and IP tracking
 * - Map: EnumMap risk distributions, status counters, lookup caches
 * - Queue: FIFO sliding time-window transaction velocity tracker
 * - Generics: GenericCollectionStore<T, ID> type safety and operations
 */
public class CollectionTest {

    @Test
    @DisplayName("Verify GenericCollectionStore<T, ID> CRUD and Type Safety")
    void testGenericCollectionStore() {
        GenericCollectionStore<Transaction, String> store = new GenericCollectionStore<>(Transaction::getReferenceId);

        Transaction tx1 = new Transaction(1L, "ACC-01", "ACC-02", new BigDecimal("100.00"), TransactionType.TRANSFER, "Paris");
        tx1.setReferenceId("REF-TX-001");

        Transaction tx2 = new Transaction(1L, "ACC-01", "ACC-03", new BigDecimal("250.00"), TransactionType.PAYMENT, "London");
        tx2.setReferenceId("REF-TX-002");

        store.put(tx1);
        store.put(tx2);

        assertEquals(2, store.size());
        assertTrue(store.contains("REF-TX-001"));
        assertFalse(store.contains("NON_EXISTENT"));

        Optional<Transaction> fetched = store.get("REF-TX-001");
        assertTrue(fetched.isPresent());
        assertEquals(new BigDecimal("100.00"), fetched.get().getAmount());

        List<Transaction> all = store.getAll();
        assertEquals(2, all.size());

        // Ensure returned list is unmodifiable
        assertThrows(UnsupportedOperationException.class, () -> all.remove(0));

        assertTrue(store.remove("REF-TX-001"));
        assertEquals(1, store.size());
        assertFalse(store.contains("REF-TX-001"));
    }

    @Test
    @DisplayName("Verify SlidingWindowTransactionTracker Queue Ordering & Expiration")
    void testSlidingWindowQueue() {
        long windowFiveMinutes = 5 * 60 * 1000L; // 300,000 ms
        SlidingWindowTransactionTracker tracker = new SlidingWindowTransactionTracker(windowFiveMinutes);

        long baseTime = 1000000000000L;
        Long userId = 42L;

        // Transaction 1 at T = baseTime
        Transaction tx1 = new Transaction(userId, "A", "B", new BigDecimal("50"), TransactionType.TRANSFER, "Rome");
        tx1.setCreatedAt(new Timestamp(baseTime));
        tracker.recordTransaction(tx1);

        // Transaction 2 at T = baseTime + 1 minute (60s)
        Transaction tx2 = new Transaction(userId, "A", "B", new BigDecimal("75"), TransactionType.TRANSFER, "Rome");
        tx2.setCreatedAt(new Timestamp(baseTime + 60_000L));
        tracker.recordTransaction(tx2);

        // Transaction 3 at T = baseTime + 3 minutes (180s)
        Transaction tx3 = new Transaction(userId, "A", "B", new BigDecimal("90"), TransactionType.TRANSFER, "Rome");
        tx3.setCreatedAt(new Timestamp(baseTime + 180_000L));
        tracker.recordTransaction(tx3);

        // At T = baseTime + 3 minutes, all 3 are within 5-min window
        assertEquals(3, tracker.getTransactionCountInWindow(userId, baseTime + 180_000L));

        // Transaction 4 arrives at T = baseTime + 6 minutes (360s). tx1 (at 0s) should expire (360 - 300 = 60s cutoff)
        Transaction tx4 = new Transaction(userId, "A", "B", new BigDecimal("120"), TransactionType.TRANSFER, "Rome");
        tx4.setCreatedAt(new Timestamp(baseTime + 360_000L));
        tracker.recordTransaction(tx4);

        // tx1 expired, so tx2, tx3, tx4 remain => count 3
        assertEquals(3, tracker.getTransactionCountInWindow(userId, baseTime + 360_000L));
        List<Transaction> active = tracker.getRecentTransactions(userId, baseTime + 360_000L);
        assertEquals(3, active.size());
        assertEquals(new BigDecimal("75"), active.get(0).getAmount()); // tx2 is now head of queue

        // Fast forward to T = baseTime + 15 minutes: all should expire
        assertEquals(0, tracker.getTransactionCountInWindow(userId, baseTime + 900_000L));
    }

    @Test
    @DisplayName("Verify FraudStatistics Map & Aggregation")
    void testFraudStatistics() {
        FraudStatistics stats = new FraudStatistics();

        Transaction tx1 = new Transaction(1L, "A", "B", new BigDecimal("100.00"), TransactionType.PURCHASE, "Tokyo");
        tx1.setStatus(TransactionStatus.APPROVED);
        tx1.setRiskScore(10); // LOW

        Transaction tx2 = new Transaction(2L, "A", "C", new BigDecimal("5000.00"), TransactionType.TRANSFER, "Berlin");
        tx2.setStatus(TransactionStatus.FLAGGED);
        tx2.setRiskScore(65); // HIGH

        Transaction tx3 = new Transaction(3L, "A", "D", new BigDecimal("80000.00"), TransactionType.WITHDRAWAL, "Lagos");
        tx3.setStatus(TransactionStatus.BLOCKED);
        tx3.setRiskScore(95); // CRITICAL

        stats.recordTransaction(tx1);
        stats.recordTransaction(tx2);
        stats.recordTransaction(tx3);

        assertEquals(3, stats.getTotalTransactions());
        assertEquals(1, stats.getFlaggedCount());
        assertEquals(1, stats.getBlockedCount());
        assertEquals(new BigDecimal("85100.00"), stats.getTotalAmountProcessed());

        assertEquals(1, stats.getCountByRisk(RiskLevel.LOW));
        assertEquals(1, stats.getCountByRisk(RiskLevel.HIGH));
        assertEquals(1, stats.getCountByRisk(RiskLevel.CRITICAL));
        assertEquals(0, stats.getCountByRisk(RiskLevel.MEDIUM));

        // Fraud detection rate: (1 flagged + 1 blocked) / 3 = 66.66%
        assertEquals(66.67, stats.getFraudDetectionRatePercentage(), 0.05);

        Map<RiskLevel, Integer> dist = stats.getRiskDistribution();
        assertThrows(UnsupportedOperationException.class, () -> dist.put(RiskLevel.LOW, 999));
    }

    @Test
    @DisplayName("Verify GeoIpTracker Set Uniqueness & Unusual Location Check")
    void testGeoIpTracker() {
        GeoIpTracker tracker = new GeoIpTracker();
        Long userId = 10L;

        Transaction tx1 = new Transaction(userId, "A", "B", new BigDecimal("100"), TransactionType.PAYMENT, "New York, USA");
        tx1.setIpAddress("192.168.1.50");
        tracker.recordOrigin(tx1);

        Transaction tx2 = new Transaction(userId, "A", "B", new BigDecimal("200"), TransactionType.PAYMENT, "New York, USA");
        tx2.setIpAddress("192.168.1.50");
        tracker.recordOrigin(tx2);

        // Sets should de-duplicate identical locations and IPs
        Set<String> locations = tracker.getKnownLocations(userId);
        assertEquals(1, locations.size());
        assertTrue(locations.contains("NEW YORK, USA"));

        Set<String> ips = tracker.getKnownIps(userId);
        assertEquals(1, ips.size());
        assertTrue(ips.contains("192.168.1.50"));

        // Global frequencies
        assertEquals(2, tracker.getTransactionCountForLocation("New York, USA"));
        assertEquals(2, tracker.getTransactionCountForIp("192.168.1.50"));

        // Unusual location check
        assertFalse(tracker.isUnusualLocation(userId, "New York, USA"));
        assertTrue(tracker.isUnusualLocation(userId, "Moscow, Russia"));

        // Unfamiliar IP check
        assertFalse(tracker.isUnfamiliarIp(userId, "192.168.1.50"));
        assertTrue(tracker.isUnfamiliarIp(userId, "10.0.0.99"));

        // User with no history should not trigger unusual location
        assertFalse(tracker.isUnusualLocation(999L, "Sydney, Australia"));
    }

    @Test
    @DisplayName("Verify TransactionHistoryLedger List Operations & Average Calculation")
    void testTransactionHistoryLedger() {
        TransactionHistoryLedger ledger = new TransactionHistoryLedger();
        Long userId = 77L;

        long baseTime = System.currentTimeMillis();

        Transaction t1 = new Transaction(userId, "A", "B", new BigDecimal("1000.00"), TransactionType.TRANSFER, "Madrid");
        t1.setCreatedAt(new Timestamp(baseTime - 3000));

        Transaction t2 = new Transaction(userId, "A", "B", new BigDecimal("2000.00"), TransactionType.TRANSFER, "Madrid");
        t2.setCreatedAt(new Timestamp(baseTime - 2000));

        Transaction t3 = new Transaction(userId, "A", "B", new BigDecimal("3000.00"), TransactionType.TRANSFER, "Madrid");
        t3.setCreatedAt(new Timestamp(baseTime - 1000));

        ledger.appendTransaction(t1);
        ledger.appendTransaction(t2);
        ledger.appendTransaction(t3);

        // Average computation: (1000 + 2000 + 3000) / 3 = 2000.00
        assertEquals(2000.00, ledger.calculateAverageTransactionAmount(userId), 0.001);

        // Chronological order verification
        List<Transaction> chrono = ledger.getHistoryChronological(userId);
        assertEquals(3, chrono.size());
        assertEquals(new BigDecimal("1000.00"), chrono.get(0).getAmount());
        assertEquals(new BigDecimal("3000.00"), chrono.get(2).getAmount());

        // Recent N transactions (reverse chronological)
        List<Transaction> recent2 = ledger.getRecentTransactions(userId, 2);
        assertEquals(2, recent2.size());
        assertEquals(new BigDecimal("3000.00"), recent2.get(0).getAmount());
        assertEquals(new BigDecimal("2000.00"), recent2.get(1).getAmount());

        // Range count
        int countLast2Sec = ledger.countTransactionsInTimeRange(userId, baseTime, 2500);
        assertEquals(2, countLast2Sec); // t2 and t3
    }
}
