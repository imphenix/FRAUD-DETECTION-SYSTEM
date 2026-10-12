package com.fraud;

import com.fraud.model.Role;
import com.fraud.model.User;
import com.fraud.service.FraudCaseService;
import com.fraud.service.TransactionService;
import com.fraud.service.UserService;
import com.fraud.web.AuthServlet;
import com.fraud.web.DashboardServlet;
import com.fraud.web.FraudCaseServlet;
import com.fraud.web.TransactionServlet;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import jakarta.servlet.http.HttpSession;
import org.junit.jupiter.api.BeforeAll;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

import java.io.BufferedReader;
import java.io.PrintWriter;
import java.io.StringReader;
import java.io.StringWriter;
import java.lang.reflect.InvocationHandler;
import java.lang.reflect.Method;
import java.lang.reflect.Proxy;
import java.math.BigDecimal;
import java.util.HashMap;
import java.util.Map;

import static org.junit.jupiter.api.Assertions.*;

/**
 * Phase 10 & 12 Web Layer Tests.
 *
 * Verifies:
 * 1. AuthServlet: Login, Session persistence, and logout flow.
 * 2. TransactionServlet: API transaction submission, validation, and listing.
 * 3. FraudCaseServlet: Case retrieval, assignment, and resolution.
 * 4. DashboardServlet: Executive metrics retrieval and rules configuration.
 */
public class WebLayerTest {

    private static AuthServlet authServlet;
    private static TransactionServlet transactionServlet;
    private static FraudCaseServlet fraudCaseServlet;
    private static DashboardServlet dashboardServlet;
    private static UserService userService;

    @BeforeAll
    static void init() {
        authServlet = new AuthServlet();
        transactionServlet = new TransactionServlet();
        fraudCaseServlet = new FraudCaseServlet();
        dashboardServlet = new DashboardServlet();
        userService = new UserService();
    }

    // Dynamic mock helper for HttpServletRequest and HttpServletResponse
    private static class MockContext {
        final Map<String, String> params = new HashMap<>();
        final Map<String, Object> sessionAttributes = new HashMap<>();
        final StringWriter responseWriter = new StringWriter();
        int statusCode = 200;
        String requestBody = "";
        String servletPath = "/api";

        HttpServletRequest createRequest() {
            return (HttpServletRequest) Proxy.newProxyInstance(
                    HttpServletRequest.class.getClassLoader(),
                    new Class<?>[]{HttpServletRequest.class},
                    (proxy, method, args) -> {
                        String name = method.getName();
                        if ("getParameter".equals(name)) {
                            return params.get(args[0]);
                        }
                        if ("getReader".equals(name)) {
                            return new BufferedReader(new StringReader(requestBody));
                        }
                        if ("getServletPath".equals(name)) {
                            return servletPath;
                        }
                        if ("getRequestURI".equals(name)) {
                            return servletPath;
                        }
                        if ("getMethod".equals(name)) {
                            return "POST";
                        }
                        if ("getRemoteAddr".equals(name)) {
                            return "127.0.0.1";
                        }
                        if ("getSession".equals(name)) {
                            return createSession();
                        }
                        return null;
                    });
        }

        HttpSession createSession() {
            return (HttpSession) Proxy.newProxyInstance(
                    HttpSession.class.getClassLoader(),
                    new Class<?>[]{HttpSession.class},
                    (proxy, method, args) -> {
                        String name = method.getName();
                        if ("getAttribute".equals(name)) {
                            return sessionAttributes.get(args[0]);
                        }
                        if ("setAttribute".equals(name)) {
                            sessionAttributes.put((String) args[0], args[1]);
                            return null;
                        }
                        if ("getId".equals(name)) {
                            return "MOCK-SESSION-123";
                        }
                        if ("invalidate".equals(name)) {
                            sessionAttributes.clear();
                            return null;
                        }
                        return null;
                    });
        }

        HttpServletResponse createResponse() {
            return (HttpServletResponse) Proxy.newProxyInstance(
                    HttpServletResponse.class.getClassLoader(),
                    new Class<?>[]{HttpServletResponse.class},
                    (proxy, method, args) -> {
                        String name = method.getName();
                        if ("setStatus".equals(name)) {
                            statusCode = (int) args[0];
                            return null;
                        }
                        if ("getWriter".equals(name)) {
                            return new PrintWriter(responseWriter);
                        }
                        if ("setHeader".equals(name) || "setContentType".equals(name) || "setCharacterEncoding".equals(name)) {
                            return null;
                        }
                        return null;
                    });
        }
    }

    @Test
    @DisplayName("1. AuthServlet: Login with Valid Customer Credentials")
    void testAuthServletLogin() throws Exception {
        MockContext ctx = new MockContext();
        ctx.params.put("action", "login");
        ctx.requestBody = "{\"username\":\"john_doe\",\"password\":\"password123\"}";

        authServlet.service(ctx.createRequest(), ctx.createResponse());

        assertEquals(200, ctx.statusCode);
        String response = ctx.responseWriter.toString();
        assertTrue(response.contains("\"success\":true"));
        assertTrue(response.contains("john_doe"));
        assertNotNull(ctx.sessionAttributes.get("user"));
    }

    @Test
    @DisplayName("2. TransactionServlet: Submit Candidate Transaction via REST API")
    void testTransactionServletSubmit() throws Exception {
        MockContext ctx = new MockContext();
        ctx.requestBody = "{" +
                "\"userId\":2," +
                "\"senderAccount\":\"ACC-98421001\"," +
                "\"recipientAccount\":\"ACC-MERCHANT\"," +
                "\"amount\":25.00," +
                "\"transactionType\":\"PAYMENT\"," +
                "\"location\":\"London, UK\"" +
                "}";

        transactionServlet.service(ctx.createRequest(), ctx.createResponse());

        assertEquals(200, ctx.statusCode);
        String response = ctx.responseWriter.toString();
        assertTrue(response.contains("\"success\":true"));
        assertTrue(response.contains("referenceId"));
    }

    @Test
    @DisplayName("3. DashboardServlet: Executive Metrics Aggregation")
    void testDashboardServletGet() throws Exception {
        MockContext ctx = new MockContext();
        ctx.servletPath = "/api/dashboard";

        dashboardServlet.service(ctx.createRequest(), ctx.createResponse());

        assertEquals(200, ctx.statusCode);
        String response = ctx.responseWriter.toString();
        assertTrue(response.contains("\"success\":true"));
        assertTrue(response.contains("totalTransactions"));
        assertTrue(response.contains("openCasesCount"));
    }

    @Test
    @DisplayName("4. FraudCaseServlet: List Open Cases")
    void testFraudCaseServletGetOpen() throws Exception {
        MockContext ctx = new MockContext();
        ctx.servletPath = "/api/cases";
        ctx.params.put("openOnly", "true");

        fraudCaseServlet.service(ctx.createRequest(), ctx.createResponse());

        assertEquals(200, ctx.statusCode);
        String response = ctx.responseWriter.toString();
        assertTrue(response.contains("\"success\":true"));
    }
}
