package com.fraud.util;

import com.fraud.exception.DatabaseException;
import com.zaxxer.hikari.HikariConfig;
import com.zaxxer.hikari.HikariDataSource;

import java.io.BufferedReader;
import java.io.InputStream;
import java.io.InputStreamReader;
import java.nio.charset.StandardCharsets;
import java.sql.Connection;
import java.sql.DriverManager;
import java.sql.SQLException;
import java.sql.Statement;
import java.util.Properties;
import java.util.logging.Level;
import java.util.logging.Logger;

/**
 * Thread-safe Database Connection Manager.
 * 
 * Demonstrates:
 * - Singleton Design Pattern for connection pooling
 * - Static utility methods for JDBC resource lifecycle management
 * - Automatic failover to embedded H2 (MySQL mode) for zero-setup academic demonstration
 * - Integration with PreparedStatement and transaction isolation
 */
public final class DatabaseConnection {

    private static final Logger LOGGER = Logger.getLogger(DatabaseConnection.class.getName());
    private static final String CONFIG_FILE = "db.properties";

    private static volatile DatabaseConnection instance;
    private static volatile HikariDataSource dataSource;
    private static volatile boolean isFallbackEngaged = false;
    private static volatile String activeJdbcUrl = "";

    // Private constructor prevents direct instantiation outside getInstance()
    private DatabaseConnection() {
        initDataSource();
    }

    /**
     * Thread-safe double-checked locking singleton accessor.
     */
    public static DatabaseConnection getInstance() {
        if (instance == null) {
            synchronized (DatabaseConnection.class) {
                if (instance == null) {
                    DatabaseConnection temp = new DatabaseConnection();
                    instance = temp;
                    temp.initializeDatabaseSchema();
                }
            }
        }
        return instance;
    }

    /**
     * Initializes HikariCP Connection Pool with primary MySQL or fallback H2.
     */
    private void initDataSource() {
        Properties props = loadProperties();

        String primaryDriver = props.getProperty("db.driver", "com.mysql.cj.jdbc.Driver");
        String primaryUrl = props.getProperty("db.url");
        String primaryUser = props.getProperty("db.username", "root");
        String primaryPass = props.getProperty("db.password", "root");

        boolean fallbackEnabled = Boolean.parseBoolean(props.getProperty("db.fallback.h2.enabled", "true"));
        String fallbackDriver = props.getProperty("db.fallback.h2.driver", "org.h2.Driver");
        String fallbackUrl = props.getProperty("db.fallback.h2.url", "jdbc:h2:mem:fraud_detection_db;MODE=MySQL;DATABASE_TO_LOWER=TRUE;DB_CLOSE_DELAY=-1");
        String fallbackUser = props.getProperty("db.fallback.h2.username", "sa");
        String fallbackPass = props.getProperty("db.fallback.h2.password", "");

        boolean primaryConnected = false;
        try {
            Class.forName(primaryDriver);
            HikariConfig config = new HikariConfig();
            config.setDriverClassName(primaryDriver);
            config.setJdbcUrl(primaryUrl);
            config.setUsername(primaryUser);
            config.setPassword(primaryPass);
            config.setMaximumPoolSize(Integer.parseInt(props.getProperty("db.pool.maxPoolSize", "10")));
            config.setMinimumIdle(Integer.parseInt(props.getProperty("db.pool.minIdle", "2")));
            config.setConnectionTimeout(1500); // 1.5s fast detection
            config.setInitializationFailTimeout(1500);
            config.setPoolName("FraudDetection-Primary-Pool");

            dataSource = new HikariDataSource(config);
            try (Connection testConn = dataSource.getConnection()) {
                primaryConnected = true;
                activeJdbcUrl = primaryUrl;
                LOGGER.info("Connected to primary MySQL database: " + primaryUrl);
            }
        } catch (Throwable e) {
            LOGGER.log(Level.WARNING, "Primary database connection not reachable. Engaging fallback: " + e.getMessage());
            if (dataSource != null && !dataSource.isClosed()) {
                dataSource.close();
                dataSource = null;
            }
            primaryConnected = false;
        }

        if (!primaryConnected && fallbackEnabled) {
            try {
                LOGGER.info("Engaging embedded H2 database engine (MySQL compatibility mode) for zero-setup execution.");
                Class.forName(fallbackDriver);
                HikariConfig fallbackConfig = new HikariConfig();
                fallbackConfig.setDriverClassName(fallbackDriver);
                fallbackConfig.setJdbcUrl(fallbackUrl);
                fallbackConfig.setUsername(fallbackUser);
                fallbackConfig.setPassword(fallbackPass);
                fallbackConfig.setMaximumPoolSize(10);
                fallbackConfig.setMinimumIdle(2);
                fallbackConfig.setConnectionTimeout(3000);
                fallbackConfig.setPoolName("FraudDetection-H2Fallback-Pool");

                dataSource = new HikariDataSource(fallbackConfig);
                isFallbackEngaged = true;
                activeJdbcUrl = fallbackUrl;
                LOGGER.info("Embedded H2 database pool initialized successfully.");
            } catch (Exception ex) {
                LOGGER.log(Level.SEVERE, "Failed to initialize fallback database pool", ex);
                throw new RuntimeException("Cannot initialize any database connection pool", ex);
            }
        }
    }

