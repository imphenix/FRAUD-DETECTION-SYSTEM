package com.fraud;

import com.fraud.exception.AuthenticationException;
import com.fraud.exception.ValidationException;
import com.fraud.model.Customer;
import com.fraud.model.Role;
import com.fraud.model.Transaction;
import com.fraud.model.TransactionStatus;
import com.fraud.model.TransactionType;
import com.fraud.model.User;
import com.fraud.service.UserService;
import com.fraud.service.TransactionService;
import com.fraud.web.AuthServlet;
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
import java.util.List;
import java.util.Map;

import static org.junit.jupiter.api.Assertions.*;

/**
 * Test suite verifying multi-user capabilities, user registration, authentication,
 * data isolation, duplicate credential rejection, and role-based permissions.
 */
public class MultiUserIntegrationTest {

    private static UserService userService;
    private static TransactionService transactionService;
    private static AuthServlet authServlet;
    private static TransactionServlet transactionServlet;

    @BeforeAll
    static void init() {
        userService = new UserService();
        transactionService = new TransactionService();
        authServlet = new AuthServlet(userService);
        transactionServlet = new TransactionServlet(transactionService);
    }

    private static class MockContext {
        final Map<String, String> params = new HashMap<>();
        final Map<String, Object> sessionAttributes = new HashMap<>();
        final StringWriter responseWriter = new StringWriter();
        int statusCode = 200;
        String requestBody = "";
        String servletPath = "/api";
        boolean sessionInvalidated = false;

        HttpServletRequest createRequest() {
            return (HttpServletRequest) Proxy.newProxyInstance(
                    HttpServletRequest.class.getClassLoader(),
                    new Class<?>[]{HttpServletRequest.class},
                    (proxy, method, args) -> {
                        String name = method.getName();
                        if ("getParameter".equals(name)) return params.get(args[0]);
                        if ("getReader".equals(name)) return new BufferedReader(new StringReader(requestBody));
                        if ("getServletPath".equals(name)) return servletPath;
                        if ("getRequestURI".equals(name)) return servletPath;
                        if ("getMethod".equals(name)) return "POST";
                        if ("getRemoteAddr".equals(name)) return "127.0.0.1";
                        if ("getSession".equals(name)) {
                            boolean create = args.length > 0 ? (boolean) args[0] : true;
                            if (sessionInvalidated && !create) return null;
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
                        if ("getAttribute".equals(name)) return sessionAttributes.get(args[0]);
                        if ("setAttribute".equals(name)) {
                            sessionAttributes.put((String) args[0], args[1]);
                            return null;
                        }
                        if ("removeAttribute".equals(name)) {
                            sessionAttributes.remove(args[0]);
                            return null;
                        }
                        if ("invalidate".equals(name)) {
                            sessionInvalidated = true;
                            sessionAttributes.clear();
                            return null;
                        }
                        if ("getId".equals(name)) return "MOCK-SESSION-MULTI";
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
                        if ("getWriter".equals(name)) return new PrintWriter(responseWriter);
                        return null;
                    });
        }
    }

    @Test
    @DisplayName("1. Multi-User: Register Customer A and Customer B independently")
    void testIndependentCustomerRegistration() throws Exception {
        long ts = System.currentTimeMillis();
        String userA = "alice_" + ts;
        String emailA = "alice_" + ts + "@example.com";
        String accA = "ACC-A-" + ts;

        Customer custA = userService.registerCustomer(userA, "password123", "Alice Smith", emailA, "+1-555-1001", accA, new BigDecimal("5000.00"));
        assertNotNull(custA.getId());
        assertEquals(userA, custA.getUsername());
        assertEquals(emailA, custA.getEmail());

        String userB = "bob_" + ts;
        String emailB = "bob_" + ts + "@example.com";
        String accB = "ACC-B-" + ts;

        Customer custB = userService.registerCustomer(userB, "password456", "Bob Jones", emailB, "+1-555-1002", accB, new BigDecimal("7500.00"));
        assertNotNull(custB.getId());
        assertNotEquals(custA.getId(), custB.getId());
        assertNotEquals(custA.getAccountNumber(), custB.getAccountNumber());
    }

    @Test
    @DisplayName("2. Multi-User: Rejection of Duplicate Username and Email")
    void testDuplicateCredentialRejection() throws Exception {
        long ts = System.currentTimeMillis();
        String user = "charlie_" + ts;
        String email = "charlie_" + ts + "@example.com";

        userService.registerCustomer(user, "password123", "Charlie Brown", email, null, "ACC-C-" + ts, new BigDecimal("1000.00"));

        // Duplicate username
        assertThrows(ValidationException.class, () -> {
            userService.registerCustomer(user, "newpass123", "Charlie Clone", "diff_" + ts + "@example.com", null, "ACC-DIFF-" + ts, new BigDecimal("500.00"));
        });

        // Duplicate email
        assertThrows(ValidationException.class, () -> {
            userService.registerCustomer("other_" + ts, "newpass123", "Other Name", email, null, "ACC-DIFF2-" + ts, new BigDecimal("500.00"));
        });
    }

