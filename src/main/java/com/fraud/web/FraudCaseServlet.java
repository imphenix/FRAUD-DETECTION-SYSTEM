package com.fraud.web;

import com.fraud.exception.ValidationException;
import com.fraud.model.CaseStatus;
import com.fraud.model.FraudAlert;
import com.fraud.model.FraudCase;
import com.fraud.service.FraudCaseService;
import jakarta.servlet.annotation.WebServlet;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;

import java.io.IOException;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.Optional;

/**
 * Controller servlet managing compliance investigation cases and triggered fraud alerts.
 * Endpoints:
 * - GET  /api/cases (list cases, filter by open status or userId)
 * - GET  /api/cases?id={id}
 * - POST /api/cases?action=assign (assign investigator to case)
 * - POST /api/cases?action=resolve (resolve case with details)
 * - GET  /api/alerts (list all fraud alerts or filter by transactionId/userId)
 */
@WebServlet(name = "FraudCaseServlet", urlPatterns = {"/api/cases", "/api/cases/*", "/api/alerts", "/api/alerts/*"})
public class FraudCaseServlet extends BaseJsonServlet {

    private final FraudCaseService fraudCaseService;

    public FraudCaseServlet() {
        this(new FraudCaseService());
    }

    public FraudCaseServlet(FraudCaseService fraudCaseService) {
        this.fraudCaseService = fraudCaseService;
    }

    @Override
    protected void doGet(HttpServletRequest req, HttpServletResponse resp) throws IOException {
        String path = req.getServletPath();

        if (path.contains("alerts")) {
            handleGetAlerts(req, resp);
        } else {
            handleGetCases(req, resp);
        }
    }

    private void handleGetAlerts(HttpServletRequest req, HttpServletResponse resp) throws IOException {
        String txIdParam = req.getParameter("transactionId");
        String userIdParam = req.getParameter("userId");

        jakarta.servlet.http.HttpSession session = req.getSession(false);
        com.fraud.model.User sessionUser = (session != null) ? (com.fraud.model.User) session.getAttribute("user") : null;

        try {
            if (sessionUser != null && sessionUser.getRole() == com.fraud.model.Role.CUSTOMER) {
                // Customers can only see their own alerts
                List<FraudAlert> list = fraudCaseService.getAlertsByUserId(sessionUser.getId());
                if (txIdParam != null && !txIdParam.isEmpty()) {
                    long txId = Long.parseLong(txIdParam);
                    list = list.stream().filter(a -> a.getTransactionId() == txId).toList();
                }
                writeSuccess(resp, list);
                return;
            }

            if (txIdParam != null && !txIdParam.isEmpty()) {
                long txId = Long.parseLong(txIdParam);
                List<FraudAlert> list = fraudCaseService.getAlertsByTransactionId(txId);
                writeSuccess(resp, list);
                return;
            }

            if (userIdParam != null && !userIdParam.isEmpty()) {
                long userId = Long.parseLong(userIdParam);
                List<FraudAlert> list = fraudCaseService.getAlertsByUserId(userId);
                writeSuccess(resp, list);
                return;
            }

            List<FraudAlert> all = fraudCaseService.getAllAlerts();
            writeSuccess(resp, all);

        } catch (NumberFormatException e) {
            writeError(resp, HttpServletResponse.SC_BAD_REQUEST, "Invalid numeric parameter for alerts");
        } catch (Exception e) {
            writeError(resp, HttpServletResponse.SC_INTERNAL_SERVER_ERROR, "Failed to retrieve alerts: " + e.getMessage());
        }
    }

