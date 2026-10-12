package com.fraud.web;

import com.fraud.collection.FraudStatistics;
import com.fraud.dao.FraudCaseDAO;
import com.fraud.dao.TransactionDAO;
import com.fraud.dao.UserDAO;
import com.fraud.model.FraudRule;
import com.fraud.model.RiskLevel;
import com.fraud.model.TransactionStatus;
import com.fraud.service.FraudDetectionService;
import com.fraud.service.TransactionService;
import jakarta.servlet.annotation.WebServlet;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;

import java.io.IOException;
import java.util.HashMap;
import java.util.List;
import java.util.Map;

/**
 * Controller servlet providing high-level executive dashboard metrics and fraud rule management.
 * Endpoints:
 * - GET  /api/dashboard (aggregate statistics, counts by status, counts by risk, open case count)
 * - GET  /api/rules (list active and all configured fraud detection rules)
 * - POST /api/rules (update rule weight, threshold, or active status)
 */
@WebServlet(name = "DashboardServlet", urlPatterns = {"/api/dashboard", "/api/rules", "/api/rules/*"})
public class DashboardServlet extends BaseJsonServlet {

    private final TransactionService transactionService;
    private final FraudDetectionService fraudDetectionService;
    private final TransactionDAO transactionDAO;
    private final FraudCaseDAO fraudCaseDAO;
    private final UserDAO userDAO;

    public DashboardServlet() {
        this(new TransactionService(), new FraudDetectionService(),
             new TransactionDAO(), new FraudCaseDAO(), new UserDAO());
    }

    public DashboardServlet(TransactionService transactionService,
                            FraudDetectionService fraudDetectionService,
                            TransactionDAO transactionDAO,
                            FraudCaseDAO fraudCaseDAO,
                            UserDAO userDAO) {
        this.transactionService = transactionService;
        this.fraudDetectionService = fraudDetectionService;
        this.transactionDAO = transactionDAO;
        this.fraudCaseDAO = fraudCaseDAO;
        this.userDAO = userDAO;
    }

    @Override
    protected void doGet(HttpServletRequest req, HttpServletResponse resp) throws IOException {
        String path = req.getServletPath();

        if (path.contains("rules")) {
            handleGetRules(req, resp);
        } else {
            handleGetDashboard(req, resp);
        }
    }

