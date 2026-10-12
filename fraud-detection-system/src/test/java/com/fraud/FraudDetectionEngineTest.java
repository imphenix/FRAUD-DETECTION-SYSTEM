package com.fraud;

import com.fraud.collection.GeoIpTracker;
import com.fraud.collection.SlidingWindowTransactionTracker;
import com.fraud.collection.TransactionHistoryLedger;
import com.fraud.model.Customer;
import com.fraud.model.FraudRule;
import com.fraud.model.RiskAnalysis;
import com.fraud.model.RiskLevel;
import com.fraud.model.Transaction;
import com.fraud.model.TransactionStatus;
import com.fraud.model.TransactionType;
import com.fraud.strategy.FraudDetectionEngine;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

import java.math.BigDecimal;
import java.sql.Timestamp;
import java.time.LocalDateTime;
import java.time.ZoneId;
import java.util.ArrayList;
import java.util.List;

import static org.junit.jupiter.api.Assertions.*;

/**
 * Phase 8 Tests verifying real multi-signal Fraud Detection Engine logic:
 * 1. testLowRiskTransaction: normal values yield LOW risk and clean score.
 * 2. testHighAmountRule: amount exceeding configured threshold triggers HIGH_AMOUNT.
 * 3. testRapidTransactionsRule: velocity spike triggers RAPID_TRANSACTIONS.
 * 4. testUnusualLocationRule: unfamiliar geo origin triggers UNUSUAL_LOCATION.
 * 5. testOddHourRule: nocturnal execution triggers ODD_HOUR.
 * 6. testAmountDeviationRule: surge over customer historical mean triggers AMOUNT_DEVIATION.
 * 7. testRepeatedFailuresRule: multiple failed transactions trigger REPEATED_FAILURES.
 * 8. testMultipleRulesCombineScore: multiple rules accumulate weights toward CRITICAL/BLOCKED.
 * 9. testDisabledRuleIsIgnored: inactive rules do not contribute to risk score.
 * 10. testInsufficientHistory: gracefully handles lack of baseline without spurious flags.
 * 11. testRiskScoreBounds: ensures scores clamp between 0 and 100.
 * 12. testRiskLevelMapping: validates accurate RiskLevel derivation from computed score.
 */
public class FraudDetectionEngineTest {

    private FraudDetectionEngine engine;
    private TransactionHistoryLedger ledger;
    private SlidingWindowTransactionTracker slidingTracker;
    private GeoIpTracker geoIpTracker;
    private Customer testCustomer;

    @BeforeEach
    void setUp() {
        engine = new FraudDetectionEngine();
        ledger = new TransactionHistoryLedger();
        slidingTracker = new SlidingWindowTransactionTracker(5 * 60 * 1000L); // 5-minute sliding window
        geoIpTracker = new GeoIpTracker();

        testCustomer = new Customer(2L, "john_doe", "hash", "John Doe", "john@example.com",
                "+91-98765-01002", "ACC-98421001", new BigDecimal("5000000.00"), RiskLevel.LOW);
    }

    private Timestamp createTimestamp(int hour, int minute) {
        LocalDateTime ldt = LocalDateTime.now().withHour(hour).withMinute(minute).withSecond(0).withNano(0);
        return Timestamp.from(ldt.atZone(ZoneId.systemDefault()).toInstant());
    }

    @Test
    @DisplayName("1. Normal Low-Risk Transaction")
    void testLowRiskTransaction() {
        // Setup baseline location in New Delhi, India
        Transaction baseTx = new Transaction(2L, "ACC-98421001", "ACC-MERCHANT",
                new BigDecimal("500.00"), TransactionType.PAYMENT, "New Delhi, India");
        baseTx.setStatus(TransactionStatus.APPROVED);
        baseTx.setCreatedAt(createTimestamp(14, 30)); // 2:30 PM (daytime)
        geoIpTracker.recordOrigin(baseTx);
        ledger.appendTransaction(baseTx);

        // Candidate transaction: normal amount, daytime, known Indian location
        Transaction candidate = new Transaction(2L, "ACC-98421001", "ACC-MERCHANT",
                new BigDecimal("1500.00"), TransactionType.PURCHASE, "New Delhi, India");
        candidate.setCreatedAt(createTimestamp(15, 0)); // 3:00 PM

        RiskAnalysis result = engine.analyze(candidate, testCustomer, ledger, slidingTracker, geoIpTracker);

        assertNotNull(result);
        assertEquals(0, result.getRiskScore());
        assertEquals(RiskLevel.LOW, result.getRiskLevel());
        assertTrue(result.getTriggeredRules().isEmpty());
        assertTrue(result.getReasons().isEmpty());
        assertFalse(result.isFlagged());
        assertFalse(result.isBlocked());
    }

