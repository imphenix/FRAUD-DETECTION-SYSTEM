package com.fraud.dao;

import com.fraud.exception.DatabaseException;
import com.fraud.model.CaseStatus;
import com.fraud.model.FraudCase;
import com.fraud.repository.AbstractJdbcRepository;
import com.fraud.repository.RowMapper;

import java.sql.Connection;
import java.sql.Types;
import java.util.List;
import java.util.Optional;

/**
 * Concrete JDBC Data Access Object for {@link FraudCase} entities.
 *
 * Demonstrates:
 * - Extension of AbstractJdbcRepository<FraudCase, Long>
 * - Investigation workflow persistence
 * - Support for nullable foreign key fields (assigned_to)
 * - Safe parameterized PreparedStatement queries
 */
public class FraudCaseDAO extends AbstractJdbcRepository<FraudCase, Long> {

    private final RowMapper<FraudCase> rowMapper = rs -> {
        FraudCase fCase = new FraudCase();
        fCase.setId(rs.getLong("id"));
        fCase.setCaseNumber(rs.getString("case_number"));
        fCase.setTransactionId(rs.getLong("transaction_id"));
        fCase.setUserId(rs.getLong("user_id"));

        long assignedToVal = rs.getLong("assigned_to");
        if (!rs.wasNull()) {
            fCase.setAssignedTo(assignedToVal);
        } else {
            fCase.setAssignedTo(null);
        }

        fCase.setStatus(CaseStatus.fromString(rs.getString("status")));
        fCase.setRiskScore(rs.getInt("risk_score"));
        fCase.setInvestigationNotes(rs.getString("investigation_notes"));
        fCase.setResolutionDetails(rs.getString("resolution_details"));
        fCase.setCreatedAt(rs.getTimestamp("created_at"));
        fCase.setUpdatedAt(rs.getTimestamp("updated_at"));
        return fCase;
    };

    @Override
    protected String getTableName() {
        return "fraud_cases";
    }

    @Override
    protected String getIdColumnName() {
        return "id";
    }

    @Override
    protected RowMapper<FraudCase> getRowMapper() {
        return rowMapper;
    }

    @Override
    public FraudCase save(FraudCase fCase) throws DatabaseException {
        return save(fCase, null);
    }

    @Override
    public FraudCase save(FraudCase fCase, Connection connection) throws DatabaseException {
        if (fCase == null) {
            throw new IllegalArgumentException("FraudCase cannot be null");
        }

        String sql = "INSERT INTO fraud_cases (case_number, transaction_id, user_id, assigned_to, status, " +
                     "risk_score, investigation_notes, resolution_details, created_at, updated_at) " +
                     "VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)";

        long generatedId = executeInsertAndReturnGeneratedId(
                connection,
                sql,
                fCase.getCaseNumber(),
                fCase.getTransactionId(),
                fCase.getUserId(),
                fCase.getAssignedTo(), // AbstractJdbcRepository.bindParameters handles null with setObject
                fCase.getStatus() != null ? fCase.getStatus().name() : CaseStatus.OPEN.name(),
                fCase.getRiskScore(),
                fCase.getInvestigationNotes(),
                fCase.getResolutionDetails(),
                fCase.getCreatedAt(),
                fCase.getUpdatedAt()
        );

        fCase.setId(generatedId);
        return fCase;
    }

    @Override
    public FraudCase update(FraudCase fCase) throws DatabaseException {
        return update(fCase, null);
    }

    @Override
    public FraudCase update(FraudCase fCase, Connection connection) throws DatabaseException {
        if (fCase == null || fCase.getId() == null) {
            throw new IllegalArgumentException("FraudCase and ID cannot be null for update");
        }

        String sql = "UPDATE fraud_cases SET assigned_to = ?, status = ?, investigation_notes = ?, " +
                     "resolution_details = ?, updated_at = ? WHERE id = ?";

        executeUpdateWithConnection(
                connection,
                sql,
                fCase.getAssignedTo(),
                fCase.getStatus() != null ? fCase.getStatus().name() : CaseStatus.OPEN.name(),
                fCase.getInvestigationNotes(),
                fCase.getResolutionDetails(),
                new java.sql.Timestamp(System.currentTimeMillis()),
                fCase.getId()
        );

        return fCase;
    }

    /**
     * Finds all active open or under-investigation fraud cases.
     */
    public List<FraudCase> findOpenCases() throws DatabaseException {
        return findOpenCases(null);
    }

    public List<FraudCase> findOpenCases(Connection connection) throws DatabaseException {
        String sql = "SELECT * FROM fraud_cases WHERE status IN ('OPEN', 'INVESTIGATING', 'UNDER_INVESTIGATION') ORDER BY created_at DESC";
        return queryForListWithConnection(connection, sql);
    }

    /**
     * Finds a fraud case opened for a specific transaction.
     */
    public Optional<FraudCase> findByTransactionId(long transactionId) throws DatabaseException {
        return findByTransactionId(transactionId, null);
    }

    public Optional<FraudCase> findByTransactionId(long transactionId, Connection connection) throws DatabaseException {
        String sql = "SELECT * FROM fraud_cases WHERE transaction_id = ?";
        var list = queryForListWithConnection(connection, sql, transactionId);
        return list.isEmpty() ? Optional.empty() : Optional.of(list.get(0));
    }

    /**
     * Finds all fraud cases involving a specific user account.
     */
    public List<FraudCase> findByUserId(long userId) throws DatabaseException {
        return findByUserId(userId, null);
    }

    public List<FraudCase> findByUserId(long userId, Connection connection) throws DatabaseException {
        String sql = "SELECT * FROM fraud_cases WHERE user_id = ? ORDER BY created_at DESC";
        return queryForListWithConnection(connection, sql, userId);
    }

    /**
     * Finds a case by its unique tracking case number.
     */
    public Optional<FraudCase> findByCaseNumber(String caseNumber) throws DatabaseException {
        return findByCaseNumber(caseNumber, null);
    }

    public Optional<FraudCase> findByCaseNumber(String caseNumber, Connection connection) throws DatabaseException {
        if (caseNumber == null || caseNumber.trim().isEmpty()) {
            return Optional.empty();
        }
        String sql = "SELECT * FROM fraud_cases WHERE case_number = ?";
        var list = queryForListWithConnection(connection, sql, caseNumber.trim());
        return list.isEmpty() ? Optional.empty() : Optional.of(list.get(0));
    }
}
