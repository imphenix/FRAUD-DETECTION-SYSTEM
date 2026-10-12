package com.fraud.dao;

import com.fraud.exception.DatabaseException;
import com.fraud.model.FraudRule;
import com.fraud.repository.AbstractJdbcRepository;
import com.fraud.repository.RowMapper;

import java.sql.Connection;
import java.util.List;
import java.util.Optional;

/**
 * Concrete JDBC Data Access Object for {@link FraudRule} entities.
 *
 * Demonstrates:
 * - Extension of AbstractJdbcRepository<FraudRule, Integer>
 * - Management of configurable rule thresholds and weights
 * - Querying active rules for real-time engine evaluation
 */
public class FraudRuleDAO extends AbstractJdbcRepository<FraudRule, Integer> {

    private final RowMapper<FraudRule> rowMapper = rs -> {
        FraudRule rule = new FraudRule();
        rule.setId(rs.getInt("id"));
        rule.setRuleCode(rs.getString("rule_code"));
        rule.setRuleName(rs.getString("rule_name"));
        rule.setDescription(rs.getString("description"));
        rule.setWeight(rs.getInt("weight"));
        rule.setThresholdValue(rs.getDouble("threshold_value"));
        rule.setActive(rs.getBoolean("is_active"));
        rule.setCreatedAt(rs.getTimestamp("created_at"));
        return rule;
    };

    @Override
    protected String getTableName() {
        return "fraud_rules";
    }

    @Override
    protected String getIdColumnName() {
        return "id";
    }

    @Override
    protected RowMapper<FraudRule> getRowMapper() {
        return rowMapper;
    }

    @Override
    public FraudRule save(FraudRule rule) throws DatabaseException {
        return save(rule, null);
    }

    @Override
    public FraudRule save(FraudRule rule, Connection connection) throws DatabaseException {
        if (rule == null) {
            throw new IllegalArgumentException("FraudRule cannot be null");
        }

        String sql = "INSERT INTO fraud_rules (rule_code, rule_name, description, weight, threshold_value, is_active, created_at) " +
                     "VALUES (?, ?, ?, ?, ?, ?, ?)";

        long generatedId = executeInsertAndReturnGeneratedId(
                connection,
                sql,
                rule.getRuleCode(),
                rule.getRuleName(),
                rule.getDescription(),
                rule.getWeight(),
                rule.getThresholdValue(),
                rule.isActive(),
                rule.getCreatedAt()
        );

        rule.setId((int) generatedId);
        return rule;
    }

    @Override
    public FraudRule update(FraudRule rule) throws DatabaseException {
        return update(rule, null);
    }

    @Override
    public FraudRule update(FraudRule rule, Connection connection) throws DatabaseException {
        if (rule == null || rule.getId() == null) {
            throw new IllegalArgumentException("FraudRule and ID cannot be null for update");
        }

        String sql = "UPDATE fraud_rules SET rule_name = ?, description = ?, weight = ?, threshold_value = ?, is_active = ? " +
                     "WHERE id = ?";

        executeUpdateWithConnection(
                connection,
                sql,
                rule.getRuleName(),
                rule.getDescription(),
                rule.getWeight(),
                rule.getThresholdValue(),
                rule.isActive(),
                rule.getId()
        );

        return rule;
    }

    /**
     * Finds all active rules configured for fraud evaluation.
     */
    public List<FraudRule> findAllActiveRules() throws DatabaseException {
        return findAllActiveRules(null);
    }

    public List<FraudRule> findAllActiveRules(Connection connection) throws DatabaseException {
        String sql = "SELECT * FROM fraud_rules WHERE is_active = TRUE ORDER BY weight DESC";
        return queryForListWithConnection(connection, sql);
    }

    /**
     * Finds a rule by its unique rule code.
     */
    public Optional<FraudRule> findByRuleCode(String ruleCode) throws DatabaseException {
        return findByRuleCode(ruleCode, null);
    }

    public Optional<FraudRule> findByRuleCode(String ruleCode, Connection connection) throws DatabaseException {
        if (ruleCode == null || ruleCode.trim().isEmpty()) {
            return Optional.empty();
        }
        String sql = "SELECT * FROM fraud_rules WHERE rule_code = ?";
        var list = queryForListWithConnection(connection, sql, ruleCode.trim());
        return list.isEmpty() ? Optional.empty() : Optional.of(list.get(0));
    }
}
