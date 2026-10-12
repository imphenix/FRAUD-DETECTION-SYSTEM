package com.fraud.dao;

import com.fraud.exception.DatabaseException;
import com.fraud.model.RiskLevel;
import com.fraud.model.Transaction;
import com.fraud.model.TransactionStatus;
import com.fraud.model.TransactionType;
import com.fraud.repository.AbstractJdbcRepository;
import com.fraud.repository.RowMapper;

import java.math.BigDecimal;
import java.sql.Connection;
import java.util.List;
import java.util.Optional;

/**
 * Concrete JDBC Data Access Object for {@link Transaction} entities.
 *
 * Demonstrates:
 * - Extension of AbstractJdbcRepository<Transaction, Long>
 * - Precise monetary persistence using BigDecimal
 * - Enum mapping between Java and SQL VARCHAR
 * - Query methods with connection awareness for ACID transaction participation
 */
public class TransactionDAO extends AbstractJdbcRepository<Transaction, Long> {

    private final RowMapper<Transaction> rowMapper = rs -> {
        Transaction tx = new Transaction();
        tx.setId(rs.getLong("id"));
        tx.setReferenceId(rs.getString("reference_id"));
        tx.setUserId(rs.getLong("user_id"));
        tx.setSenderAccount(rs.getString("sender_account"));
        tx.setRecipientAccount(rs.getString("recipient_account"));
        tx.setAmount(rs.getBigDecimal("amount"));
        tx.setTransactionType(TransactionType.fromString(rs.getString("transaction_type")));
        tx.setStatus(TransactionStatus.fromString(rs.getString("status")));
        tx.setLocation(rs.getString("location"));
        tx.setIpAddress(rs.getString("ip_address"));
        tx.setDeviceFingerprint(rs.getString("device_fingerprint"));
        int score = rs.getInt("risk_score");
        tx.setRiskScore(score);
        tx.setRiskLevel(RiskLevel.fromString(rs.getString("risk_level")));
        tx.setNotes(rs.getString("notes"));
        tx.setCreatedAt(rs.getTimestamp("created_at"));
        return tx;
    };

    @Override
    protected String getTableName() {
        return "transactions";
    }

    @Override
    protected String getIdColumnName() {
        return "id";
    }

    @Override
    protected RowMapper<Transaction> getRowMapper() {
        return rowMapper;
    }

    @Override
    public Transaction save(Transaction tx) throws DatabaseException {
        return save(tx, null);
    }

    @Override
    public Transaction save(Transaction tx, Connection connection) throws DatabaseException {
        if (tx == null) {
            throw new IllegalArgumentException("Transaction cannot be null");
        }

        String sql = "INSERT INTO transactions (reference_id, user_id, sender_account, recipient_account, amount, " +
                     "transaction_type, status, location, ip_address, device_fingerprint, risk_score, risk_level, notes, created_at) " +
                     "VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)";

        long generatedId = executeInsertAndReturnGeneratedId(
                connection,
                sql,
                tx.getReferenceId(),
                tx.getUserId(),
                tx.getSenderAccount(),
                tx.getRecipientAccount(),
                tx.getAmount() != null ? tx.getAmount() : BigDecimal.ZERO,
                tx.getTransactionType() != null ? tx.getTransactionType().name() : TransactionType.TRANSFER.name(),
                tx.getStatus() != null ? tx.getStatus().name() : TransactionStatus.PENDING.name(),
                tx.getLocation(),
                tx.getIpAddress(),
                tx.getDeviceFingerprint(),
                tx.getRiskScore(),
                tx.getRiskLevel() != null ? tx.getRiskLevel().name() : RiskLevel.LOW.name(),
                tx.getNotes(),
                tx.getCreatedAt()
        );

        tx.setId(generatedId);
        return tx;
    }

    @Override
    public Transaction update(Transaction tx) throws DatabaseException {
        return update(tx, null);
    }

    @Override
    public Transaction update(Transaction tx, Connection connection) throws DatabaseException {
        if (tx == null || tx.getId() == null) {
            throw new IllegalArgumentException("Transaction and ID cannot be null for update");
        }

        String sql = "UPDATE transactions SET status = ?, risk_score = ?, risk_level = ?, notes = ? WHERE id = ?";

        executeUpdateWithConnection(
                connection,
                sql,
                tx.getStatus() != null ? tx.getStatus().name() : TransactionStatus.PENDING.name(),
                tx.getRiskScore(),
                tx.getRiskLevel() != null ? tx.getRiskLevel().name() : RiskLevel.LOW.name(),
                tx.getNotes(),
                tx.getId()
        );

        return tx;
    }

    /**
     * Finds a transaction by its unique business reference ID.
     */
    public Optional<Transaction> findByReferenceId(String referenceId) throws DatabaseException {
        return findByReferenceId(referenceId, null);
    }

    public Optional<Transaction> findByReferenceId(String referenceId, Connection connection) throws DatabaseException {
        if (referenceId == null || referenceId.trim().isEmpty()) {
            return Optional.empty();
        }
        String sql = "SELECT * FROM transactions WHERE reference_id = ?";
        var list = queryForListWithConnection(connection, sql, referenceId.trim());
        return list.isEmpty() ? Optional.empty() : Optional.of(list.get(0));
    }

    /**
     * Finds all transactions executed by a particular user.
     */
    public List<Transaction> findByUserId(long userId) throws DatabaseException {
        return findByUserId(userId, null);
    }

    public List<Transaction> findByUserId(long userId, Connection connection) throws DatabaseException {
        String sql = "SELECT * FROM transactions WHERE user_id = ? ORDER BY created_at DESC";
        return queryForListWithConnection(connection, sql, userId);
    }

    /**
     * Finds recent transactions for a user limited by count (reverse chronological).
     */
    public List<Transaction> findRecentByUserId(long userId, int limit) throws DatabaseException {
        return findRecentByUserId(userId, limit, null);
    }

    public List<Transaction> findRecentByUserId(long userId, int limit, Connection connection) throws DatabaseException {
        int safeLimit = limit > 0 ? limit : 10;
        String sql = "SELECT * FROM transactions WHERE user_id = ? ORDER BY created_at DESC LIMIT " + safeLimit;
        return queryForListWithConnection(connection, sql, userId);
    }

    /**
     * Finds transactions filtered by their compliance status.
     */
    public List<Transaction> findByStatus(TransactionStatus status) throws DatabaseException {
        return findByStatus(status, null);
    }

    public List<Transaction> findByStatus(TransactionStatus status, Connection connection) throws DatabaseException {
        if (status == null) {
            return List.of();
        }
        String sql = "SELECT * FROM transactions WHERE status = ? ORDER BY created_at DESC";
        return queryForListWithConnection(connection, sql, status.name());
    }
}
