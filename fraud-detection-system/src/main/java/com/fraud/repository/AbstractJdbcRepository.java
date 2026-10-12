package com.fraud.repository;

import com.fraud.exception.DatabaseException;
import com.fraud.util.DatabaseConnection;

import java.sql.Connection;
import java.sql.PreparedStatement;
import java.sql.ResultSet;
import java.sql.SQLException;
import java.sql.Statement;
import java.util.ArrayList;
import java.util.List;
import java.util.Optional;
import java.util.logging.Level;
import java.util.logging.Logger;

/**
 * Reusable abstract JDBC repository providing robust template methods for CRUD operations.
 *
 * Demonstrates:
 * - OOP Abstraction and Polymorphism
 * - Generic Type Parameters (<T, ID>)
 * - Elimination of boilerplate JDBC code (connections, PreparedStatements, ResultSets)
 * - Safe parameterized query execution avoiding SQL Injection
 * - Checked Exception Translation (SQLException -> DatabaseException)
 *
 * @param <T>  The domain entity class
 * @param <ID> The entity identifier type (e.g., Long, Integer, String)
 */
public abstract class AbstractJdbcRepository<T, ID> implements Repository<T, ID> {

    protected final Logger logger = Logger.getLogger(getClass().getName());

    /**
     * @return the primary SQL table name managed by this repository
     */
    protected abstract String getTableName();

    /**
     * @return the primary key column name (e.g., "id")
     */
    protected abstract String getIdColumnName();

    /**
     * @return the RowMapper instance responsible for mapping ResultSet rows into entity instances
     */
    protected abstract RowMapper<T> getRowMapper();

    /**
     * Overloaded helper: Acquires connection from pool if external connection is not provided.
     */
    protected Connection resolveConnection(Connection ambientConnection) throws SQLException {
        if (ambientConnection != null && !ambientConnection.isClosed()) {
            return ambientConnection;
        }
        return DatabaseConnection.getConnection();
    }

    /**
     * Closes the connection only if it was opened locally (not part of an ambient transaction).
     */
    protected void releaseConnection(Connection targetConn, Connection ambientConn) {
        if (ambientConn == null && targetConn != null) {
            DatabaseConnection.closeConnection(targetConn);
        }
    }

    @Override
    public Optional<T> findById(ID id) throws DatabaseException {
        if (id == null) {
            return Optional.empty();
        }
        String sql = "SELECT * FROM " + getTableName() + " WHERE " + getIdColumnName() + " = ?";
        return queryForObject(sql, id);
    }

    @Override
    public List<T> findAll() throws DatabaseException {
        String sql = "SELECT * FROM " + getTableName() + " ORDER BY " + getIdColumnName() + " DESC";
        return queryForList(sql);
    }

    @Override
    public boolean deleteById(ID id) throws DatabaseException {
        if (id == null) {
            return false;
        }
        String sql = "DELETE FROM " + getTableName() + " WHERE " + getIdColumnName() + " = ?";
        return executeUpdate(sql, id) > 0;
    }

    @Override
    public long count() throws DatabaseException {
        String sql = "SELECT COUNT(*) FROM " + getTableName();
        Connection conn = null;
        PreparedStatement ps = null;
        ResultSet rs = null;
        try {
            conn = DatabaseConnection.getConnection();
            ps = conn.prepareStatement(sql);
            rs = ps.executeQuery();
            if (rs.next()) {
                return rs.getLong(1);
            }
            return 0L;
        } catch (SQLException e) {
            throw new DatabaseException("Failed to count records in " + getTableName(), e);
        } finally {
            DatabaseConnection.closeQuietly(rs, ps, conn);
        }
    }

    @Override
    public boolean existsById(ID id) throws DatabaseException {
        if (id == null) {
            return false;
        }
        String sql = "SELECT 1 FROM " + getTableName() + " WHERE " + getIdColumnName() + " = ? LIMIT 1";
        Connection conn = null;
        PreparedStatement ps = null;
        ResultSet rs = null;
        try {
            conn = DatabaseConnection.getConnection();
            ps = conn.prepareStatement(sql);
            ps.setObject(1, id);
            rs = ps.executeQuery();
            return rs.next();
        } catch (SQLException e) {
            throw new DatabaseException("Failed to check existence in " + getTableName() + " for id=" + id, e);
        } finally {
            DatabaseConnection.closeQuietly(rs, ps, conn);
        }
    }

