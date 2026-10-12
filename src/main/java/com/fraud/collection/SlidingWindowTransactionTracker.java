package com.fraud.collection;

import com.fraud.model.Transaction;

import java.sql.Timestamp;
import java.util.ArrayDeque;
import java.util.ArrayList;
import java.util.Collections;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.Queue;

/**
 * Sliding time-window transaction tracker for velocity spike analysis.
 *
 * Demonstrates:
 * - Use of java.util.Queue (ArrayDeque) for FIFO temporal ordering
 * - Use of java.util.Map (HashMap) for per-user partitioned queues
 * - Sliding time-window expiration logic: automatically evicts transactions older than windowDurationMillis
 * - Thread-safe synchronization
 */
public class SlidingWindowTransactionTracker {

    private final long windowDurationMillis;
    // Maps userId -> Queue of recent transactions within the time window
    private final Map<Long, Queue<Transaction>> userWindowMap;

    /**
     * @param windowDurationMillis the sliding time-window length (e.g. 5 minutes = 300,000 ms)
     */
    public SlidingWindowTransactionTracker(long windowDurationMillis) {
        if (windowDurationMillis <= 0) {
            throw new IllegalArgumentException("Window duration must be positive");
        }
        this.windowDurationMillis = windowDurationMillis;
        this.userWindowMap = new HashMap<>();
    }

    /**
     * Adds a transaction to the user's sliding window and purges expired transactions.
     *
     * @param transaction financial transaction to record
     */
    public synchronized void recordTransaction(Transaction transaction) {
        if (transaction == null || transaction.getUserId() == null) {
            return;
        }

        long now = transaction.getCreatedAt() != null 
                ? transaction.getCreatedAt().getTime() 
                : System.currentTimeMillis();

        Queue<Transaction> queue = userWindowMap.computeIfAbsent(transaction.getUserId(), k -> new ArrayDeque<>());
        purgeExpired(queue, now);
        queue.offer(transaction);
    }

    /**
     * Purges transactions that have fallen outside the sliding window relative to referenceTime.
     */
    private void purgeExpired(Queue<Transaction> queue, long referenceTime) {
        long cutoff = referenceTime - windowDurationMillis;
        while (!queue.isEmpty()) {
            Transaction oldest = queue.peek();
            long txTime = oldest.getCreatedAt() != null ? oldest.getCreatedAt().getTime() : 0L;
            if (txTime < cutoff) {
                queue.poll(); // Evict expired transaction
            } else {
                break; // Because queue is FIFO ordered by time, head is oldest
            }
        }
    }

    /**
     * Returns count of recent transactions for a given user within the current sliding window.
     */
    public synchronized int getTransactionCountInWindow(Long userId, long currentTimestamp) {
        if (userId == null) {
            return 0;
        }
        Queue<Transaction> queue = userWindowMap.get(userId);
        if (queue == null) {
            return 0;
        }
        purgeExpired(queue, currentTimestamp);
        return queue.size();
    }

    /**
     * Returns an unmodifiable snapshot list of recent transactions for a user within the sliding window.
     */
    public synchronized List<Transaction> getRecentTransactions(Long userId, long currentTimestamp) {
        if (userId == null) {
            return Collections.emptyList();
        }
        Queue<Transaction> queue = userWindowMap.get(userId);
        if (queue == null) {
            return Collections.emptyList();
        }
        purgeExpired(queue, currentTimestamp);
        return Collections.unmodifiableList(new ArrayList<>(queue));
    }

    /**
     * Clears all recorded transaction windows.
     */
    public synchronized void clear() {
        userWindowMap.clear();
    }

    public long getWindowDurationMillis() {
        return windowDurationMillis;
    }
}
