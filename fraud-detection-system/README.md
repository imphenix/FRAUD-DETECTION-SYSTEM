# Enterprise Rule-Based Fraud Detection System (FraudGuard SOC)

A production-grade, full-stack fraud detection and transaction monitoring platform designed for banking and financial compliance. Built with **Java 17**, **Jakarta EE Servlets**, **HikariCP**, **MySQL / MariaDB**, **React 19**, **TypeScript**, **Tailwind CSS**, and **Web Audio API**.

---

## 🌟 Key Features

1. **Multi-Signal Rule-Based Fraud Engine**:
   - `HIGH_AMOUNT`: Detects single transactions breaching dynamic monetary ceilings.
   - `RAPID_TRANSACTIONS`: Sliding-window velocity check leveraging FIFO in-memory time queues.
   - `UNUSUAL_LOCATION`: Anomaly detection contrasting candidate origin against customer historical geographic set.
   - `ODD_HOUR`: Evaluates off-hours transactions during nocturnal windows (01:00 AM – 05:00 AM).
   - `AMOUNT_DEVIATION`: Statistical comparison against customer historical baseline (>300% surge).
   - `REPEATED_FAILURES`: Flags transactions preceded by repeated rejected/failed attempts.

2. **ACID JDBC Transaction Management**:
   - Caller-owned ambient JDBC connection workflow (`setAutoCommit(false)` $\rightarrow$ `commit()` / `rollback()`).
   - Atomic persistence across `transactions`, `fraud_alerts`, and `fraud_cases` tables.
   - Complete zero-partial-state rollback on SQL errors or constraint violations.

3. **High-Throughput Multithreading**:
   - `FraudMonitoringService` with bounded thread pool (`Executors.newFixedThreadPool`).
   - `Callable<TransactionProcessingResult>` and `Future` asynchronous resolution.
   - Synchronized shared state in `FraudStatistics` with verified race-condition immunity.

4. **Compliance Case Management**:
   - Investigation lifecycle: `OPEN` $\rightarrow$ `INVESTIGATING` $\rightarrow$ `RESOLVED_LEGITIMATE` / `RESOLVED_FRAUD`.
   - Security administrator assignment, resolution documentation, and alert auditing.

5. **Security Operations Center (SOC) Audio & Alert System**:
   - High-security SOC Threat Alert sound with sub-bass drop and dual warning pulses.
   - Full-screen animated emergency lockdown overlay with 10-second countdown and 3-second audio safety cutoff.
   - Graceful Web Audio API synthesizers and fallback WAV asset playback.
   - Mute controls and browser autoplay compliance.

6. **Interactive Full-Stack Web Application**:
   - Real-time Executive Metrics Dashboard (fraud detection rate, status breakdown, risk distribution).
   - Candidate Transaction Simulator with instant rule breakdown and diagnostic scoring.
   - Live Transaction Ledger with full audit trails and search filters.
   - QR Pay scanning, simulated bank feed, and approval verification.
   - Role-Based Access Control (Security Administrator vs. Customer Client Portal).

---

## 📁 Repository Structure

```
fraud-detection-system/
├── pom.xml                        # Maven build descriptor (Java 17 / Jakarta EE 10)
├── package.json                   # Node.js dependencies & scripts (React 19, TypeScript, Vite)
├── tsconfig.json                  # TypeScript compiler settings
├── vite.config.ts                 # Vite bundler configuration
├── server.ts                      # Full-stack Node/Express development server & simulation
├── index.html                     # Frontend entry point
├── README.md                      # Comprehensive project documentation
├── CHANGELOG.md                   # Audit log of versions and enhancements
├── .gitignore                     # Git ignore rules for Java, React, Node & IDEs
├── .env.example                   # Environment configuration template
├── docs/                          # In-depth architectural & viva documentation
│   ├── ARCHITECTURE.md            # System architecture specification
│   ├── DATABASE_SETUP.md          # MySQL / MariaDB / H2 database setup guide
│   ├── PROJECT_PLAN.md            # Roadmap, sprint deliverables, and features
│   └── VIVA_GUIDE.md              # Defense interview questions and answers
├── scripts/                       # Test & build automation scripts
│   ├── generate_notification.cjs  # Notification audio synthesis utility
│   └── test_audio_lifecycle.cjs   # Web Audio lifecycle test suite
├── public/                        # Static web assets
│   ├── fraud-detection-system.zip # Downloadable source archive
│   └── sounds/                    # Audio notification assets
│       └── notification.wav
└── src/
    ├── main/                      # Core Java Enterprise backend
    │   ├── java/com/fraud/
    │   │   ├── collection/        # In-memory sliding window & ledger structures
    │   │   ├── dao/               # JDBC Data Access Objects
    │   │   ├── exception/         # Custom exception hierarchy
    │   │   ├── model/             # Domain entities (User, Transaction, FraudCase, etc.)
    │   │   ├── repository/        # Generic JDBC repository pattern
    │   │   ├── service/           # Business logic & multithreading services
    │   │   ├── strategy/          # 6-signal fraud detection rule engine
    │   │   ├── task/              # Callable multithreaded analysis tasks
    │   │   ├── util/              # Database connection pool & SHA-256 hashing
    │   │   ├── web/               # Jakarta EE Servlets and RBAC Filter
    │   │   └── Main.java          # Standalone embedded application launcher
    │   ├── resources/             # schema.sql and db.properties
    │   └── webapp/                # web.xml and index.jsp
    ├── test/java/com/fraud/       # 61 JUnit 5 unit and integration tests
    ├── components/                # React 19 SOC UI components
    │   ├── AnimatedCounter.tsx
    │   ├── CyberBackground.tsx
    │   ├── CyberButton.tsx
    │   ├── CyberCard.tsx
    │   ├── FraudEmergencyOverlay.tsx
    │   ├── QRPayModule.tsx
    │   ├── SecurityScanOverlay.tsx
    │   ├── SocBootSequence.tsx
    │   └── TransactionPipelineVisualizer.tsx
    ├── utils/                     # Web Audio API alert engine
    │   ├── cyberSound.ts
    │   └── notificationSoundAsset.ts
    ├── App.tsx                    # Main interactive frontend application
    ├── main.tsx                   # React DOM entry point
    └── index.css                  # Global Tailwind CSS styling
```