    /**
     * Loads database configuration properties from classpath.
     */
    private Properties loadProperties() {
        Properties props = new Properties();
        try (InputStream in = getClass().getClassLoader().getResourceAsStream(CONFIG_FILE)) {
            if (in != null) {
                props.load(in);
            } else {
                LOGGER.warning("Could not find " + CONFIG_FILE + " on classpath. Using defaults.");
            }
        } catch (Exception e) {
            LOGGER.log(Level.WARNING, "Error reading " + CONFIG_FILE + ": " + e.getMessage());
        }
        return props;
    }

    /**
     * Acquires a pooled JDBC Connection.
     */
    public static Connection getConnection() throws SQLException {
        getInstance();
        if (dataSource == null || dataSource.isClosed()) {
            throw new SQLException("Database connection pool is not initialized or closed.");
        }
        return dataSource.getConnection();
    }

    /**
     * Creates a raw dedicated connection for direct manual JDBC transaction demonstrations.
     */
    public static Connection getDedicatedConnection() throws SQLException, DatabaseException {
        getInstance();
        Properties props = getInstance().loadProperties();
        try {
            if (isFallbackEngaged) {
                String driver = props.getProperty("db.fallback.h2.driver", "org.h2.Driver");
                String url = props.getProperty("db.fallback.h2.url", "jdbc:h2:mem:fraud_detection_db;MODE=MySQL;DATABASE_TO_LOWER=TRUE;DB_CLOSE_DELAY=-1");
                Class.forName(driver);
                return DriverManager.getConnection(url, props.getProperty("db.fallback.h2.username", "sa"), "");
            } else {
                String driver = props.getProperty("db.driver", "com.mysql.cj.jdbc.Driver");
                String url = props.getProperty("db.url");
                Class.forName(driver);
                return DriverManager.getConnection(url, props.getProperty("db.username", "root"), props.getProperty("db.password", "root"));
            }
        } catch (ClassNotFoundException e) {
            throw new DatabaseException("JDBC Driver class not found", e);
        }
    }

    /**
     * Reads schema.sql and runs DDL & seed scripts if not already present.
     */
    public synchronized void initializeDatabaseSchema() {
        if (dataSource == null) return;
        try (Connection conn = dataSource.getConnection();
             Statement stmt = conn.createStatement();
             InputStream in = getClass().getClassLoader().getResourceAsStream("schema.sql")) {

            if (in == null) {
                LOGGER.warning("schema.sql not found on classpath.");
                return;
            }

            try (BufferedReader reader = new BufferedReader(new InputStreamReader(in, StandardCharsets.UTF_8))) {
                StringBuilder sql = new StringBuilder();
                String line;
                while ((line = reader.readLine()) != null) {
                    String trimmed = line.trim();
                    if (trimmed.startsWith("--") || trimmed.startsWith("//") || trimmed.isEmpty()) {
                        continue;
                    }
                    sql.append(line).append("\n");
                    if (trimmed.endsWith(";")) {
                        String statementStr = sql.toString().trim();
                        if (statementStr.endsWith(";")) {
                            statementStr = statementStr.substring(0, statementStr.length() - 1);
                        }
                        try {
                            stmt.execute(statementStr);
                        } catch (SQLException ex) {
                            LOGGER.log(Level.FINE, "SQL statement notice: " + ex.getMessage());
                        }
                        sql.setLength(0);
                    }
                }
                LOGGER.info("Database schema and seed data loaded successfully.");
            }
        } catch (Exception e) {
            LOGGER.log(Level.WARNING, "Schema initialization notice: " + e.getMessage());
        }
    }

    /**
     * Safely closes a Connection.
     */
    public static void closeConnection(Connection conn) {
        if (conn != null) {
            try {
                conn.close();
            } catch (SQLException e) {
                LOGGER.log(Level.WARNING, "Error closing Connection", e);
            }
        }
    }

    /**
     * Rolls back a transaction quietly, avoiding masking original exceptions.
     */
    public static void rollbackQuietly(Connection conn) {
        if (conn != null) {
            try {
                if (!conn.getAutoCommit()) {
                    conn.rollback();
                }
            } catch (SQLException e) {
                LOGGER.log(Level.WARNING, "Error during transaction rollback", e);
            }
        }
    }

    /**
     * Safely closes multiple AutoCloseable resources.
     */
    public static void closeQuietly(AutoCloseable... closeables) {
        if (closeables == null) return;
        for (AutoCloseable c : closeables) {
            if (c != null) {
                try {
                    c.close();
                } catch (Exception e) {
                    LOGGER.log(Level.FINE, "Error closing resource", e);
                }
            }
        }
    }

    public static boolean isFallbackEngaged() {
        getInstance();
        return isFallbackEngaged;
    }

    public static String getActiveJdbcUrl() {
        getInstance();
        return activeJdbcUrl;
    }

    public static synchronized void shutdown() {
        if (dataSource != null && !dataSource.isClosed()) {
            dataSource.close();
            LOGGER.info("Database connection pool shut down cleanly.");
        }
    }
}
