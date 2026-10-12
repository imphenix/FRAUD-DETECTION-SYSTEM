# Comprehensive Academic Viva & Interview Guide
## Enterprise Rule-Based Fraud Detection System (Java & SQL)

### 1. Architectural Overview & Design Patterns
- **Layered Enterprise Architecture**:
  - **Web Tier**: Jakarta EE 10 Servlets (`AuthServlet`, `TransactionServlet`, `FraudCaseServlet`, `DashboardServlet`), REST APIs, JSON serialization (`Google Gson`), CORS & Session management filters (`AuthenticationFilter`).
  - **Service Tier**: Centralized business workflows (`TransactionService`, `FraudDetectionService`, `FraudCaseService`, `UserService`). Encapsulates validation and atomic coordination.
  - **Fraud Engine Strategy**: `FraudDetectionStrategy` interface implemented by `FraudDetectionEngine` evaluating 6 independent signals.
  - **Data Access Tier**: Generic repository pattern (`Repository<T, ID>`, `AbstractJdbcRepository<T, ID>`) and concrete DAOs (`UserDAO`, `TransactionDAO`, `FraudCaseDAO`, `FraudAlertDAO`, `FraudRuleDAO`).
  - **Database Tier**: Relational persistence via HikariCP connection pool, MariaDB/MySQL 8 support, and zero-config embedded H2 fallback engine.

### 2. Multi-Signal Fraud Detection Rules (Why Multi-Factor?)
Single-threshold detectors (e.g. `amount > 50000 = fraud`) produce unacceptably high false-positive rates. Our engine uses weighted multi-factor scoring:
1. **HIGH_AMOUNT** (+30 pts): Compares value against configured monetary limits.
2. **RAPID_TRANSACTIONS** (+25 pts): Velocity check using in-memory FIFO queue (`SlidingWindowTransactionTracker`) expiring events older than 5 minutes.
3. **UNUSUAL_LOCATION** (+20 pts): Compares transaction origin against customer historical geographic set (`GeoIpTracker`).
4. **ODD_HOUR** (+15 pts): Evaluates nocturnal transactions between 01:00 AM and 05:00 AM.
5. **AMOUNT_DEVIATION** (+25 pts): Compares current amount against customer historical average (>300% surge detected via `TransactionHistoryLedger`).
6. **REPEATED_FAILURES** (+20 pts): Detects preceding failed/rejected transaction attempts.

- **Risk Score Aggregation & Clamping**:
  - Score clamped strictly in range `[0, 100]`.
  - Score $\ge 85 \rightarrow$ `CRITICAL` risk $\rightarrow$ Transaction `BLOCKED` + `OPEN` emergency case.
  - Score $40 - 84 \rightarrow$ `MEDIUM`/`HIGH` risk $\rightarrow$ Transaction `FLAGGED` + `INVESTIGATING` case + `FraudAlert` items.
  - Score $< 40 \rightarrow$ `LOW` risk $\rightarrow$ Transaction `APPROVED`.

### 3. JDBC Transaction Management (ACID Compliance)
- Handled in `TransactionManagementService`:
  1. Acquire caller-owned `Connection` from pool and set `conn.setAutoCommit(false)`.
  2. Insert transaction in `PENDING` state.
  3. Execute multi-signal risk analysis.
  4. If flagged/blocked, persist `FraudAlert` and `FraudCase` records within the same ambient `Connection`.
  5. Update transaction status (`APPROVED` / `FLAGGED` / `BLOCKED`) and risk score.
  6. Execute `conn.commit()`.
  7. On error/exception: invoke `conn.rollback()`, safely restore `conn.setAutoCommit(true)` in `finally`, leaving zero partial table state.

### 4. Multithreading & Synchronization
- **Bounded Worker Pool**: `Executors.newFixedThreadPool(threadPoolSize)` managed by `FraudMonitoringService`.
- **Callable & Future**: Each transaction is evaluated by a `TransactionAnalysisTask` returning a `TransactionProcessingResult`.
- **Thread Safety**: Per-task independent JDBC connections eliminate race conditions at the database level.
- **Synchronized Shared State**: `FraudStatistics` employs synchronized methods/blocks ensuring 100% deterministic metric updates under heavy concurrent contention.

### 5. Running the Application
```bash
# 1. Build and test all components with Maven
mvn clean test

# 2. Package into enterprise WAR
mvn package

# 3. Launch embedded Tomcat server
mvn exec:java -Dexec.mainClass="com.fraud.Main"

# 4. Launch web UI preview
npm run dev
```