    private void handleGetCases(HttpServletRequest req, HttpServletResponse resp) throws IOException {
        String idParam = req.getParameter("id");
        String openOnly = req.getParameter("openOnly");
        String userIdParam = req.getParameter("userId");

        jakarta.servlet.http.HttpSession session = req.getSession(false);
        com.fraud.model.User sessionUser = (session != null) ? (com.fraud.model.User) session.getAttribute("user") : null;

        try {
            if (sessionUser != null && sessionUser.getRole() == com.fraud.model.Role.CUSTOMER) {
                // Customers can only see cases involving their account
                List<FraudCase> list = fraudCaseService.getCasesByUserId(sessionUser.getId());
                if (idParam != null && !idParam.isEmpty()) {
                    long id = Long.parseLong(idParam);
                    list = list.stream().filter(c -> c.getId() != null && c.getId() == id).toList();
                }
                writeSuccess(resp, list);
                return;
            }

            if (idParam != null && !idParam.isEmpty()) {
                long id = Long.parseLong(idParam);
                Optional<FraudCase> caseOpt = fraudCaseService.getCaseById(id);
                if (caseOpt.isPresent()) {
                    writeSuccess(resp, caseOpt.get());
                } else {
                    writeError(resp, HttpServletResponse.SC_NOT_FOUND, "Fraud case not found with ID: " + id);
                }
                return;
            }

            if ("true".equalsIgnoreCase(openOnly)) {
                List<FraudCase> openCases = fraudCaseService.getOpenCases();
                writeSuccess(resp, openCases);
                return;
            }

            if (userIdParam != null && !userIdParam.isEmpty()) {
                long userId = Long.parseLong(userIdParam);
                List<FraudCase> list = fraudCaseService.getCasesByUserId(userId);
                writeSuccess(resp, list);
                return;
            }

            List<FraudCase> all = fraudCaseService.getAllCases();
            writeSuccess(resp, all);

        } catch (NumberFormatException e) {
            writeError(resp, HttpServletResponse.SC_BAD_REQUEST, "Invalid numeric parameter for cases");
        } catch (Exception e) {
            writeError(resp, HttpServletResponse.SC_INTERNAL_SERVER_ERROR, "Failed to retrieve cases: " + e.getMessage());
        }
    }

    @Override
    protected void doPost(HttpServletRequest req, HttpServletResponse resp) throws IOException {
        String action = req.getParameter("action");
        if (action == null) {
            action = "open";
        }

        switch (action.toLowerCase()) {
            case "assign":
                handleAssign(req, resp);
                break;
            case "resolve":
                handleResolve(req, resp);
                break;
            case "open":
                handleOpen(req, resp);
                break;
            default:
                writeError(resp, HttpServletResponse.SC_BAD_REQUEST, "Invalid case action: " + action);
        }
    }

    private void handleAssign(HttpServletRequest req, HttpServletResponse resp) throws IOException {
        AssignCaseRequest body = parseJsonBody(req, AssignCaseRequest.class);
        if (body == null || body.caseId == null || body.adminId == null) {
            writeError(resp, HttpServletResponse.SC_BAD_REQUEST, "caseId and adminId are required");
            return;
        }

        try {
            FraudCase updated = fraudCaseService.assignCase(body.caseId, body.adminId);
            writeSuccess(resp, updated);
        } catch (ValidationException e) {
            writeError(resp, HttpServletResponse.SC_BAD_REQUEST, e.getMessage());
        } catch (Exception e) {
            writeError(resp, HttpServletResponse.SC_INTERNAL_SERVER_ERROR, "Failed to assign case: " + e.getMessage());
        }
    }

    private void handleResolve(HttpServletRequest req, HttpServletResponse resp) throws IOException {
        ResolveCaseRequest body = parseJsonBody(req, ResolveCaseRequest.class);
        if (body == null || body.caseId == null || body.finalStatus == null) {
            writeError(resp, HttpServletResponse.SC_BAD_REQUEST, "caseId and finalStatus are required");
            return;
        }

        try {
            CaseStatus status = CaseStatus.fromString(body.finalStatus);
            FraudCase resolved = fraudCaseService.resolveCase(body.caseId, status, body.resolutionDetails);
            writeSuccess(resp, resolved);
        } catch (ValidationException e) {
            writeError(resp, HttpServletResponse.SC_BAD_REQUEST, e.getMessage());
        } catch (Exception e) {
            writeError(resp, HttpServletResponse.SC_INTERNAL_SERVER_ERROR, "Failed to resolve case: " + e.getMessage());
        }
    }

    private void handleOpen(HttpServletRequest req, HttpServletResponse resp) throws IOException {
        OpenCaseRequest body = parseJsonBody(req, OpenCaseRequest.class);
        if (body == null || body.transactionId == null || body.userId == null) {
            writeError(resp, HttpServletResponse.SC_BAD_REQUEST, "transactionId and userId are required");
            return;
        }

        try {
            FraudCase created = fraudCaseService.openCase(body.transactionId, body.userId,
                    body.riskScore != null ? body.riskScore : 50, body.notes);
            writeSuccess(resp, created);
        } catch (ValidationException e) {
            writeError(resp, HttpServletResponse.SC_BAD_REQUEST, e.getMessage());
        } catch (Exception e) {
            writeError(resp, HttpServletResponse.SC_INTERNAL_SERVER_ERROR, "Failed to open case: " + e.getMessage());
        }
    }

    public static class AssignCaseRequest {
        public Long caseId;
        public Long adminId;
    }

    public static class ResolveCaseRequest {
        public Long caseId;
        public String finalStatus;
        public String resolutionDetails;
    }

    public static class OpenCaseRequest {
        public Long transactionId;
        public Long userId;
        public Integer riskScore;
        public String notes;
    }
}
