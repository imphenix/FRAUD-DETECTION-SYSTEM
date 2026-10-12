package com.fraud.collection;

import com.fraud.model.Transaction;

import java.util.Collections;
import java.util.HashMap;
import java.util.HashSet;
import java.util.Map;
import java.util.Set;

/**
 * Tracks geographical and IP address distribution to support fraud detection strategies:
 * - UNUSUAL_LOCATION rule
 * - Rapid IP hopping
 * - Frequency analysis by location
 *
 * Demonstrates:
 * - Use of java.util.Set (HashSet) for maintaining unique historical sets
 * - Use of java.util.Map (HashMap) for frequency counting and association mapping
 */
public class GeoIpTracker {

    // Maps userId -> Set of historically known legitimate locations
    private final Map<Long, Set<String>> userKnownLocations;
    // Maps userId -> Set of historically known client IP addresses
    private final Map<Long, Set<String>> userKnownIps;
    // Global frequency count of transactions per location
    private final Map<String, Integer> locationTransactionCounts;
    // Global frequency count of transactions per IP address
    private final Map<String, Integer> ipTransactionCounts;

    public GeoIpTracker() {
        this.userKnownLocations = new HashMap<>();
        this.userKnownIps = new HashMap<>();
        this.locationTransactionCounts = new HashMap<>();
        this.ipTransactionCounts = new HashMap<>();
    }

    /**
     * Records a transaction's geographic origin and IP address.
     */
    public synchronized void recordOrigin(Transaction tx) {
        if (tx == null || tx.getUserId() == null) {
            return;
        }

        Long userId = tx.getUserId();
        String location = normalize(tx.getLocation());
        String ip = normalize(tx.getIpAddress());

        if (location != null) {
            userKnownLocations.computeIfAbsent(userId, k -> new HashSet<>()).add(location);
            locationTransactionCounts.put(location, locationTransactionCounts.getOrDefault(location, 0) + 1);
        }

        if (ip != null) {
            userKnownIps.computeIfAbsent(userId, k -> new HashSet<>()).add(ip);
            ipTransactionCounts.put(ip, ipTransactionCounts.getOrDefault(ip, 0) + 1);
        }
    }

    /**
     * Checks if the given location is novel (not in historical baseline) for the customer.
     *
     * @param userId user identifier
     * @param location location to evaluate
     * @return true if location is unfamiliar, false if known or baseline is empty
     */
    public synchronized boolean isUnusualLocation(Long userId, String location) {
        if (userId == null || location == null) {
            return false;
        }
        Set<String> known = userKnownLocations.get(userId);
        if (known == null || known.isEmpty()) {
            return false; // No prior baseline to contradict
        }
        return !known.contains(normalize(location));
    }

    /**
     * Checks if the IP address is unfamiliar for the customer.
     */
    public synchronized boolean isUnfamiliarIp(Long userId, String ipAddress) {
        if (userId == null || ipAddress == null) {
            return false;
        }
        Set<String> known = userKnownIps.get(userId);
        if (known == null || known.isEmpty()) {
            return false;
        }
        return !known.contains(normalize(ipAddress));
    }

    public synchronized Set<String> getKnownLocations(Long userId) {
        if (userId == null) {
            return Collections.emptySet();
        }
        Set<String> set = userKnownLocations.get(userId);
        return set != null ? Collections.unmodifiableSet(new HashSet<>(set)) : Collections.emptySet();
    }

    public synchronized Set<String> getKnownIps(Long userId) {
        if (userId == null) {
            return Collections.emptySet();
        }
        Set<String> set = userKnownIps.get(userId);
        return set != null ? Collections.unmodifiableSet(new HashSet<>(set)) : Collections.emptySet();
    }

    public synchronized int getTransactionCountForLocation(String location) {
        if (location == null) return 0;
        return locationTransactionCounts.getOrDefault(normalize(location), 0);
    }

    public synchronized int getTransactionCountForIp(String ipAddress) {
        if (ipAddress == null) return 0;
        return ipTransactionCounts.getOrDefault(normalize(ipAddress), 0);
    }

    private String normalize(String str) {
        return str != null ? str.trim().toUpperCase() : null;
    }

    public synchronized void clear() {
        userKnownLocations.clear();
        userKnownIps.clear();
        locationTransactionCounts.clear();
        ipTransactionCounts.clear();
    }
}
