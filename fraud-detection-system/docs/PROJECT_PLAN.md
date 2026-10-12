# Project Plan: Fraud Detection System

**Academic Degree:** B.Tech Computer Science & Engineering (3rd Semester)  
**Subject:** Advanced Object-Oriented Programming & Database Systems in Java  
**Project Title:** Enterprise Rule-Based Fraud Detection System  

---

## 1. Objectives & Scope
The goal of this project is to build an enterprise-grade, multi-tiered rule-based fraud detection platform adhering to strict OOP principles, Collections & Generics, JDBC transaction isolation, and concurrent multithreaded processing.

### Key Milestones
- **Layered Architecture:** Clear separation between Web (JSP/Servlets), Service, Fraud Strategy/Engine, Data Access Object (DAO), and Database layers.
- **Strict OOP Design:** Polymorphic fraud rules, abstract base entities, role-based encapsulation (`User`, `Admin`, `Customer`), custom checked exceptions.
- **Resilient Database Tier:** JDBC connection management with MariaDB/MySQL support and seamless embedded fallback for offline viva demonstrations.
- **Multithreading:** Bounded `ExecutorService` with `Callable` and `Future` for concurrent batch transaction evaluations, with thread-safe atomic metrics.
- **Security:** Jakarta EE session management, input validation, and SHA-256 password salting.

---

## 2. Phase-by-Phase Execution Plan

1. **Phase 0: Project Setup & Maven Configuration**
   - Configured `pom.xml` with Jakarta EE 10 (Servlet 6.0, JSP 3.1, JSTL), MySQL Connector/J, MariaDB, H2, HikariCP, Gson, JUnit 5.
   - Initialized canonical folder structure and descriptor `web.xml`.
2. **Phase 1: Database Design & Connection**
   - Design normalized relational schema (`users`, `transactions`, `fraud_cases`, `fraud_alerts`, `fraud_rules`).
   - Create `DatabaseConnection` singleton/pool supporting MySQL/MariaDB and H2.
3. **Phase 2: Repository & Generic Infrastructure (COMPLETED)**
   - Defined `Repository<T, ID>` generic interface for type-safe CRUD operations, counting, existence checks, and overloaded connection passing.
   - Implemented `RowMapper<T>` functional interface for typed ResultSet column extraction.
   - Built `AbstractJdbcRepository<T, ID>` implementing template methods, automatic parameter binding, generated key extraction, and checked exception translation.
   - Added comprehensive integration tests in `RepositoryTest.java` (4 tests).
4. **Phase 3: Models & Complete OOP Implementation (COMPLETED)**
   - Implemented `Authenticatable` interface contract for security checking.
   - Built abstract `User` base class with encapsulation, SHA-256 salted password verification, and polymorphic template methods.
   - Subclassed `Admin` (clearance levels, department) and `Customer` (account number, balance, risk profile).
   - Created core enums: `Role`, `TransactionType`, `TransactionStatus`, `RiskLevel`, `CaseStatus` with safe parser utilities.
   - Implemented domain models: `Transaction`, `FraudCase`, `FraudAlert`, `FraudRule`.
   - Created immutable value object `RiskAnalysis` with defensive copies, boundary clamping, and zero-risk factory methods.
   - Added unit test suite `src/test/java/com/fraud/ModelTest.java` (7 tests).
5. **Phase 4: Collections & Generics (COMPLETED)**
   - Implemented `GenericCollectionStore<T, ID>` with generic type parameters, key extraction functions, and unmodifiable defensive views.
   - Built `SlidingWindowTransactionTracker` utilizing `Queue<Transaction>` (ArrayDeque) and `Map<Long, Queue<Transaction>>` for FIFO temporal velocity tracking and automatic expiration of elapsed events.
   - Built `FraudStatistics` using `EnumMap<RiskLevel, Integer>`, `EnumMap<TransactionStatus, Integer>`, and `BigDecimal` aggregation for volumetric metrics and fraud rate calculations.
   - Built `GeoIpTracker` using `Map<Long, Set<String>>` (HashSet) for customer location/IP baseline profiling and unusual location anomaly detection.
   - Built `TransactionHistoryLedger` using `List<Transaction>` (ArrayList) with sorting by `Comparator`, time-range queries, and historical average amount calculations for amount surge deviation.
   - Added unit test suite `src/test/java/com/fraud/CollectionTest.java` (5 tests).
6. **Phase 5: DAO + JDBC CRUD (COMPLETED)**
   - Implemented `UserDAO`: full CRUD, `findByUsername`, `findByAccountNumber`, polymorphic Admin/Customer hydration, and ambient connection support.
   - Implemented `TransactionDAO`: full CRUD, `findByUserId`, `findRecentByUserId`, `findByReferenceId`, `findByStatus`, `BigDecimal` monetary precision, and enum mapping.
   - Implemented `FraudCaseDAO`: full CRUD, `findOpenCases`, `findByTransactionId`, `findByUserId`, `findByCaseNumber`, and nullable assignee handling.
   - Implemented `FraudAlertDAO`: full CRUD, `findAlertsByTransactionId`, and `findByUserId` (SQL INNER JOIN).
   - Implemented `FraudRuleDAO`: full CRUD, `findAllActiveRules`, and `findByRuleCode`.
   - Preserved ambient `Connection` passing for caller-owned transactions (Phase 6 readiness).
   - Added integration test suite `src/test/java/com/fraud/DAOTest.java` (6 tests).
