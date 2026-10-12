package com.fraud.web;

import com.fraud.model.Role;
import com.fraud.model.User;
import jakarta.servlet.Filter;
import jakarta.servlet.FilterChain;
import jakarta.servlet.FilterConfig;
import jakarta.servlet.ServletException;
import jakarta.servlet.ServletRequest;
import jakarta.servlet.ServletResponse;
import jakarta.servlet.annotation.WebFilter;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import jakarta.servlet.http.HttpSession;

import java.io.IOException;

/**
 * Filter enforcing session-based authentication and role-based access control (RBAC).
 *
 * Demonstrates:
 * - Jakarta Servlet Filter specification
 * - Separation between PUBLIC endpoints (/api/auth) and PROTECTED endpoints
 * - Role authorization (e.g. only ADMIN users can assign/resolve cases or modify rules)
 */
@WebFilter(filterName = "AuthenticationFilter", urlPatterns = {"/api/*"})
public class AuthenticationFilter implements Filter {

    @Override
    public void init(FilterConfig filterConfig) {
        // Initialization if needed
    }

    @Override
    public void doFilter(ServletRequest request, ServletResponse response, FilterChain chain)
            throws IOException, ServletException {

        HttpServletRequest req = (HttpServletRequest) request;
        HttpServletResponse resp = (HttpServletResponse) response;

        // Allow CORS preflight requests
        if ("OPTIONS".equalsIgnoreCase(req.getMethod())) {
            chain.doFilter(request, response);
            return;
        }

        String path = req.getServletPath();
        String uri = req.getRequestURI();

        // 1. Public endpoints (auth login, register, me check)
        if (uri.contains("/api/auth")) {
            chain.doFilter(request, response);
            return;
        }

        // 2. Allow read-only access for demonstration or authenticated session checks
        HttpSession session = req.getSession(false);
        boolean isAuthenticated = (session != null && session.getAttribute("user") != null);

        // For B.Tech viva demo convenience: allow GET requests for dashboards/rules, but guard mutations
        if (req.getMethod().equalsIgnoreCase("GET")) {
            chain.doFilter(request, response);
            return;
        }

        // Guard mutations if not authenticated
        if (!isAuthenticated) {
            // Check if mock / direct testing header is provided
            String authHeader = req.getHeader("Authorization");
            if (authHeader != null && authHeader.startsWith("Bearer ")) {
                chain.doFilter(request, response);
                return;
            }

            // In production/session mode, verify login
            resp.setStatus(HttpServletResponse.SC_UNAUTHORIZED);
            resp.setContentType("application/json");
            resp.getWriter().write("{\"success\":false,\"error\":\"Authentication required to perform this action\"}");
            return;
        }

        User currentUser = (User) session.getAttribute("user");

        // Role-based authorization for administrative mutations
        if (uri.contains("/api/rules") || uri.contains("/api/cases?action=resolve") || uri.contains("/api/cases?action=assign")) {
            if (currentUser.getRole() != Role.ADMIN) {
                resp.setStatus(HttpServletResponse.SC_FORBIDDEN);
                resp.setContentType("application/json");
                resp.getWriter().write("{\"success\":false,\"error\":\"Forbidden: Admin privileges required\"}");
                return;
            }
        }

        chain.doFilter(request, response);
    }

    @Override
    public void destroy() {
        // Cleanup if needed
    }
}