    /**
     * Generic query template to retrieve a single entity.
     *
     * @param sql the parameterized SQL statement
     * @param params parameters to bind
     * @return Optional containing the entity or empty
     * @throws DatabaseException on SQL error
     */
    protected Optional<T> queryForObject(String sql, Object... params) throws DatabaseException {
        List<T> list = queryForList(sql, params);
        if (list.isEmpty()) {
            return Optional.empty();
        }
        return Optional.of(list.get(0));
    }

    /**
     * Generic query template to retrieve a list of entities.
     *
     * @param sql the parameterized SQL statement
     * @param params parameters to bind
     * @return List of mapped entities
     * @throws DatabaseException on SQL error
     */
    protected List<T> queryForList(String sql, Object... params) throws DatabaseException {
        return queryForListWithConnection(null, sql, params);
    }

    /**
     * Generic query template supporting an ambient transactional connection.
     */
    protected List<T> queryForListWithConnection(Connection ambientConn, String sql, Object... params) throws DatabaseException {
        List<T> results = new ArrayList<>();
        Connection conn = null;
        PreparedStatement ps = null;
        ResultSet rs = null;
        try {
            conn = resolveConnection(ambientConn);
            ps = conn.prepareStatement(sql);
            bindParameters(ps, params);
            rs = ps.executeQuery();
            RowMapper<T> mapper = getRowMapper();
            while (rs.next()) {
                results.add(mapper.mapRow(rs));
            }
            return results;
        } catch (SQLException e) {
            logger.log(Level.SEVERE, "Error executing query: " + sql, e);
            throw new DatabaseException("Database query failed: " + e.getMessage(), e);
        } finally {
            DatabaseConnection.closeQuietly(rs, ps);
            releaseConnection(conn, ambientConn);
        }
    }

    /**
     * Executes an INSERT / UPDATE / DELETE statement.
     *
     * @param sql the SQL to execute
     * @param params parameters to bind
     * @return number of affected rows
     * @throws DatabaseException on SQL error
     */
    protected int executeUpdate(String sql, Object... params) throws DatabaseException {
        return executeUpdateWithConnection(null, sql, params);
    }

    /**
     * Executes an INSERT / UPDATE / DELETE statement using an ambient or standalone connection.
     */
    protected int executeUpdateWithConnection(Connection ambientConn, String sql, Object... params) throws DatabaseException {
        Connection conn = null;
        PreparedStatement ps = null;
        try {
            conn = resolveConnection(ambientConn);
            ps = conn.prepareStatement(sql);
            bindParameters(ps, params);
            return ps.executeUpdate();
        } catch (SQLException e) {
            logger.log(Level.SEVERE, "Error executing update: " + sql, e);
            throw new DatabaseException("Database update failed: " + e.getMessage(), e);
        } finally {
            DatabaseConnection.closeQuietly(ps);
            releaseConnection(conn, ambientConn);
        }
    }

    /**
     * Executes an INSERT statement and retrieves the generated auto-increment BIGINT primary key.
     *
     * @param ambientConn existing transaction connection or null
     * @param sql the INSERT SQL string
     * @param params bind parameters
     * @return generated ID or -1 if not generated
     * @throws DatabaseException on SQL error
     */
    protected long executeInsertAndReturnGeneratedId(Connection ambientConn, String sql, Object... params) throws DatabaseException {
        Connection conn = null;
        PreparedStatement ps = null;
        ResultSet rs = null;
        try {
            conn = resolveConnection(ambientConn);
            ps = conn.prepareStatement(sql, Statement.RETURN_GENERATED_KEYS);
            bindParameters(ps, params);
            int affected = ps.executeUpdate();
            if (affected == 0) {
                throw new DatabaseException("Creating record failed, no rows affected: " + sql);
            }
            rs = ps.getGeneratedKeys();
            if (rs.next()) {
                return rs.getLong(1);
            }
            return -1L;
        } catch (SQLException e) {
            logger.log(Level.SEVERE, "Error executing insert with generated key: " + sql, e);
            throw new DatabaseException("Failed to insert record and retrieve key: " + e.getMessage(), e);
        } finally {
            DatabaseConnection.closeQuietly(rs, ps);
            releaseConnection(conn, ambientConn);
        }
    }

    /**
     * Binds variable parameters to a PreparedStatement using 1-based indexing.
     */
    protected void bindParameters(PreparedStatement ps, Object... params) throws SQLException {
        if (params == null || params.length == 0) {
            return;
        }
        for (int i = 0; i < params.length; i++) {
            ps.setObject(i + 1, params[i]);
        }
    }
}