    @Test
    @DisplayName("2. Rule HIGH_AMOUNT Triggered")
    void testHighAmountRule() {
        // HIGH_AMOUNT threshold is ₹2,00,000; candidate is ₹5,00,000
        Transaction candidate = new Transaction(2L, "ACC-98421001", "ACC-DEST",
                new BigDecimal("500000.00"), TransactionType.TRANSFER, "New Delhi, India");
        candidate.setCreatedAt(createTimestamp(12, 0));

        RiskAnalysis result = engine.analyze(candidate, testCustomer, ledger, slidingTracker, geoIpTracker);

        assertTrue(result.getTriggeredRules().contains("HIGH_AMOUNT"));
        assertEquals(30, result.getRiskScore()); // Weight 30
        assertEquals(RiskLevel.LOW, result.getRiskLevel()); // 30 is LOW (< 40)
        assertEquals(1, result.getReasons().size());
        assertTrue(result.getReasons().get(0).contains("exceeds threshold limit"));
    }

    @Test
    @DisplayName("2b. Rule HIGH_AMOUNT Triggered on Extremely Large Amount (90000000000)")
    void testExtremelyLargeAmountRule() {
        Transaction candidate = new Transaction(2L, "ACC-98421001", "ACC-DEST",
                new BigDecimal("90000000000.00"), TransactionType.TRANSFER, "New Delhi, India");
        candidate.setCreatedAt(createTimestamp(12, 0));

        RiskAnalysis result = engine.analyze(candidate, testCustomer, ledger, slidingTracker, geoIpTracker);

        assertTrue(result.getTriggeredRules().contains("HIGH_AMOUNT"));
        assertTrue(result.getRiskScore() >= 30);
        assertFalse(result.getTriggeredRules().isEmpty());
    }

    @Test
    @DisplayName("3. Rule RAPID_TRANSACTIONS Triggered via Sliding Window")
    void testRapidTransactionsRule() {
        long baseTime = System.currentTimeMillis();

        // Simulate 3 recent transactions in sliding window
        for (int i = 0; i < 3; i++) {
            Transaction past = new Transaction(2L, "ACC-98421001", "ACC-M-" + i,
                    new BigDecimal("20.00"), TransactionType.PAYMENT, "Boston");
            past.setCreatedAt(new Timestamp(baseTime + (i * 1000)));
            slidingTracker.recordTransaction(past);
        }

        // 4th transaction arrives within the 5-min window
        Transaction candidate = new Transaction(2L, "ACC-98421001", "ACC-M-4",
                new BigDecimal("25.00"), TransactionType.PAYMENT, "Boston");
        candidate.setCreatedAt(new Timestamp(baseTime + 5000));

        RiskAnalysis result = engine.analyze(candidate, testCustomer, ledger, slidingTracker, geoIpTracker);

        assertTrue(result.getTriggeredRules().contains("RAPID_TRANSACTIONS"));
        assertEquals(25, result.getRiskScore()); // Weight 25
        assertTrue(result.getReasons().get(0).contains("velocity detected"));
    }

    @Test
    @DisplayName("4. Rule UNUSUAL_LOCATION Triggered")
    void testUnusualLocationRule() {
        // Customer historically only transacts in London
        Transaction past = new Transaction(2L, "ACC-98421001", "ACC-LND",
                new BigDecimal("40.00"), TransactionType.PURCHASE, "London, UK");
        geoIpTracker.recordOrigin(past);

        // Candidate arrives from unfamiliar foreign country
        Transaction candidate = new Transaction(2L, "ACC-98421001", "ACC-EXT",
                new BigDecimal("60.00"), TransactionType.PURCHASE, "Caracas, Venezuela");
        candidate.setCreatedAt(createTimestamp(11, 0));

        RiskAnalysis result = engine.analyze(candidate, testCustomer, ledger, slidingTracker, geoIpTracker);

        assertTrue(result.getTriggeredRules().contains("UNUSUAL_LOCATION"));
        assertEquals(20, result.getRiskScore()); // Weight 20
        assertTrue(result.getReasons().get(0).contains("deviates from customer historical baseline"));
    }

    @Test
    @DisplayName("5. Rule ODD_HOUR Triggered")
    void testOddHourRule() {
        // Transaction executed at 03:15 AM
        Transaction candidate = new Transaction(2L, "ACC-98421001", "ACC-NIGHT",
                new BigDecimal("100.00"), TransactionType.PAYMENT, "London, UK");
        candidate.setCreatedAt(createTimestamp(3, 15));

        RiskAnalysis result = engine.analyze(candidate, testCustomer, ledger, slidingTracker, geoIpTracker);

        assertTrue(result.getTriggeredRules().contains("ODD_HOUR"));
        assertEquals(15, result.getRiskScore()); // Weight 15
        assertTrue(result.getReasons().get(0).contains("off-hours nocturnal window"));
    }

