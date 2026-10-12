# Database Setup Guide & Architecture

## 1. Overview
The Fraud Detection System utilizes a relational database management model configured for **MySQL 8+**, **MariaDB**, and an automatic **Embedded H2 fallback (MySQL mode)**. This ensures that the application runs in production on real database servers while remaining 100% turnkey for academic viva demonstrations and automated test evaluation.

---

## 2. Table Specifications

### A. `users`
Stores user profile information with role-based segregation (`ADMIN` vs. `CUSTOMER`).
- `id` (BIGINT, PRIMARY KEY, AUTO_INCREMENT): Unique user identifier.
- `username` (VARCHAR(50), UNIQUE): Login username.
- `password_hash` (VARCHAR(255)): SHA-256 salted password hash (never plain text).
- `full_name` (VARCHAR(100)): Customer or administrator name.
- `email` (VARCHAR(100), UNIQUE): Contact email address.
- `phone` (VARCHAR(20)): Phone number.
- `role` (VARCHAR(20)): User role (`ADMIN` or `CUSTOMER`).
- `account_number` (VARCHAR(30), UNIQUE): Bank account identifier.
- `balance` (DECIMAL(15,2)): Current account ledger balance.
- `risk_profile` (VARCHAR(20)): Historical profile status (`LOW`, `MEDIUM`, `HIGH`).
- `created_at` / `updated_at` (TIMESTAMP): Audit timestamps.

### B. `fraud_rules`
Stores the dynamic rule engine parameters and evaluation weights.
- `id` (INT, PRIMARY KEY, AUTO_INCREMENT)
- `rule_code` (VARCHAR(50), UNIQUE): E.g., `HIGH_AMOUNT`, `RAPID_TRANSACTIONS`, `UNUSUAL_LOCATION`, `ODD_HOUR`, `AMOUNT_DEVIATION`, `REPEATED_FAILURES`.
- `rule_name` (VARCHAR(100)): Human-readable label.
- `description` (TEXT): Rule explanation.
- `weight` (INT): Contribution score (0–100) toward overall transaction risk.
- `threshold_value` (DOUBLE): Numeric boundary condition.
- `is_active` (BOOLEAN): Toggle rule evaluation on/off.

### C. `transactions`
Financial ledger records submitted for risk analysis.
- `id` (BIGINT, PRIMARY KEY, AUTO_INCREMENT)
- `reference_id` (VARCHAR(64), UNIQUE): UUID / idempotency tracking token.
- `user_id` (BIGINT, FOREIGN KEY -> `users.id`)
- `sender_account` (VARCHAR(30))
- `recipient_account` (VARCHAR(30))
- `amount` (DECIMAL(15,2))
- `transaction_type` (VARCHAR(30)): `TRANSFER`, `WITHDRAWAL`, `PAYMENT`, `DEPOSIT`.
- `status` (VARCHAR(30)): `PENDING`, `APPROVED`, `FLAGGED`, `BLOCKED`, `REJECTED`.
- `location` (VARCHAR(100)): City/Country of transaction origin.
- `ip_address` (VARCHAR(50)): Originating client IP.
- `device_fingerprint` (VARCHAR(100)): Client hardware fingerprint.
- `risk_score` (INT): Calculated risk score between 0 and 100.
- `risk_level` (VARCHAR(20)): `LOW`, `MEDIUM`, `HIGH`, `CRITICAL`.
- `notes` (TEXT): Diagnostic reasons or system comments.

### D. `fraud_alerts`
Created when an individual fraud detection rule flags a transaction.
- `id` (BIGINT, PRIMARY KEY, AUTO_INCREMENT)
- `transaction_id` (BIGINT, FOREIGN KEY -> `transactions.id`)
- `rule_code` (VARCHAR(50))
- `severity` (VARCHAR(20)): `LOW`, `MEDIUM`, `HIGH`, `CRITICAL`.
- `message` (TEXT): Explanation of why the rule fired.
- `triggered_at` (TIMESTAMP)

### E. `fraud_cases`
Investigation records opened for security analysts when transactions are flagged or blocked.
- `id` (BIGINT, PRIMARY KEY, AUTO_INCREMENT)
- `case_number` (VARCHAR(64), UNIQUE)
- `transaction_id` (BIGINT, FOREIGN KEY -> `transactions.id`)
- `user_id` (BIGINT, FOREIGN KEY -> `users.id`)
- `assigned_to` (BIGINT, FOREIGN KEY -> `users.id` nullable)
- `status` (VARCHAR(30)): `OPEN`, `UNDER_INVESTIGATION`, `RESOLVED_FRAUD`, `RESOLVED_LEGITIMATE`, `DISMISSED`.
- `risk_score` (INT)
- `investigation_notes` (TEXT)
- `resolution_details` (TEXT)

---

## 3. Database Configuration (`db.properties`)
Located at `src/main/resources/db.properties`:
```properties
db.driver=com.mysql.cj.jdbc.Driver
db.url=jdbc:mysql://localhost:3306/fraud_detection_db?useSSL=false&allowPublicKeyRetrieval=true&serverTimezone=UTC&createDatabaseIfNotExist=true
db.username=root
db.password=root

# Fallback Configuration
db.fallback.h2.enabled=true
db.fallback.h2.driver=org.h2.Driver
db.fallback.h2.url=jdbc:h2:mem:fraud_detection_db;MODE=MySQL;DATABASE_TO_LOWER=TRUE;DB_CLOSE_DELAY=-1
```

---

## 4. Manual Setup in MySQL/MariaDB
To run against a local MySQL or MariaDB instance:
1. Start the MySQL service:
   ```bash
   sudo systemctl start mysql
   ```
2. Log in with administrative rights:
   ```bash
   mysql -u root -p
   ```
3. Create the database and user:
   ```sql
   CREATE DATABASE fraud_detection_db CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
   CREATE USER 'fraud_user'@'localhost' IDENTIFIED BY 'fraud_secret';
   GRANT ALL PRIVILEGES ON fraud_detection_db.* TO 'fraud_user'@'localhost';
   FLUSH PRIVILEGES;
   ```
4. Update `db.properties` with the user credentials:
   ```properties
   db.username=fraud_user
   db.password=fraud_secret
   ```
5. On initial launch, `DatabaseConnection.initializeDatabaseSchema()` will automatically execute `schema.sql` to generate all tables and default seed records.
