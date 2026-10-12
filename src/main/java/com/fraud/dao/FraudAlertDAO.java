package com.fraud.dao;

import com.fraud.exception.DatabaseException;
import com.fraud.model.FraudAlert;
import com.fraud.model.RiskLevel;
import com.fraud.repository.AbstractJdbcRepository;
import com.fraud.repository.RowMapper;

import java.sql.Connection;
import java.util.List;

/**
 * Concrete JDBC Data Access Object for {@link FraudAlert} entities.
 *
 * Demonstrates:
 * - Extension of AbstractJdbcRepository<FraudAlert, Long>
 * - Mapping between domain entities and SQL alerts table
 * - Custom join query for finding alerts by user ID
 * - Full CRUD capabilities with PreparedStatement
 */
public class FraudAlertDAO extends AbstractJdbcRepository<FraudAlert, Long> {

    private final RowMapper<FraudAlert> rowMapper = rs -> {
        FraudAlert alert = new FraudAlert();
        alert.setId(rs.getLong("id"));
        alert.setTransactionId(rs.getLong("transaction_id"));
        alert.setRuleCode(rs.getString("rule_code"));
        alert.setSeverity(RiskLevel.fromString(rs.getString("severity")));
        alert.setMessage(rs.getString("message"));
        alert.setTriggeredAt(rs.getTimestamp("triggered_at"));
        return alert;
    };

    @Override
    protected String getTableName() {
        return "fraud_alerts";
    }

    @Override
    protected String getIdColumnName() {
        return "id";
    }

    @Override
    protected RowMapper<FraudAlert> getRowMapper() {
        return rowMapper;
    }

    @Override
    public FraudAlert save(FraudAlert alert) throws DatabaseException {
        return save(alert, null);
    }

    @Override
    public FraudAlert save(FraudAlert alert, Connection connection) throws DatabaseException {
        if (alert == null) {
            throw new IllegalArgumentException("FraudAlert cannot be null");
        }

        String sql = "INSERT INTO fraud_alerts (transaction_id, rule_code, severity, message, triggered_at) " +
                     "VALUES (?, ?, ?, ?, ?)";

        long generatedId = executeInsertAndReturnGeneratedId(
                connection,
                sql,
                alert.getTransactionId(),
                alert.getRuleCode(),
                alert.getSeverity() != null ? alert.getSeverity().name() : RiskLevel.MEDIUM.name(),
                alert.getMessage(),
                alert.getTriggeredAt()
        );

        alert.setId(generatedId);
        return alert;
    }

    @Override
    public FraudAlert update(FraudAlert alert) throws DatabaseException {
        return update(alert, null);
    }

    @Override
    public FraudAlert update(FraudAlert alert, Connection connection) throws DatabaseException {
        if (alert == null || alert.getId() == null) {
            throw new IllegalArgumentException("FraudAlert and ID cannot be null for update");
        }

        String sql = "UPDATE fraud_alerts SET severity = ?, message = ? WHERE id = ?";

        executeUpdateWithConnection(
                connection,
                sql,
                alert.getSeverity() != null ? alert.getSeverity().name() : RiskLevel.MEDIUM.name(),
                alert.getMessage(),
                alert.getId()
        );

        return alert;
    }

    /**
     * Finds all alerts raised for a particular transaction.
     */
    public List<FraudAlert> findAlertsByTransactionId(long transactionId) throws DatabaseException {
        return findAlertsByTransactionId(transactionId, null);
    }

    public List<FraudAlert> findAlertsByTransactionId(long transactionId, Connection connection) throws DatabaseException {
        String sql = "SELECT * FROM fraud_alerts WHERE transaction_id = ? ORDER BY triggered_at DESC";
        return queryForListWithConnection(connection, sql, transactionId);
    }

    /**
     * Finds all alerts involving transactions executed by a specific user.
     * Uses an inner join with the transactions table since user_id is on transactions.
     */
    public List<FraudAlert> findByUserId(long userId) throws DatabaseException {
        return findByUserId(userId, null);
    }

    public List<FraudAlert> findByUserId(long userId, Connection connection) throws DatabaseException {
        String sql = "SELECT fa.* FROM fraud_alerts fa " +
                     "INNER JOIN transactions t ON fa.transaction_id = t.id " +
                     "WHERE t.user_id = ? " +
                     "ORDER BY fa.triggered_at DESC";
        return queryForListWithConnection(connection, sql, userId);
    }
}