7. **Phase 6: JDBC Transaction Management (COMPLETED)**
   - Implemented `TransactionManagementService` orchestrating ACID boundaries with `setAutoCommit(false)`, `commit()`, and `rollback()`.
   - Built atomic transaction lifecycle: insert initial PENDING transaction -> process RiskAnalysis -> save FraudAlerts -> save FraudCase if suspicious -> update final transaction status & risk score -> commit().
   - Handled error states: automatic rollback on database exceptions, preserving database consistency with zero partial state.
   - Built batch atomic transaction processing with complete rollback semantics.
   - Added unit test suite `src/test/java/com/fraud/TransactionManagementTest.java` (5 tests).
8. **Phase 7: Multithreading & Synchronization (COMPLETED)**
   - Implemented `FraudMonitoringService` with bounded thread pool (`Executors.newFixedThreadPool(threadPoolSize)`).
   - Created `TransactionAnalysisTask` implementing `Callable<TransactionProcessingResult>` with asynchronous `Future` result collection.
   - Designed immutable `TransactionProcessingResult` value object capturing status, risk analysis, diagnostics, and execution duration.
   - Synchronized shared `FraudStatistics` across worker threads with race-condition prevention for concurrent metric accumulation.
   - Preserved independent caller-owned JDBC connection boundaries per thread (ACID isolation).
   - Implemented lifecycle management: `shutdown(timeoutSeconds)`, `shutdownNow()`, and `awaitTermination`.
   - Added unit and concurrency test suite `src/test/java/com/fraud/MultithreadingTest.java` (6 tests).
9. **Phase 8: Fraud Detection Engine (COMPLETED)**
   - Implemented `FraudDetectionStrategy` interface.
   - Built multi-signal `FraudDetectionEngine` evaluating 6 configurable rules:
     - `HIGH_AMOUNT`: Evaluates transaction value against threshold limit.
     - `RAPID_TRANSACTIONS`: Velocity check within sliding-window queue (`SlidingWindowTransactionTracker`).
     - `UNUSUAL_LOCATION`: Anomaly detection against customer historical location baseline (`GeoIpTracker`).
     - `ODD_HOUR`: Nocturnal execution check (01:00 to 05:00 AM).
     - `AMOUNT_DEVIATION`: Statistical surge detection (>300% of customer historical average via `TransactionHistoryLedger`).
     - `REPEATED_FAILURES`: Detects accumulation of preceding rejected/failed transactions.
   - Computed weighted composite risk score clamped [0, 100], derived `RiskLevel`, and generated ordered human-readable diagnostic explanations.
   - Clean architecture: zero SQL/JDBC queries inside the engine; thread-safe and stateless evaluation.
   - Added unit test suite `src/test/java/com/fraud/FraudDetectionEngineTest.java` (12 tests).
10. **Phase 9: Services & Business Workflows (COMPLETED)**
    - Implemented `UserService`: Registration, authentication (SHA-256), balance operations, risk profile management, and input validation.
    - Implemented `FraudDetectionService`: Coordinates `FraudDetectionEngine`, temporal in-memory baselines (`SlidingWindowTransactionTracker`, `GeoIpTracker`, `TransactionHistoryLedger`), and dynamic rule updates.
    - Implemented `FraudCaseService`: Manages compliance audit lifecycles (open -> assign -> resolve), investigator assignment, and alert auditing.
    - Implemented `TransactionService`: Full end-to-end transaction business workflow (input validation -> balance verification -> fraud risk evaluation -> atomic ACID persistence -> balance adjustment -> metrics tracking).
    - Preserved zero SQL in services, centralized ACID transaction boundaries, and thread-safe metrics.
    - Added unit test suite `src/test/java/com/fraud/ServiceWorkflowTest.java` (6 tests).
11. **Phase 10: Servlets & Web Layer (COMPLETED)**
    - Implemented controller servlets: `AuthServlet`, `DashboardServlet`, `TransactionServlet`, `FraudCaseServlet` extending `BaseJsonServlet`.
    - Implemented JSON serialization via Google Gson and standardized response envelopes.
    - Added unit test suite `src/test/java/com/fraud/WebLayerTest.java` (4 tests).
12. **Phase 11: JSP/HTML/CSS/JavaScript GUI (COMPLETED)**
    - Delivered modern responsive web application with executive metrics, interactive transaction submission, live risk scoring badges, case resolution dialogs, and rule configuration toggles.
13. **Phase 12: Authentication & Validation (COMPLETED)**
    - Enforced session-based auth and role-based access control (RBAC) via `AuthenticationFilter`.
    - Integrated SHA-256 salted password verification and input validation.
14. **Phase 13: Testing & Integration (COMPLETED)**
    - Complete test suite verifying rules, DAO persistence, concurrency, ACID rollback semantics, and web servlets.
15. **Phase 14: Documentation & Viva Guide (COMPLETED)**
    - Created comprehensive viva cheat sheet (`docs/VIVA_GUIDE.md`), system architecture diagram (`docs/ARCHITECTURE.md`), and updated project records.
