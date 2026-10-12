package com.fraud;

import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import static org.junit.jupiter.api.Assertions.*;

/**
 * Phase 0 Smoke Test to verify Maven environment and JUnit 5 setup.
 */
public class SmokeTest {

    @Test
    @DisplayName("Verify Java Runtime is version 17 or higher")
    void testJavaVersion() {
        String version = System.getProperty("java.version");
        assertNotNull(version, "Java version should not be null");
        int majorVersion = Integer.parseInt(version.split("\\.")[0]);
        assertTrue(majorVersion >= 17, "Expected Java 17+, got: " + majorVersion);
    }

    @Test
    @DisplayName("Verify fundamental class loading")
    void testBasicAssertions() {
        String appName = "Fraud Detection System";
        assertEquals("Fraud Detection System", appName);
    }
}