    @Test
    @DisplayName("6. Rule AMOUNT_DEVIATION Triggered")
    void testAmountDeviationRule() {
        // Historical average = (100 + 120 + 80) / 3 = ₹100.00
        Transaction t1 = new Transaction(2L, "ACC-98421001", "A", new BigDecimal("100.00"), TransactionType.PURCHASE, "City");
        t1.setCreatedAt(createTimestamp(10, 0));
        Transaction t2 = new Transaction(2L, "ACC-98421001", "B", new BigDecimal("120.00"), TransactionType.PURCHASE, "City");
        t2.setCreatedAt(createTimestamp(11, 0));
        Transaction t3 = new Transaction(2L, "ACC-98421001", "C", new BigDecimal("80.00"), TransactionType.PURCHASE, "City");
        t3.setCreatedAt(createTimestamp(12, 0));

        ledger.appendTransaction(t1);
        ledger.appendTransaction(t2);
        ledger.appendTransaction(t3);

        // Candidate is ₹450.00 (4.5x of ₹100 average, threshold is 3.0x)
        Transaction candidate = new Transaction(2L, "ACC-98421001", "D",
                new BigDecimal("450.00"), TransactionType.TRANSFER, "City");
        candidate.setCreatedAt(createTimestamp(14, 0));

        RiskAnalysis result = engine.analyze(candidate, testCustomer, ledger, slidingTracker, geoIpTracker);

        assertTrue(result.getTriggeredRules().contains("AMOUNT_DEVIATION"));
        assertEquals(25, result.getRiskScore()); // Weight 25
        assertTrue(result.getReasons().get(0).contains("customer average"));
    }

    @Test
    @DisplayName("7. Rule REPEATED_FAILURES Triggered")
    void testRepeatedFailuresRule() {
        // Simulate 2 failed past attempts
        Transaction f1 = new Transaction(2L, "ACC-98421001", "DEST", new BigDecimal("100.00"), TransactionType.TRANSFER, "City");
        f1.setStatus(TransactionStatus.FAILED);
        f1.setCreatedAt(createTimestamp(9, 0));

        Transaction f2 = new Transaction(2L, "ACC-98421001", "DEST", new BigDecimal("100.00"), TransactionType.TRANSFER, "City");
        f2.setStatus(TransactionStatus.FAILED);
        f2.setCreatedAt(createTimestamp(9, 30));

        ledger.appendTransaction(f1);
        ledger.appendTransaction(f2);

        Transaction candidate = new Transaction(2L, "ACC-98421001", "DEST",
                new BigDecimal("100.00"), TransactionType.TRANSFER, "City");
        candidate.setCreatedAt(createTimestamp(10, 0));

        RiskAnalysis result = engine.analyze(candidate, testCustomer, ledger, slidingTracker, geoIpTracker);

        assertTrue(result.getTriggeredRules().contains("REPEATED_FAILURES"));
        assertEquals(20, result.getRiskScore()); // Weight 20
        assertTrue(result.getReasons().get(0).contains("failed transactions detected"));
    }

    @Test
    @DisplayName("8. Multiple Rules Combine into Composite Score and Higher Risk Level")
    void testMultipleRulesCombineScore() {
        // 1. Establish baseline in New Delhi
        Transaction baseline = new Transaction(2L, "ACC-98421001", "A", new BigDecimal("10000.00"), TransactionType.PURCHASE, "New Delhi, India");
        baseline.setCreatedAt(createTimestamp(10, 0));
        geoIpTracker.recordOrigin(baseline);
        ledger.appendTransaction(baseline);

        Transaction base2 = new Transaction(2L, "ACC-98421001", "B", new BigDecimal("10000.00"), TransactionType.PURCHASE, "New Delhi, India");
        base2.setCreatedAt(createTimestamp(11, 0));
        ledger.appendTransaction(base2);

        // Candidate triggers:
        // - HIGH_AMOUNT (₹8,00,000 > 2,00,000) -> 30
        // - UNUSUAL_LOCATION (Sydney != New Delhi) -> 20
        // - ODD_HOUR (02:30 AM) -> 15
        // - AMOUNT_DEVIATION (₹8,00,000 vs ₹10,000 avg = 80x > 3x) -> 25
        // Total expected score: 30 + 20 + 15 + 25 = 90 (CRITICAL -> BLOCKED)
        Transaction candidate = new Transaction(2L, "ACC-98421001", "UNKNOWN",
                new BigDecimal("800000.00"), TransactionType.TRANSFER, "Sydney, Australia");
        candidate.setCreatedAt(createTimestamp(2, 30));

        RiskAnalysis result = engine.analyze(candidate, testCustomer, ledger, slidingTracker, geoIpTracker);

        assertEquals(90, result.getRiskScore());
        assertEquals(RiskLevel.CRITICAL, result.getRiskLevel());
        assertTrue(result.isBlocked());
        assertTrue(result.isFlagged());
        assertEquals(4, result.getTriggeredRules().size());
        assertEquals(4, result.getReasons().size());
    }

