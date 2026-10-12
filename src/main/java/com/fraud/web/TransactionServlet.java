package com.fraud.web;

import com.fraud.exception.ValidationException;
import com.fraud.model.Transaction;
import com.fraud.model.TransactionStatus;
import com.fraud.model.TransactionType;
import com.fraud.model.User;
import com.fraud.service.TransactionService;
import jakarta.servlet.annotation.WebServlet;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import jakarta.servlet.http.HttpSession;

import java.io.IOException;
import java.math.BigDecimal;
import java.util.List;
import java.util.Optional;

/**
 * Controller servlet managing financial transaction creation and retrieval.
 * Endpoints:
 * - GET  /api/transactions (list transactions, filter by userId or status)
 * - GET  /api/transactions?id={id}
 * - POST /api/transactions (submit candidate transaction for fraud analysis and processing)
 */
@WebServlet(name = "TransactionServlet", urlPatterns = {"/api/transactions", "/api/transactions/*"})
public class TransactionServlet extends BaseJsonServlet {

    private final TransactionService transactionService;

    public TransactionServlet() {
        this(new TransactionService());
    }

    public TransactionServlet(TransactionService transactionService) {
        this.transactionService = transactionService;
    }

    @Override
    protected void doGet(HttpServletRequest req, HttpServletResponse resp) throws IOException {
        String idParam = req.getParameter("id");
        String userIdParam = req.getParameter("userId");
        String statusParam = req.getParameter("status");

        HttpSession session = req.getSession(false);
        User sessionUser = (session != null) ? (User) session.getAttribute("user") : null;

        try {
            // If logged in as CUSTOMER, enforce data isolation (only own transactions)
            if (sessionUser != null && sessionUser.getRole() == com.fraud.model.Role.CUSTOMER) {
                if (idParam != null && !idParam.isEmpty()) {
                    long id = Long.parseLong(idParam);
                    Optional<Transaction> txOpt = transactionService.getTransactionById(id);
                    if (txOpt.isPresent() && txOpt.get().getUserId() == sessionUser.getId()) {
                        writeSuccess(resp, txOpt.get());
                    } else {
                        writeError(resp, HttpServletResponse.SC_NOT_FOUND, "Transaction not found or access denied");
                    }
                    return;
                }
                List<Transaction> list = transactionService.getTransactionsByUserId(sessionUser.getId());
                if (statusParam != null && !statusParam.isEmpty()) {
                    TransactionStatus status = TransactionStatus.fromString(statusParam);
                    list = list.stream().filter(t -> t.getStatus() == status).toList();
                }
                writeSuccess(resp, list);
                return;
            }

            // ADMIN or unauthenticated fallback (with explicit param checks)
            if (idParam != null && !idParam.isEmpty()) {
                long id = Long.parseLong(idParam);
                Optional<Transaction> txOpt = transactionService.getTransactionById(id);
                if (txOpt.isPresent()) {
                    writeSuccess(resp, txOpt.get());
                } else {
                    writeError(resp, HttpServletResponse.SC_NOT_FOUND, "Transaction not found with ID: " + id);
                }
                return;
            }

            if (userIdParam != null && !userIdParam.isEmpty()) {
                long userId = Long.parseLong(userIdParam);
                List<Transaction> list = transactionService.getTransactionsByUserId(userId);
                writeSuccess(resp, list);
                return;
            }

            if (statusParam != null && !statusParam.isEmpty()) {
                TransactionStatus status = TransactionStatus.fromString(statusParam);
                List<Transaction> list = transactionService.getTransactionsByStatus(status);
                writeSuccess(resp, list);
                return;
            }

            // Default: return all transactions (for ADMIN)
            List<Transaction> all = transactionService.getAllTransactions();
            writeSuccess(resp, all);

        } catch (NumberFormatException e) {
            writeError(resp, HttpServletResponse.SC_BAD_REQUEST, "Invalid numeric format in parameters");
        } catch (Exception e) {
            writeError(resp, HttpServletResponse.SC_INTERNAL_SERVER_ERROR, "Failed to retrieve transactions: " + e.getMessage());
        }
    }

    @Override
    protected void doPost(HttpServletRequest req, HttpServletResponse resp) throws IOException {
        CreateTransactionRequest requestBody = parseJsonBody(req, CreateTransactionRequest.class);
        if (requestBody == null) {
            writeError(resp, HttpServletResponse.SC_BAD_REQUEST, "Transaction payload is required");
            return;
        }

        try {
            // Determine user from session first for security
            HttpSession session = req.getSession(false);
            User sessionUser = (session != null) ? (User) session.getAttribute("user") : null;

            Long userId = null;
            if (sessionUser != null && sessionUser.getRole() == com.fraud.model.Role.CUSTOMER) {
                // Always bind to the authenticated customer's ID (prevent spoofing)
                userId = sessionUser.getId();
            } else if (requestBody.userId != null) {
                userId = requestBody.userId;
            } else if (sessionUser != null) {
                userId = sessionUser.getId();
            }

            if (userId == null) {
                writeError(resp, HttpServletResponse.SC_BAD_REQUEST, "Valid customer userId is required");
                return;
            }

            TransactionType type = TransactionType.fromString(requestBody.transactionType);
            Transaction tx = new Transaction(
                    userId,
                    requestBody.senderAccount,
                    requestBody.recipientAccount,
                    requestBody.amount,
                    type,
                    requestBody.location
            );

            tx.setIpAddress(requestBody.ipAddress != null ? requestBody.ipAddress : req.getRemoteAddr());
            tx.setDeviceFingerprint(requestBody.deviceFingerprint != null ? requestBody.deviceFingerprint : "WEB-BROWSER-CLIENT");

            Transaction processed = transactionService.processTransaction(tx);
            writeSuccess(resp, processed);

        } catch (ValidationException e) {
            writeError(resp, HttpServletResponse.SC_BAD_REQUEST, e.getMessage());
        } catch (Exception e) {
            writeError(resp, HttpServletResponse.SC_INTERNAL_SERVER_ERROR, "Transaction processing failed: " + e.getMessage());
        }
    }

    public static class CreateTransactionRequest {
        public Long userId;
        public String senderAccount;
        public String recipientAccount;
        public BigDecimal amount;
        public String transactionType;
        public String location;
        public String ipAddress;
        public String deviceFingerprint;
    }
}
