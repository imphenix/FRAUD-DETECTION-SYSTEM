package com.fraud.strategy;

import com.fraud.collection.GeoIpTracker;
import com.fraud.collection.SlidingWindowTransactionTracker;
import com.fraud.collection.TransactionHistoryLedger;
import com.fraud.model.Customer;
import com.fraud.model.RiskAnalysis;
import com.fraud.model.Transaction;

/**
 * Abstraction strategy for fraud analysis.
 *
 * Demonstrates:
 * - Strategy Design Pattern
 * - Decoupling of fraud evaluation algorithms from transport/controller layers
 * - Polymorphic rule assessment using transaction, customer context, and temporal collections
 */
public interface FraudDetectionStrategy {

    /**
     * Analyzes a candidate transaction against contextual customer information and history.
     *
     * @param transaction the candidate transaction to evaluate
     * @param customer customer profile (may be null if customer record not yet established)
     * @param ledger historical transaction ledger for average and failure tracking
     * @param slidingTracker sliding time-window queue for rapid velocity tracking
     * @param geoIpTracker geographical and IP baseline tracker
     * @return immutable {@link RiskAnalysis} containing composite score, level, triggered rules, and human-readable reasons
     */
    RiskAnalysis analyze(Transaction transaction,
                         Customer customer,
                         TransactionHistoryLedger ledger,
                         SlidingWindowTransactionTracker slidingTracker,
                         GeoIpTracker geoIpTracker);
}
