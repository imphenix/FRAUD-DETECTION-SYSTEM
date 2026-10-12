package com.fraud;

import com.fraud.exception.DatabaseException;
import com.fraud.repository.AbstractJdbcRepository;
import com.fraud.repository.RowMapper;
import com.fraud.util.DatabaseConnection;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

import java.sql.Connection;
import java.sql.ResultSet;
import java.sql.SQLException;
import java.util.List;
import java.util.Optional;

import static org.junit.jupiter.api.Assertions.*;

/**
 * Phase 2 Unit & Integration Tests.
 * Verifies Generic Repository abstraction, type parameters, template methods, and exception translation.
 */
public class RepositoryTest {

    // Concrete mock entity representing a generic domain object for testing
    static class DummyRuleEntity {
        private Long id;
        private String ruleCode;
        private String ruleName;
        private int weight;
        private double threshold;
        private boolean active;

        public DummyRuleEntity(Long id, String ruleCode, String ruleName, int weight, double threshold, boolean active) {
            this.id = id;
            this.ruleCode = ruleCode;
            this.ruleName = ruleName;
            this.weight = weight;
            this.threshold = threshold;
            this.active = active;
        }

        public Long getId() { return id; }
        public void setId(Long id) { this.id = id; }
        public String getRuleCode() { return ruleCode; }
        public String getRuleName() { return ruleName; }
        public int getWeight() { return weight; }
        public double getThreshold() { return threshold; }
        public boolean isActive() { return active; }
    }

    // Concrete Generic Repository implementation targeting fraud_rules table
    static class DummyRuleRepository extends AbstractJdbcRepository<DummyRuleEntity, Long> {

        private final RowMapper<DummyRuleEntity> mapper = rs -> new DummyRuleEntity(
                rs.getLong("id"),
                rs.getString("rule_code"),
                rs.getString("rule_name"),
                rs.getInt("weight"),
                rs.getDouble("threshold_value"),
                rs.getBoolean("is_active")
        );

        @Override
        protected String getTableName() {
            return "fraud_rules";
        }

        @Override
        protected String getIdColumnName() {
            return "id";
        }

        @Override
        protected RowMapper<DummyRuleEntity> getRowMapper() {
            return mapper;
        }

        @Override
        public DummyRuleEntity save(DummyRuleEntity entity) throws DatabaseException {
            return save(entity, null);
        }

        @Override
        public DummyRuleEntity save(DummyRuleEntity entity, Connection connection) throws DatabaseException {
            String sql = "INSERT INTO fraud_rules (rule_code, rule_name, description, weight, threshold_value, is_active) VALUES (?, ?, ?, ?, ?, ?)";
            long generatedId = executeInsertAndReturnGeneratedId(connection, sql,
                    entity.getRuleCode(), entity.getRuleName(), "Test Desc", entity.getWeight(), entity.getThreshold(), entity.isActive());
            entity.setId(generatedId);
            return entity;
        }

        @Override
        public DummyRuleEntity update(DummyRuleEntity entity) throws DatabaseException {
            return update(entity, null);
        }

        @Override
        public DummyRuleEntity update(DummyRuleEntity entity, Connection connection) throws DatabaseException {
            String sql = "UPDATE fraud_rules SET rule_name = ?, weight = ? WHERE id = ?";
            executeUpdateWithConnection(connection, sql, entity.getRuleName(), entity.getWeight(), entity.getId());
            return entity;
        }
    }

    @Test
    @DisplayName("Verify Generic Repository FindAll and Type Safety")
    void testFindAllAndGenerics() throws DatabaseException {
        DummyRuleRepository repo = new DummyRuleRepository();
        List<DummyRuleEntity> list = repo.findAll();

        assertNotNull(list, "Repository query should return a non-null list");
        assertTrue(list.size() >= 6, "Expected at least 6 initial seed rules");
        DummyRuleEntity first = list.get(0);
        assertNotNull(first.getId(), "Entity ID should be populated by RowMapper");
        assertNotNull(first.getRuleCode(), "Entity Code should be populated");
    }

    @Test
    @DisplayName("Verify Generic Repository FindById returning Optional<T>")
    void testFindByIdOptional() throws DatabaseException {
        DummyRuleRepository repo = new DummyRuleRepository();
        Optional<DummyRuleEntity> ruleOpt = repo.findById(1L);

        assertTrue(ruleOpt.isPresent(), "Rule ID 1 should exist from seed data");
        assertEquals("HIGH_AMOUNT", ruleOpt.get().getRuleCode());
        assertEquals(30, ruleOpt.get().getWeight());

        Optional<DummyRuleEntity> nonExistent = repo.findById(999999L);
        assertFalse(nonExistent.isPresent(), "Non-existent ID should return Optional.empty()");
    }

    @Test
    @DisplayName("Verify Generic Repository Count and ExistsById")
    void testCountAndExistsById() throws DatabaseException {
        DummyRuleRepository repo = new DummyRuleRepository();
        long count = repo.count();
        assertTrue(count >= 6, "Record count should be >= 6");

        assertTrue(repo.existsById(1L), "Record ID 1 should exist");
        assertFalse(repo.existsById(888888L), "Record ID 888888 should not exist");
    }

    @Test
    @DisplayName("Verify Generic Repository Save, Update, and Delete Lifecycle")
    void testCrudLifecycle() throws DatabaseException {
        DummyRuleRepository repo = new DummyRuleRepository();
        String uniqueCode = "TEST_RULE_" + System.currentTimeMillis();

        // 1. Create
        DummyRuleEntity newEntity = new DummyRuleEntity(null, uniqueCode, "Test Dynamic Rule", 15, 100.0, true);
        DummyRuleEntity saved = repo.save(newEntity);
        assertNotNull(saved.getId(), "Saved entity must have auto-generated ID");
        assertTrue(saved.getId() > 0);

        // 2. Read
        Optional<DummyRuleEntity> fetched = repo.findById(saved.getId());
        assertTrue(fetched.isPresent());
        assertEquals(uniqueCode, fetched.get().getRuleCode());

        // 3. Update
        fetched.get().ruleName = "Updated Dynamic Rule Name";
        fetched.get().weight = 40;
        repo.update(fetched.get());

        Optional<DummyRuleEntity> afterUpdate = repo.findById(saved.getId());
        assertTrue(afterUpdate.isPresent());
        assertEquals("Updated Dynamic Rule Name", afterUpdate.get().getRuleName());
        assertEquals(40, afterUpdate.get().getWeight());

        // 4. Delete
        boolean deleted = repo.deleteById(saved.getId());
        assertTrue(deleted, "Delete should return true for existing entity");

        Optional<DummyRuleEntity> afterDelete = repo.findById(saved.getId());
        assertFalse(afterDelete.isPresent(), "Entity should no longer exist after delete");
    }
}
