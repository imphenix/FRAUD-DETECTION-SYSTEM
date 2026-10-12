package com.fraud.collection;

import com.fraud.model.Transaction;

import java.sql.Timestamp;
import java.util.ArrayList;
import java.util.Collections;
import java.util.Comparator;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;

/**
 * Historical transaction index and chronological ledger buffer.
 *
 * Demonstrates:
 * - Use of java.util.List (ArrayList) for ordered transaction history
 * - Use of java.util.Map (HashMap) for per-user partitioned history
 * - Sorting collections with java.util.Comparator
 * - Filtering and analytical projection using Java Streams and Collections
 */
public class TransactionHistoryLedger {

    // Maps userId -> Chronological list of all user transactions
    private final Map<Long, List<Transaction>> userHistoryMap;

    public TransactionHistoryLedger() {
        this.userHistoryMap = new HashMap<>();
    }

    /**
     * Appends a transaction into the user's chronological history.
     */
    public synchronized void appendTransaction(Transaction tx) {
        if (tx == null || tx.getUserId() == null) {
            return;
        }
        userHistoryMap.computeIfAbsent(tx.getUserId(), k -> new ArrayList<>()).add(tx);
    }

    /**
     * Retrieves all transactions for a user sorted chronologically (oldest to newest).
     */
    public synchronized List<Transaction> getHistoryChronological(Long userId) {
        if (userId == null) {
            return Collections.emptyList();
        }
        List<Transaction> list = userHistoryMap.get(userId);
        if (list == null || list.isEmpty()) {
            return Collections.emptyList();
        }
        List<Transaction> copy = new ArrayList<>(list);
        copy.sort(Comparator.comparing(Transaction::getCreatedAt, Comparator.nullsLast(Comparator.naturalOrder())));
        return Collections.unmodifiableList(copy);
    }

    /**
     * Retrieves the most recent N transactions for a customer (reverse chronological).
     */
    public synchronized List<Transaction> getRecentTransactions(Long userId, int limit) {
        if (userId == null || limit <= 0) {
            return Collections.emptyList();
        }
        List<Transaction> list = userHistoryMap.get(userId);
        if (list == null || list.isEmpty()) {
            return Collections.emptyList();
        }
        List<Transaction> copy = new ArrayList<>(list);
        copy.sort(Comparator.comparing(Transaction::getCreatedAt, Comparator.nullsLast(Comparator.reverseOrder())));
        return copy.stream().limit(limit).collect(Collectors.collectingAndThen(Collectors.toList(), Collections::unmodifiableList));
    }

    /**
     * Computes the historical average transaction amount for a customer.
     * Essential for the AMOUNT_DEVIATION rule in later phases.
     */
    public synchronized double calculateAverageTransactionAmount(Long userId) {
        if (userId == null) {
            return 0.0;
        }
        List<Transaction> list = userHistoryMap.get(userId);
        if (list == null || list.isEmpty()) {
            return 0.0;
        }
        double sum = 0.0;
        int count = 0;
        for (Transaction tx : list) {
            if (tx.getAmount() != null) {
                sum += tx.getAmount().doubleValue();
                count++;
            }
        }
        return count > 0 ? sum / count : 0.0;
    }

    /**
     * Counts how many transactions occurred within a given past duration from a timestamp.
     */
    public synchronized int countTransactionsInTimeRange(Long userId, long endTimestamp, long durationMillis) {
        if (userId == null) {
            return 0;
        }
        List<Transaction> list = userHistoryMap.get(userId);
        if (list == null || list.isEmpty()) {
            return 0;
        }
        long startTimestamp = endTimestamp - durationMillis;
        int count = 0;
        for (Transaction tx : list) {
            if (tx.getCreatedAt() != null) {
                long t = tx.getCreatedAt().getTime();
                if (t >= startTimestamp && t <= endTimestamp) {
                    count++;
                }
            }
        }
        return count;
    }

    public synchronized void clear() {
        userHistoryMap.clear();
    }
}