    @Test
    @DisplayName("3. Multi-User: Login by Username or Email, Wrong Password Rejection")
    void testAuthenticationVariants() throws Exception {
        long ts = System.currentTimeMillis();
        String user = "diana_" + ts;
        String email = "diana_" + ts + "@example.com";

        userService.registerCustomer(user, "validPass123", "Diana Prince", email, null, "ACC-D-" + ts, new BigDecimal("2000.00"));

        // Login by username
        User auth1 = userService.authenticate(user, "validPass123");
        assertNotNull(auth1);

        // Login by email
        User auth2 = userService.authenticate(email, "validPass123");
        assertNotNull(auth2);
        assertEquals(auth1.getId(), auth2.getId());

        // Wrong password rejection
        assertThrows(AuthenticationException.class, () -> {
            userService.authenticate(user, "wrongPassword!");
        });
    }

    @Test
    @DisplayName("4. Multi-User: Transaction Isolation between Customer A and Customer B")
    void testTransactionDataIsolation() throws Exception {
        long ts = System.currentTimeMillis();
        Customer custA = userService.registerCustomer("userA_" + ts, "passA123", "User A", "userA_" + ts + "@test.com", null, "ACC-ISO-A-" + ts, new BigDecimal("10000.00"));
        Customer custB = userService.registerCustomer("userB_" + ts, "passB123", "User B", "userB_" + ts + "@test.com", null, "ACC-ISO-B-" + ts, new BigDecimal("10000.00"));

        // Submit transaction for User A
        Transaction txA = new Transaction(custA.getId(), custA.getAccountNumber(), "ACC-RECV", new BigDecimal("100.00"), TransactionType.PAYMENT, "New York, USA");
        Transaction processedA = transactionService.processTransaction(txA);

        // Submit transaction for User B
        Transaction txB = new Transaction(custB.getId(), custB.getAccountNumber(), "ACC-RECV", new BigDecimal("200.00"), TransactionType.PAYMENT, "London, UK");
        Transaction processedB = transactionService.processTransaction(txB);

        // Verify User A transactions contain only A's
        List<Transaction> listA = transactionService.getTransactionsByUserId(custA.getId());
        assertTrue(listA.stream().anyMatch(t -> t.getId().equals(processedA.getId())));
        assertFalse(listA.stream().anyMatch(t -> t.getId().equals(processedB.getId())));

        // Verify User B transactions contain only B's
        List<Transaction> listB = transactionService.getTransactionsByUserId(custB.getId());
        assertTrue(listB.stream().anyMatch(t -> t.getId().equals(processedB.getId())));
        assertFalse(listB.stream().anyMatch(t -> t.getId().equals(processedA.getId())));
    }

    @Test
    @DisplayName("5. Multi-User: Session Invalidation on Logout")
    void testLogoutSessionInvalidation() throws Exception {
        MockContext ctx = new MockContext();
        ctx.params.put("action", "logout");

        authServlet.service(ctx.createRequest(), ctx.createResponse());

        assertEquals(200, ctx.statusCode);
        assertTrue(ctx.sessionInvalidated);
        assertNull(ctx.sessionAttributes.get("user"));
    }

    @Test
    @DisplayName("6. Multi-User & INR: Large Amount (₹90,00,00,000) Evaluated without Precision Loss")
    void testLargeAmountInrEvaluation() throws Exception {
        long ts = System.currentTimeMillis();
        // Register customer with sufficient balance for testing
        Customer cust = userService.registerCustomer("whale_" + ts, "passWhale123", "Corporate Customer",
                "whale_" + ts + "@corp.in", "+91-98765-09999", "ACC-WHALE-" + ts, new BigDecimal("100000000000.00"));

        // Candidate of ₹90,00,00,000 (900000000.00)
        Transaction largeTx = new Transaction(cust.getId(), cust.getAccountNumber(), "ACC-RECIPIENT",
                new BigDecimal("900000000.00"), TransactionType.TRANSFER, "New Delhi, India");

        Transaction processed = transactionService.processTransaction(largeTx);

        assertNotNull(processed);
        assertNotNull(processed.getId());
        assertTrue(processed.getRiskScore() >= 30, "Risk score must be at least 30 from HIGH_AMOUNT rule");
        assertEquals(TransactionStatus.FLAGGED, processed.getStatus());
        assertTrue(processed.getNotes().contains("exceeds threshold limit"));
    }
}
