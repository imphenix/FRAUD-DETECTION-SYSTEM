package com.fraud.service;

import com.fraud.dao.UserDAO;
import com.fraud.exception.AuthenticationException;
import com.fraud.exception.DatabaseException;
import com.fraud.exception.ValidationException;
import com.fraud.model.Admin;
import com.fraud.model.Customer;
import com.fraud.model.RiskLevel;
import com.fraud.model.Role;
import com.fraud.model.User;
import com.fraud.util.HashUtil;

import java.math.BigDecimal;
import java.util.List;
import java.util.Objects;
import java.util.Optional;

/**
 * Service orchestrating User and Customer lifecycle operations, profile management,
 * balance updates, and credential validation.
 *
 * Demonstrates:
 * - Enterprise Layered Architecture (Service layer separating business rules from DAOs)
 * - Input validation with {@link ValidationException}
 * - Authentication verification using {@link AuthenticationException} and {@link HashUtil}
 * - Safe monetary balance adjustments with {@link BigDecimal}
 */
public class UserService {

    private final UserDAO userDAO;

    public UserService() {
        this(new UserDAO());
    }

    public UserService(UserDAO userDAO) {
        this.userDAO = Objects.requireNonNull(userDAO, "userDAO must not be null");
    }

    /**
     * Authenticates a user against stored SHA-256 password hash.
     * Supports authentication by username or email.
     */
     public User authenticate(String usernameOrEmail, String rawPassword) throws AuthenticationException, DatabaseException {
         if (usernameOrEmail == null || usernameOrEmail.trim().isEmpty()) {
             throw new AuthenticationException("Username or email cannot be empty");
         }
         if (rawPassword == null || rawPassword.isEmpty()) {
             throw new AuthenticationException("Password cannot be empty");
         }

         Optional<User> userOpt = userDAO.findByUsername(usernameOrEmail.trim());
         if (userOpt.isEmpty() && usernameOrEmail.contains("@")) {
             userOpt = userDAO.findByEmail(usernameOrEmail.trim());
         }

         if (userOpt.isEmpty()) {
             throw new AuthenticationException("Invalid username or password");
         }

         User user = userOpt.get();
         if (!user.authenticate(rawPassword)) {
             throw new AuthenticationException("Invalid username or password");
         }

         return user;
     }

    /**
     * Registers a new customer account after business validation.
     */
    public Customer registerCustomer(String username, String rawPassword, String fullName,
                                     String email, String phone, String accountNumber,
                                     BigDecimal initialBalance) throws ValidationException, DatabaseException {

        validateCustomerInput(username, rawPassword, fullName, email, accountNumber, initialBalance);

        if (userDAO.findByUsername(username.trim()).isPresent()) {
            throw new ValidationException("Username '" + username + "' is already taken");
        }
        if (userDAO.findByEmail(email.trim()).isPresent()) {
            throw new ValidationException("Email '" + email + "' is already registered");
        }
        if (userDAO.findByAccountNumber(accountNumber.trim()).isPresent()) {
            throw new ValidationException("Account number '" + accountNumber + "' is already in use");
        }

        String passwordHash = HashUtil.sha256(rawPassword);
        Customer customer = new Customer(null, username.trim(), passwordHash, fullName.trim(),
                email.trim(), phone != null ? phone.trim() : null, accountNumber.trim(),
                initialBalance, RiskLevel.LOW);

        User saved = userDAO.save(customer);
        return (Customer) saved;
    }

    /**
     * Registers a new system security administrator.
     */
    public Admin registerAdmin(String username, String rawPassword, String fullName,
                               String email, String phone) throws ValidationException, DatabaseException {

        if (username == null || username.trim().length() < 3) {
            throw new ValidationException("Username must be at least 3 characters long");
        }
        if (rawPassword == null || rawPassword.length() < 6) {
            throw new ValidationException("Password must be at least 6 characters long");
        }
        if (fullName == null || fullName.trim().isEmpty()) {
            throw new ValidationException("Full name is required");
        }
        if (email == null || !email.contains("@")) {
            throw new ValidationException("Valid email is required");
        }

        if (userDAO.findByUsername(username.trim()).isPresent()) {
            throw new ValidationException("Username '" + username + "' is already taken");
        }

        String passwordHash = HashUtil.sha256(rawPassword);
        Admin admin = new Admin(null, username.trim(), passwordHash, fullName.trim(), email.trim(), phone);
        User saved = userDAO.save(admin);
        return (Admin) saved;
    }