    private void handleGetDashboard(HttpServletRequest req, HttpServletResponse resp) throws IOException {
        try {
            HttpSession session = req.getSession(false);
            User sessionUser = (session != null) ? (User) session.getAttribute("user") : null;
            String userIdParam = req.getParameter("userId");

            Long targetUserId = null;
            if (sessionUser != null && sessionUser.getRole() == com.fraud.model.Role.CUSTOMER) {
                targetUserId = sessionUser.getId();
            } else if (userIdParam != null && !userIdParam.trim().isEmpty()) {
                targetUserId = Long.parseLong(userIdParam.trim());
            }

            if (targetUserId != null) {
                // User-isolated metrics
                List<com.fraud.model.Transaction> userTxs = transactionDAO.findByUserId(targetUserId);
                List<com.fraud.model.FraudCase> userCases = fraudCaseDAO.findByUserId(targetUserId);

                long totalUserTxs = userTxs.size();
                long openCasesCount = userCases.stream()
                        .filter(c -> c.getStatus() == com.fraud.model.CaseStatus.OPEN || c.getStatus() == com.fraud.model.CaseStatus.INVESTIGATING)
                        .count();

                long approvedCount = userTxs.stream().filter(t -> t.getStatus() == com.fraud.model.TransactionStatus.APPROVED).count();
                long flaggedCount = userTxs.stream().filter(t -> t.getStatus() == com.fraud.model.TransactionStatus.FLAGGED).count();
                long blockedCount = userTxs.stream().filter(t -> t.getStatus() == com.fraud.model.TransactionStatus.BLOCKED).count();

                java.math.BigDecimal totalAmount = userTxs.stream()
                        .map(com.fraud.model.Transaction::getAmount)
                        .reduce(java.math.BigDecimal.ZERO, java.math.BigDecimal::add);

                double fraudRate = totalUserTxs > 0
                        ? Math.round((((double) (flaggedCount + blockedCount) / totalUserTxs) * 100.0) * 10.0) / 10.0
                        : 0.0;

                Map<String, Long> statusDist = new HashMap<>();
                statusDist.put("APPROVED", approvedCount);
                statusDist.put("FLAGGED", flaggedCount);
                statusDist.put("BLOCKED", blockedCount);

                Map<String, Long> riskDist = new HashMap<>();
                riskDist.put("LOW", userTxs.stream().filter(t -> t.getRiskLevel() == com.fraud.model.RiskLevel.LOW).count());
                riskDist.put("MEDIUM", userTxs.stream().filter(t -> t.getRiskLevel() == com.fraud.model.RiskLevel.MEDIUM).count());
                riskDist.put("HIGH", userTxs.stream().filter(t -> t.getRiskLevel() == com.fraud.model.RiskLevel.HIGH).count());
                riskDist.put("CRITICAL", userTxs.stream().filter(t -> t.getRiskLevel() == com.fraud.model.RiskLevel.CRITICAL).count());

                Map<String, Object> dashboard = new HashMap<>();
                dashboard.put("totalTransactions", totalUserTxs);
                dashboard.put("openCasesCount", openCasesCount);
                dashboard.put("totalUsers", 1L);
                dashboard.put("fraudDetectionRate", fraudRate);
                dashboard.put("totalAmountProcessed", totalAmount);
                dashboard.put("riskDistribution", riskDist);
                dashboard.put("statusDistribution", statusDist);

                writeSuccess(resp, dashboard);
                return;
            }

            // Global metrics for ADMIN
            long totalTransactions = transactionDAO.count();
            long openCasesCount = fraudCaseDAO.findOpenCases().size();
            long totalUsers = userDAO.count();

            FraudStatistics stats = transactionService.getFraudStatistics();

            Map<String, Object> dashboard = new HashMap<>();
            dashboard.put("totalTransactions", totalTransactions);
            dashboard.put("openCasesCount", openCasesCount);
            dashboard.put("totalUsers", totalUsers);
            dashboard.put("fraudDetectionRate", stats.getFraudDetectionRatePercentage());
            dashboard.put("totalAmountProcessed", stats.getTotalAmountProcessed());
            dashboard.put("riskDistribution", stats.getRiskDistribution());
            dashboard.put("statusDistribution", stats.getStatusDistribution());

            writeSuccess(resp, dashboard);

        } catch (Exception e) {
            writeError(resp, HttpServletResponse.SC_INTERNAL_SERVER_ERROR, "Dashboard metric aggregation failed: " + e.getMessage());
        }
    }

    private void handleGetRules(HttpServletRequest req, HttpServletResponse resp) throws IOException {
        try {
            List<FraudRule> rules = fraudDetectionService.getAllRules();
            writeSuccess(resp, rules);
        } catch (Exception e) {
            writeError(resp, HttpServletResponse.SC_INTERNAL_SERVER_ERROR, "Failed to load fraud rules: " + e.getMessage());
        }
    }

    @Override
    protected void doPost(HttpServletRequest req, HttpServletResponse resp) throws IOException {
        FraudRule rule = parseJsonBody(req, FraudRule.class);
        if (rule == null || rule.getId() == null) {
            writeError(resp, HttpServletResponse.SC_BAD_REQUEST, "Valid FraudRule with ID is required");
            return;
        }

        try {
            FraudRule updated = fraudDetectionService.updateRule(rule);
            writeSuccess(resp, updated);
        } catch (Exception e) {
            writeError(resp, HttpServletResponse.SC_BAD_REQUEST, "Failed to update rule: " + e.getMessage());
        }
    }
}
