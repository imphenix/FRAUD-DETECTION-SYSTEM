-- ====================================================================
-- Fraud Detection System - Database Schema (MySQL / MariaDB / H2 MySQL Mode)
-- 3rd Semester B.Tech Java Project
-- ====================================================================

-- 1. Users Table (Supports Admin and Customer hierarchy)
CREATE TABLE IF NOT EXISTS users (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    username VARCHAR(50) NOT NULL UNIQUE,
    password_hash VARCHAR(255) NOT NULL,
    full_name VARCHAR(100) NOT NULL,
    email VARCHAR(100) NOT NULL UNIQUE,
    phone VARCHAR(20),
    role VARCHAR(20) NOT NULL,              -- 'ADMIN', 'CUSTOMER'
    account_number VARCHAR(30) UNIQUE,
    balance DECIMAL(20, 2) NOT NULL DEFAULT 0.00,
    risk_profile VARCHAR(20) NOT NULL DEFAULT 'LOW', -- 'LOW', 'MEDIUM', 'HIGH'
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 2. Fraud Rules Table (Configurable evaluation thresholds)
CREATE TABLE IF NOT EXISTS fraud_rules (
    id INT AUTO_INCREMENT PRIMARY KEY,
    rule_code VARCHAR(50) NOT NULL UNIQUE, -- 'HIGH_AMOUNT', 'RAPID_TRANSACTIONS', etc.
    rule_name VARCHAR(100) NOT NULL,
    description TEXT,
    weight INT NOT NULL DEFAULT 20,         -- Score weight contribution (0-100)
    threshold_value DOUBLE NOT NULL,        -- Numeric boundary
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 3. Transactions Table (Core ledger of financial activities)
CREATE TABLE IF NOT EXISTS transactions (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    reference_id VARCHAR(64) NOT NULL UNIQUE,
    user_id BIGINT NOT NULL,
    sender_account VARCHAR(30) NOT NULL,
    recipient_account VARCHAR(30) NOT NULL,
    amount DECIMAL(20, 2) NOT NULL,
    transaction_type VARCHAR(30) NOT NULL,  -- 'TRANSFER', 'WITHDRAWAL', 'PAYMENT', 'DEPOSIT'
    status VARCHAR(30) NOT NULL,            -- 'PENDING', 'APPROVED', 'FLAGGED', 'BLOCKED', 'REJECTED'
    location VARCHAR(100) NOT NULL,
    ip_address VARCHAR(50),
    device_fingerprint VARCHAR(100),
    risk_score INT NOT NULL DEFAULT 0,      -- 0 to 100
    risk_level VARCHAR(20) NOT NULL DEFAULT 'LOW', -- 'LOW', 'MEDIUM', 'HIGH', 'CRITICAL'
    notes TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_tx_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

-- 4. Fraud Alerts Table (Triggered when individual rules flag a transaction)
CREATE TABLE IF NOT EXISTS fraud_alerts (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    transaction_id BIGINT NOT NULL,
    rule_code VARCHAR(50) NOT NULL,
    severity VARCHAR(20) NOT NULL,          -- 'LOW', 'MEDIUM', 'HIGH', 'CRITICAL'
    message TEXT NOT NULL,
    triggered_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_alert_tx FOREIGN KEY (transaction_id) REFERENCES transactions(id) ON DELETE CASCADE
);

-- 5. Fraud Cases Table (Opened for investigation by compliance officers / admins)
CREATE TABLE IF NOT EXISTS fraud_cases (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    case_number VARCHAR(64) NOT NULL UNIQUE,
    transaction_id BIGINT NOT NULL,
    user_id BIGINT NOT NULL,
    assigned_to BIGINT,
    status VARCHAR(30) NOT NULL,            -- 'OPEN', 'UNDER_INVESTIGATION', 'RESOLVED_FRAUD', 'RESOLVED_LEGITIMATE', 'DISMISSED'
    risk_score INT NOT NULL,
    investigation_notes TEXT,
    resolution_details TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_case_tx FOREIGN KEY (transaction_id) REFERENCES transactions(id) ON DELETE CASCADE,
    CONSTRAINT fk_case_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    CONSTRAINT fk_case_assignee FOREIGN KEY (assigned_to) REFERENCES users(id) ON DELETE SET NULL
);

-- Indices for rapid query performance
CREATE INDEX IF NOT EXISTS idx_tx_user_created ON transactions(user_id, created_at);
CREATE INDEX IF NOT EXISTS idx_tx_status ON transactions(status);
CREATE INDEX IF NOT EXISTS idx_alerts_tx ON fraud_alerts(transaction_id);
CREATE INDEX IF NOT EXISTS idx_cases_status ON fraud_cases(status);

-- ====================================================================
-- SEED DATA (Default Admin, Sample Customers, and Base Detection Rules)
-- ====================================================================

-- Passwords hashed with SHA-256 for: "admin123", "customer123", "alice123"
-- admin123:   240be518fabd2724ddb6f04eeb1da5967448d7e831c08c8fa822809f74c720a9
-- customer123: 8872b2609ebf16a0487440409c91ee0a86b97f02d4493f1ab94ce26fa32ec07d
-- alice123:    3a3f5a703ee52834b6e5117978c430a6f87498c0b759600a94e82b7db5b1a37c

MERGE INTO users (id, username, password_hash, full_name, email, phone, role, account_number, balance, risk_profile)
KEY(username)
VALUES 
(1, 'admin', '240be518fabd2724ddb6f04eeb1da5967448d7e831c08c8fa822809f74c720a9', 'System Security Admin', 'admin@fraudshield.internal', '+91-98765-01001', 'ADMIN', 'ACC-ADMIN-001', 0.00, 'LOW'),
(2, 'john_doe', '8872b2609ebf16a0487440409c91ee0a86b97f02d4493f1ab94ce26fa32ec07d', 'Johnathan Doe', 'john.doe@example.com', '+91-98765-01002', 'CUSTOMER', 'ACC-98421001', 500000.00, 'LOW'),
(3, 'alice_smith', '3a3f5a703ee52834b6e5117978c430a6f87498c0b759600a94e82b7db5b1a37c', 'Alice Smith', 'alice.smith@example.com', '+91-98765-01003', 'CUSTOMER', 'ACC-98421002', 250000.00, 'LOW');

MERGE INTO fraud_rules (id, rule_code, rule_name, description, weight, threshold_value, is_active)
KEY(rule_code)
VALUES 
(1, 'HIGH_AMOUNT', 'High Transaction Amount', 'Flags single transactions exceeding the absolute threshold limit (₹2,00,000).', 30, 200000.0, TRUE),
(2, 'RAPID_TRANSACTIONS', 'Rapid Velocity Spike', 'Flags more than 3 transactions executed within a short 5-minute time window.', 25, 3.0, TRUE),
(3, 'UNUSUAL_LOCATION', 'Geographic Location Mismatch', 'Flags transactions originating from locations different from customer typical Indian region.', 20, 1.0, TRUE),
(4, 'ODD_HOUR', 'Unusual Off-Hours Transaction', 'Flags transactions executed during high-risk nocturnal hours (01:00 to 05:00 AM).', 15, 1.0, TRUE),
(5, 'AMOUNT_DEVIATION', 'Surge Above Customer Average', 'Flags transactions that exceed 300% of the customer historical average transaction amount.', 25, 3.0, TRUE),
(6, 'REPEATED_FAILURES', 'Multiple Prior Failed Attempts', 'Flags transactions preceded by repeated rejected attempts within 1 hour.', 20, 2.0, TRUE);
