package com.fraud.dao;

import com.fraud.exception.DatabaseException;
import com.fraud.model.Admin;
import com.fraud.model.Customer;
import com.fraud.model.RiskLevel;
import com.fraud.model.Role;
import com.fraud.model.User;
import com.fraud.repository.AbstractJdbcRepository;
import com.fraud.repository.RowMapper;

import java.math.BigDecimal;
import java.sql.Connection;
import java.sql.SQLException;
import java.util.Optional;

/**
 * Concrete JDBC Data Access Object for {@link User} entities (supporting {@link Admin} and {@link Customer}).
 *
 * Demonstrates:
 * - Extension of AbstractJdbcRepository<User, Long>
 * - Polymorphic entity instantiation based on discriminator column 'role'
 * - Clean PreparedStatement parameterized queries
 * - Support for ambient JDBC connections for transactional safety
 */
public class UserDAO extends AbstractJdbcRepository<User, Long> {

    private final RowMapper<User> rowMapper = rs -> {
        long id = rs.getLong("id");
        String username = rs.getString("username");
        String passwordHash = rs.getString("password_hash");
        String fullName = rs.getString("full_name");
        String email = rs.getString("email");
        String phone = rs.getString("phone");
        String roleStr = rs.getString("role");
        String accountNumber = rs.getString("account_number");
        BigDecimal balance = rs.getBigDecimal("balance");
        String riskProfileStr = rs.getString("risk_profile");

        Role role = "ADMIN".equalsIgnoreCase(roleStr) ? Role.ADMIN : Role.CUSTOMER;
        User user;
        if (role == Role.ADMIN) {
            user = new Admin(id, username, passwordHash, fullName, email, phone);
        } else {
            RiskLevel riskProfile = RiskLevel.fromString(riskProfileStr);
            user = new Customer(id, username, passwordHash, fullName, email, phone, accountNumber, balance, riskProfile);
        }

        user.setCreatedAt(rs.getTimestamp("created_at"));
        user.setUpdatedAt(rs.getTimestamp("updated_at"));
        return user;
    };

    @Override
    protected String getTableName() {
        return "users";
    }

    @Override
    protected String getIdColumnName() {
        return "id";
    }

    @Override
    protected RowMapper<User> getRowMapper() {
        return rowMapper;
    }

    @Override
    public User save(User user) throws DatabaseException {
        return save(user, null);
    }

    @Override
    public User save(User user, Connection connection) throws DatabaseException {
        if (user == null) {
            throw new IllegalArgumentException("User cannot be null");
        }

        String sql = "INSERT INTO users (username, password_hash, full_name, email, phone, role, account_number, balance, risk_profile, created_at, updated_at) " +
                     "VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)";

        String accountNumber = null;
        BigDecimal balance = BigDecimal.ZERO;
        String riskProfile = "LOW";

        if (user instanceof Customer) {
            Customer cust = (Customer) user;
            accountNumber = cust.getAccountNumber();
            balance = cust.getBalance() != null ? cust.getBalance() : BigDecimal.ZERO;
            riskProfile = cust.getRiskProfile() != null ? cust.getRiskProfile().name() : "LOW";
        }

        long generatedId = executeInsertAndReturnGeneratedId(
                connection,
                sql,
                user.getUsername(),
                user.getPasswordHash(),
                user.getFullName(),
                user.getEmail(),
                user.getPhone(),
                user.getRole() != null ? user.getRole().name() : Role.CUSTOMER.name(),
                accountNumber,
                balance,
                riskProfile,
                user.getCreatedAt(),
                user.getUpdatedAt()
        );

        user.setId(generatedId);
        return user;
    }

    @Override
    public User update(User user) throws DatabaseException {
        return update(user, null);
    }

    @Override
    public User update(User user, Connection connection) throws DatabaseException {
        if (user == null || user.getId() == null) {
            throw new IllegalArgumentException("User and ID cannot be null for update");
        }

        String sql = "UPDATE users SET full_name = ?, email = ?, phone = ?, account_number = ?, balance = ?, risk_profile = ?, updated_at = ? " +
                     "WHERE id = ?";

        String accountNumber = null;
        BigDecimal balance = BigDecimal.ZERO;
        String riskProfile = "LOW";

        if (user instanceof Customer) {
            Customer cust = (Customer) user;
            accountNumber = cust.getAccountNumber();
            balance = cust.getBalance() != null ? cust.getBalance() : BigDecimal.ZERO;
            riskProfile = cust.getRiskProfile() != null ? cust.getRiskProfile().name() : "LOW";
        }

        executeUpdateWithConnection(
                connection,
                sql,
                user.getFullName(),
                user.getEmail(),
                user.getPhone(),
                accountNumber,
                balance,
                riskProfile,
                new java.sql.Timestamp(System.currentTimeMillis()),
                user.getId()
        );

        return user;
    }

    /**
     * Finds a user by their unique username.
     */
    public Optional<User> findByUsername(String username) throws DatabaseException {
        return findByUsername(username, null);
    }

    /**
     * Finds a user by their unique username within a transactional connection.
     */
    public Optional<User> findByUsername(String username, Connection connection) throws DatabaseException {
        if (username == null || username.trim().isEmpty()) {
            return Optional.empty();
        }
        String sql = "SELECT * FROM users WHERE LOWER(username) = LOWER(?)";
        var list = queryForListWithConnection(connection, sql, username.trim());
        return list.isEmpty() ? Optional.empty() : Optional.of(list.get(0));
    }

    /**
     * Finds a user by their unique email.
     */
    public Optional<User> findByEmail(String email) throws DatabaseException {
        return findByEmail(email, null);
    }

    /**
     * Finds a user by their unique email within a transactional connection.
     */
    public Optional<User> findByEmail(String email, Connection connection) throws DatabaseException {
        if (email == null || email.trim().isEmpty()) {
            return Optional.empty();
        }
        String sql = "SELECT * FROM users WHERE LOWER(email) = LOWER(?)";
        var list = queryForListWithConnection(connection, sql, email.trim());
        return list.isEmpty() ? Optional.empty() : Optional.of(list.get(0));
    }

    /**
     * Finds a customer by their unique bank account number.
     */
    public Optional<User> findByAccountNumber(String accountNumber) throws DatabaseException {
        return findByAccountNumber(accountNumber, null);
    }

    /**
     * Finds a customer by their unique bank account number within a transactional connection.
     */
    public Optional<User> findByAccountNumber(String accountNumber, Connection connection) throws DatabaseException {
        if (accountNumber == null || accountNumber.trim().isEmpty()) {
            return Optional.empty();
        }
        String sql = "SELECT * FROM users WHERE account_number = ?";
        var list = queryForListWithConnection(connection, sql, accountNumber.trim());
        return list.isEmpty() ? Optional.empty() : Optional.of(list.get(0));
    }
}