    @Test
    @DisplayName("9. Disabled Rule Is Ignored in Evaluation")
    void testDisabledRuleIsIgnored() {
        List<FraudRule> customRules = new ArrayList<>(FraudDetectionEngine.createDefaultRules());
        // Deactivate HIGH_AMOUNT rule
        for (FraudRule r : customRules) {
            if ("HIGH_AMOUNT".equals(r.getRuleCode())) {
                r.setActive(false);
            }
        }
        FraudDetectionEngine customEngine = new FraudDetectionEngine(customRules);

        Transaction candidate = new Transaction(2L, "ACC-98421001", "DEST",
                new BigDecimal("90000.00"), TransactionType.TRANSFER, "City");
        candidate.setCreatedAt(createTimestamp(12, 0));

        RiskAnalysis result = customEngine.analyze(candidate, testCustomer, ledger, slidingTracker, geoIpTracker);

        assertFalse(result.getTriggeredRules().contains("HIGH_AMOUNT"));
        assertEquals(0, result.getRiskScore());
    }

    @Test
    @DisplayName("10. Insufficient History Handled Safely Without False Positive")
    void testInsufficientHistory() {
        // Customer has only 1 historical transaction (insufficient to form a robust average baseline)
        Transaction singleTx = new Transaction(2L, "ACC-98421001", "A", new BigDecimal("50.00"), TransactionType.PURCHASE, "City");
        ledger.appendTransaction(singleTx);

        // Candidate amount is ₹500, but AMOUNT_DEVIATION should not trigger due to insufficient sample size (< 2)
        Transaction candidate = new Transaction(2L, "ACC-98421001", "B", new BigDecimal("500.00"), TransactionType.PURCHASE, "City");
        candidate.setCreatedAt(createTimestamp(12, 0));

        RiskAnalysis result = engine.analyze(candidate, testCustomer, ledger, slidingTracker, geoIpTracker);

        assertFalse(result.getTriggeredRules().contains("AMOUNT_DEVIATION"));
    }

    @Test
    @DisplayName("11. Risk Score Bounds Clamped between 0 and 100")
    void testRiskScoreBounds() {
        // Configure rules with exaggerated weights to test clamping at 100
        List<FraudRule> extremeRules = List.of(
                new FraudRule(1, "HIGH_AMOUNT", "Rule 1", "Desc", 80, 100.0, true, null),
                new FraudRule(2, "ODD_HOUR", "Rule 2", "Desc", 60, 1.0, true, null)
        );
        FraudDetectionEngine extremeEngine = new FraudDetectionEngine(extremeRules);

        Transaction candidate = new Transaction(2L, "ACC-98421001", "DEST", new BigDecimal("500.00"), TransactionType.TRANSFER, "City");
        candidate.setCreatedAt(createTimestamp(2, 0)); // triggers both -> 80 + 60 = 140

        RiskAnalysis result = extremeEngine.analyze(candidate, testCustomer, ledger, slidingTracker, geoIpTracker);

        assertEquals(100, result.getRiskScore(), "Score must clamp at maximum of 100");
        assertEquals(RiskLevel.CRITICAL, result.getRiskLevel());
    }

    @Test
    @DisplayName("12. RiskLevel Mapping Matches Computed Score")
    void testRiskLevelMapping() {
        assertEquals(RiskLevel.LOW, RiskLevel.fromScore(0));
        assertEquals(RiskLevel.LOW, RiskLevel.fromScore(39));
        assertEquals(RiskLevel.MEDIUM, RiskLevel.fromScore(40));
        assertEquals(RiskLevel.MEDIUM, RiskLevel.fromScore(69));
        assertEquals(RiskLevel.HIGH, RiskLevel.fromScore(70));
        assertEquals(RiskLevel.HIGH, RiskLevel.fromScore(84));
        assertEquals(RiskLevel.CRITICAL, RiskLevel.fromScore(85));
        assertEquals(RiskLevel.CRITICAL, RiskLevel.fromScore(100));
    }
}
