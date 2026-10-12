# System Architecture & Component Interactions

```
 +-----------------------------------------------------------------------------------+
 |                             PRESENTATION / WEB TIER                               |
 |   - Interactive React 19 / Vite Full-Stack UI (Client Dashboard, Submission Form)  |
 |   - Jakarta EE 10 Controller Servlets (AuthServlet, TransactionServlet, etc.)      |
 |   - AuthenticationFilter (Session Guard & RBAC) & JSON Serialization (Gson)       |
 +-----------------------------------------+-----------------------------------------+
                                           |
                                           v
 +-----------------------------------------------------------------------------------+
 |                                   SERVICE TIER                                    |
 |   - TransactionService: End-to-end transaction orchestrator                       |
 |   - FraudDetectionService: Temporal in-memory collection cache & rule bridge      |
 |   - FraudCaseService: Investigation lifecycle management (Open/Assign/Resolve)     |
 |   - UserService: Customer & Admin registration, SHA-256 Auth, Balance management  |
 +-------------------+-------------------------------------+-------------------------+
                     |                                     |
                     v                                     v
 +---------------------------------------+  +---------------------------------------+
 |       FRAUD DETECTION STRATEGY        |  |         CONCURRENCY SERVICE           |
 |  - FraudDetectionEngine               |  |  - FraudMonitoringService             |
 |    * HIGH_AMOUNT Rule                 |  |  - Bounded ThreadPool (ExecutorService)|
 |    * RAPID_TRANSACTIONS (Sliding)     |  |  - TransactionAnalysisTask (Callable) |
 |    * UNUSUAL_LOCATION (Geo Set)       |  |  - Future<TransactionProcessingResult>|
 |    * ODD_HOUR (Nocturnal Window)      |  |  - Thread-Safe FraudStatistics        |
 |    * AMOUNT_DEVIATION (Ledger Mean)   |  +---------------------------------------+
 |    * REPEATED_FAILURES (History)      |
 +-------------------+-------------------+
                     |
                     v
 +-----------------------------------------------------------------------------------+
 |                      JDBC TRANSACTION MANAGEMENT SERVICE                          |
 |   - setAutoCommit(false) -> Atomic Unit of Work -> commit() / rollback()          |
 |   - Caller-Owned Ambient JDBC Connection passing across DAOs                      |
 +-----------------------------------------+-----------------------------------------+
                                           |
                                           v
 +-----------------------------------------------------------------------------------+
 |                             DATA ACCESS OBJECTS (DAO)                             |
 |   - UserDAO, TransactionDAO, FraudCaseDAO, FraudAlertDAO, FraudRuleDAO            |
 |   - Extends AbstractJdbcRepository<T, ID> via RowMapper<T>                        |
 +-----------------------------------------+-----------------------------------------+
                                           |
                                           v
 +-----------------------------------------------------------------------------------+
 |                              DATABASE & CONNECTION                                |
 |   - HikariCP Connection Pool                                                      |
 |   - Primary: MySQL 8 / MariaDB                                                    |
 |   - Fallback: Embedded H2 In-Memory Database (MySQL Mode)                         |
 +-----------------------------------------------------------------------------------+
```
