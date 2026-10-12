package com.fraud;

import com.fraud.util.DatabaseConnection;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

import java.sql.Connection;
import java.sql.PreparedStatement;
import java.sql.ResultSet;
import java.sql.SQLException;

import static org.junit.jupiter.api.Assertions.*;

/**
 * Phase 1 Tests verifying DatabaseConnection lifecycle and schema initialization.
 */
public class DatabaseConnectionTest {

    @Test
    @DisplayName("Verify Connection can be acquired from DatabaseConnection pool")
    void testGetConnection() throws SQLException {
        try (Connection conn = DatabaseConnection.getConnection()) {
            assertNotNull(conn, "Database connection should not be null");
            assertFalse(conn.isClosed(), "Connection should be open and active");
        }
    }

    @Test
    @DisplayName("Verify Schema Initialization and Default Seed Users")
    void testSchemaAndSeedUsers() throws SQLException {
        try (Connection conn = DatabaseConnection.getConnection();
             PreparedStatement ps = conn.prepareStatement("SELECT COUNT(*) FROM users");
             ResultSet rs = ps.executeQuery()) {

            assertTrue(rs.next(), "Result set should have count row");
            int userCount = rs.getInt(1);
            assertTrue(userCount >= 3, "Expected at least 3 initial seed users, found: " + userCount);
        }
    }

    @Test
    @DisplayName("Verify Schema Initialization and Default Fraud Rules")
    void testSchemaAndSeedRules() throws SQLException {
        try (Connection conn = DatabaseConnection.getConnection();
             PreparedStatement ps = conn.prepareStatement("SELECT COUNT(*) FROM fraud_rules WHERE is_active = true");
             ResultSet rs = ps.executeQuery()) {

            assertTrue(rs.next(), "Result set should have count row");
            int ruleCount = rs.getInt(1);
            assertTrue(ruleCount >= 6, "Expected at least 6 default fraud rules, found: " + ruleCount);
        }
    }

    @Test
    @DisplayName("Verify Safe Quiet Rollback and Close Utilities")
    void testRollbackQuietly() throws SQLException {
        Connection conn = DatabaseConnection.getConnection();
        conn.setAutoCommit(false);

        // Insert a temporary dummy row
        try (PreparedStatement ps = conn.prepareStatement(
                "INSERT INTO users (username, password_hash, full_name, email, role, account_number, balance) " +
                "VALUES ('test_rollback_user', 'hash', 'Test Rollback', 'rollback@example.com', 'CUSTOMER', 'ACC-ROLLBACK', 100.00)")) {
            ps.executeUpdate();
        }

        // Rollback quietly
        DatabaseConnection.rollbackQuietly(conn);
        conn.setAutoCommit(true);

        // Verify the row does not persist
        try (PreparedStatement ps = conn.prepareStatement("SELECT COUNT(*) FROM users WHERE username = 'test_rollback_user'");
             ResultSet rs = ps.executeQuery()) {
            assertTrue(rs.next());
            assertEquals(0, rs.getInt(1), "Rolled back transaction should not persist records");
        } finally {
            DatabaseConnection.closeConnection(conn);
        }
    }
}