    /**
     * Retrieves a user by their identifier.
     */
    public Optional<User> getUserById(Long userId) throws DatabaseException {
        if (userId == null) {
            return Optional.empty();
        }
        return userDAO.findById(userId);
    }

    /**
     * Retrieves a user by their unique username.
     */
    public Optional<User> getUserByUsername(String username) throws DatabaseException {
        if (username == null || username.trim().isEmpty()) {
            return Optional.empty();
        }
        return userDAO.findByUsername(username.trim());
    }

    /**
     * Retrieves a customer by their bank account number.
     */
    public Optional<Customer> getCustomerByAccountNumber(String accountNumber) throws DatabaseException {
        if (accountNumber == null || accountNumber.trim().isEmpty()) {
            return Optional.empty();
        }
        Optional<User> userOpt = userDAO.findByAccountNumber(accountNumber.trim());
        return userOpt.filter(u -> u instanceof Customer).map(u -> (Customer) u);
    }

    /**
     * Updates customer account balance safely with validation.
     */
    public Customer updateBalance(Long customerId, BigDecimal delta) throws ValidationException, DatabaseException {
        if (customerId == null) {
            throw new ValidationException("Customer ID cannot be null");
        }
        if (delta == null) {
            throw new ValidationException("Delta amount cannot be null");
        }

        Optional<User> userOpt = userDAO.findById(customerId);
        if (userOpt.isEmpty() || !(userOpt.get() instanceof Customer)) {
            throw new ValidationException("Customer not found with ID: " + customerId);
        }

        Customer customer = (Customer) userOpt.get();
        BigDecimal newBalance = customer.getBalance().add(delta);
        if (newBalance.compareTo(BigDecimal.ZERO) < 0) {
            throw new ValidationException("Insufficient funds: current balance " + customer.getBalance() + ", requested " + delta);
        }

        customer.setBalance(newBalance);
        userDAO.update(customer);
        return customer;
    }

    /**
     * Updates customer risk profile (LOW, MEDIUM, HIGH).
     */
    public Customer updateRiskProfile(Long customerId, RiskLevel riskProfile) throws ValidationException, DatabaseException {
        if (customerId == null || riskProfile == null) {
            throw new ValidationException("Customer ID and RiskLevel cannot be null");
        }

        Optional<User> userOpt = userDAO.findById(customerId);
        if (userOpt.isEmpty() || !(userOpt.get() instanceof Customer)) {
            throw new ValidationException("Customer not found with ID: " + customerId);
        }

        Customer customer = (Customer) userOpt.get();
        customer.setRiskProfile(riskProfile);
        userDAO.update(customer);
        return customer;
    }

    /**
     * Retrieves all system users.
     */
    public List<User> getAllUsers() throws DatabaseException {
        return userDAO.findAll();
    }

    private void validateCustomerInput(String username, String rawPassword, String fullName,
                                       String email, String accountNumber, BigDecimal initialBalance)
            throws ValidationException {
        if (username == null || username.trim().length() < 3) {
            throw new ValidationException("Username must be at least 3 characters long");
        }
        if (rawPassword == null || rawPassword.length() < 6) {
            throw new ValidationException("Password must be at least 6 characters long");
        }
        if (fullName == null || fullName.trim().isEmpty()) {
            throw new ValidationException("Full name is required");
        }
        if (email == null || !email.contains("@")) {
            throw new ValidationException("Valid email address is required");
        }
        if (accountNumber == null || accountNumber.trim().isEmpty()) {
            throw new ValidationException("Account number is required");
        }
        if (initialBalance == null || initialBalance.compareTo(BigDecimal.ZERO) < 0) {
            throw new ValidationException("Initial balance cannot be negative");
        }
    }
}