---

## 🚀 How to Run the Project

### Prerequisites
- **Node.js**: v18 or higher (v20+ recommended)
- **Java**: JDK 17 or higher
- **Maven**: 3.8+ (optional, for Java Maven build)

---

### Option 1: Running the Interactive Web Application (Node.js & React)

1. Open your terminal in the extracted folder:
   ```bash
   cd fraud-detection-system
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

3. Start the application:
   ```bash
   npm run dev
   ```

4. Open your browser and navigate to:
   ```
   http://localhost:3000
   ```

---

### Option 2: Running the Java Backend & Test Suite (Maven)

1. Run all 61 automated tests:
   ```bash
   mvn test
   ```

2. Package the application into a WAR artifact:
   ```bash
   mvn clean package
   ```

3. Run the standalone embedded Java server:
   ```bash
   mvn exec:java -Dexec.mainClass="com.fraud.Main"
   ```

---

## 📤 How to Upload to GitHub (Step-by-Step)

Follow these steps on your Windows, Mac, or Linux computer to publish the project to GitHub:

### Step 1: Create a New GitHub Repository
1. Log in to [GitHub](https://github.com).
2. Click the **+** icon in the top right and select **New repository**.
3. Name your repository `fraud-detection-system` (or any preferred name).
4. Choose **Public** or **Private**.
5. Leave "Initialize this repository with a README" **unchecked** (we already have a complete README).
6. Click **Create repository**.
7. Copy the repository URL (e.g., `https://github.com/your-username/fraud-detection-system.git`).

### Step 2: Push from Your Computer
Open **Command Prompt**, **PowerShell**, or **Terminal** inside the extracted `fraud-detection-system` directory:

```bash
# 1. Initialize Git
git init

# 2. Stage all project files (.gitignore will automatically exclude node_modules and builds)
git add .

# 3. Create your initial commit
git commit -m "feat: complete initial release of Fraud Detection System"

# 4. Rename default branch to main
git branch -M main

# 5. Link your GitHub repository (replace with your actual URL)
git remote add origin https://github.com/your-username/fraud-detection-system.git

# 6. Push to GitHub
git push -u origin main
```

---

## 🧪 Comprehensive Java Test Suite (61 Tests)

| Phase | Test Class | Focus Area | Tests | Status |
|---|---|---|:---:|:---:|
| **0** | `SmokeTest` | Java & JUnit 5 Runtime | 2 | PASS |
| **1** | `DatabaseConnectionTest` | HikariCP & H2 Fallback | 4 | PASS |
| **2** | `RepositoryTest` | Generic Repository & Mappers | 4 | PASS |
| **3** | `ModelTest` | OOP Domain Entities & SHA-256 | 7 | PASS |
| **4** | `CollectionTest` | Sliding Window & In-Memory Stores | 5 | PASS |
| **5** | `DAOTest` | JDBC CRUD & PreparedStatements | 6 | PASS |
| **6** | `TransactionManagementTest` | ACID Commit & Rollback Semantics | 5 | PASS |
| **7** | `MultithreadingTest` | ExecutorService, Callable, Thread-Safety | 6 | PASS |
| **8** | `FraudDetectionEngineTest` | 6 Multi-Signal Rules & Clamping | 12 | PASS |
| **9** | `ServiceWorkflowTest` | End-to-End Business Services | 6 | PASS |
| **10/12** | `WebLayerTest` | Servlets, Sessions, RBAC Filters | 4 | PASS |
| **TOTAL** | | | **61** | **ALL PASS** |

---

## 👥 Demo Accounts

- **Security Administrator (SOC Lead)**:
  - Username: `admin`
  - Password: `admin123`
  - Role: Full rule configuration, investigation case assignment, metrics access

- **Customer Client**:
  - Username: `john_doe`
  - Password: `password123`
  - Account: `ACC-98421001`
  - Balance: `₹4,50,000.00`
