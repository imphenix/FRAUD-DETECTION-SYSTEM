package com.fraud.web;

import com.fraud.exception.AuthenticationException;
import com.fraud.exception.ValidationException;
import com.fraud.model.Role;
import com.fraud.model.User;
import com.fraud.service.UserService;
import jakarta.servlet.annotation.WebServlet;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import jakarta.servlet.http.HttpSession;

import java.io.IOException;
import java.math.BigDecimal;
import java.util.HashMap;
import java.util.Map;

/**
 * Controller servlet handling user login, registration, session checks, and logout.
 * Endpoints:
 * - POST /api/auth?action=login
 * - POST /api/auth?action=register
 * - GET  /api/auth?action=me
 * - POST /api/auth?action=logout
 */
@WebServlet(name = "AuthServlet", urlPatterns = {"/api/auth", "/api/auth/*"})
public class AuthServlet extends BaseJsonServlet {

    private final UserService userService;

    public AuthServlet() {
        this(new UserService());
    }

    public AuthServlet(UserService userService) {
        this.userService = userService;
    }

    @Override
    protected void doGet(HttpServletRequest req, HttpServletResponse resp) throws IOException {
        String action = req.getParameter("action");
        if ("me".equalsIgnoreCase(action)) {
            handleCheckSession(req, resp);
        } else {
            writeError(resp, HttpServletResponse.SC_BAD_REQUEST, "Unknown action: " + action);
        }
    }

    @Override
    protected void doPost(HttpServletRequest req, HttpServletResponse resp) throws IOException {
        String action = req.getParameter("action");
        if (action == null) {
            action = "login";
        }

        switch (action.toLowerCase()) {
            case "login":
                handleLogin(req, resp);
                break;
            case "register":
                handleRegister(req, resp);
                break;
            case "logout":
                handleLogout(req, resp);
                break;
            default:
                writeError(resp, HttpServletResponse.SC_BAD_REQUEST, "Invalid authentication action: " + action);
        }
    }

    private void handleLogin(HttpServletRequest req, HttpServletResponse resp) throws IOException {
        LoginRequest loginReq = parseJsonBody(req, LoginRequest.class);
        if (loginReq == null || loginReq.username == null || loginReq.password == null) {
            writeError(resp, HttpServletResponse.SC_BAD_REQUEST, "Username and password are required");
            return;
        }

        try {
            User user = userService.authenticate(loginReq.username, loginReq.password);
            HttpSession session = req.getSession(true);
            session.setAttribute("user", user);
            session.setAttribute("userId", user.getId());
            session.setAttribute("role", user.getRole().name());

            Map<String, Object> data = new HashMap<>();
            data.put("user", user);
            data.put("sessionId", session.getId());
            writeSuccess(resp, data);

        } catch (AuthenticationException e) {
            writeError(resp, HttpServletResponse.SC_UNAUTHORIZED, e.getMessage());
        } catch (Exception e) {
            writeError(resp, HttpServletResponse.SC_INTERNAL_SERVER_ERROR, "Login processing error: " + e.getMessage());
        }
    }

    private void handleRegister(HttpServletRequest req, HttpServletResponse resp) throws IOException {
        RegisterRequest regReq = parseJsonBody(req, RegisterRequest.class);
        if (regReq == null) {
            writeError(resp, HttpServletResponse.SC_BAD_REQUEST, "Registration payload is required");
            return;
        }

        try {
            BigDecimal balance = regReq.initialBalance != null ? regReq.initialBalance : BigDecimal.valueOf(1000.00);
            User registered = userService.registerCustomer(
                    regReq.username,
                    regReq.password,
                    regReq.fullName,
                    regReq.email,
                    regReq.phone,
                    regReq.accountNumber != null ? regReq.accountNumber : "ACC-" + System.currentTimeMillis(),
                    balance
            );

            HttpSession session = req.getSession(true);
            session.setAttribute("user", registered);
            session.setAttribute("userId", registered.getId());
            session.setAttribute("role", registered.getRole().name());

            Map<String, Object> data = new HashMap<>();
            data.put("user", registered);
            data.put("sessionId", session.getId());
            writeSuccess(resp, data);

        } catch (ValidationException e) {
            writeError(resp, HttpServletResponse.SC_BAD_REQUEST, e.getMessage());
        } catch (Exception e) {
            writeError(resp, HttpServletResponse.SC_INTERNAL_SERVER_ERROR, "Registration failed: " + e.getMessage());
        }
    }

    private void handleCheckSession(HttpServletRequest req, HttpServletResponse resp) throws IOException {
        HttpSession session = req.getSession(false);
        if (session != null && session.getAttribute("user") != null) {
            User user = (User) session.getAttribute("user");
            Map<String, Object> data = new HashMap<>();
            data.put("user", user);
            data.put("authenticated", true);
            writeSuccess(resp, data);
        } else {
            writeError(resp, HttpServletResponse.SC_UNAUTHORIZED, "Not authenticated");
        }
    }

    private void handleLogout(HttpServletRequest req, HttpServletResponse resp) throws IOException {
        HttpSession session = req.getSession(false);
        if (session != null) {
            session.invalidate();
        }
        Map<String, Object> data = new HashMap<>();
        data.put("loggedOut", true);
        writeSuccess(resp, data);
    }

    public static class LoginRequest {
        public String username;
        public String password;
    }

    public static class RegisterRequest {
        public String username;
        public String password;
        public String fullName;
        public String email;
        public String phone;
        public String accountNumber;
        public BigDecimal initialBalance;
    }
}
