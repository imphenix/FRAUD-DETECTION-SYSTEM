package com.fraud.web;

import com.google.gson.Gson;
import com.google.gson.GsonBuilder;
import jakarta.servlet.http.HttpServlet;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;

import java.io.BufferedReader;
import java.io.IOException;
import java.io.PrintWriter;
import java.util.HashMap;
import java.util.Map;

/**
 * Base abstract servlet providing standardized JSON response formatting, CORS handling,
 * request parsing, and error encapsulation across all controller servlets.
 *
 * Demonstrates:
 * - Template method pattern for HTTP controller servlets
 * - JSON serialization using Google Gson
 * - Consistent HTTP status code mapping (200, 400, 401, 403, 404, 500)
 */
public abstract class BaseJsonServlet extends HttpServlet {

    protected static final Gson gson = new GsonBuilder()
            .setDateFormat("yyyy-MM-dd HH:mm:ss")
            .serializeNulls()
            .create();

    @Override
    protected void doOptions(HttpServletRequest req, HttpServletResponse resp) {
        setCorsHeaders(resp);
        resp.setStatus(HttpServletResponse.SC_OK);
    }

    protected void setCorsHeaders(HttpServletResponse response) {
        response.setHeader("Access-Control-Allow-Origin", "*");
        response.setHeader("Access-Control-Allow-Methods", "GET, POST, PUT, DELETE, OPTIONS");
        response.setHeader("Access-Control-Allow-Headers", "Content-Type, Authorization, X-Requested-With");
    }

    protected void writeSuccess(HttpServletResponse response, Object data) throws IOException {
        setCorsHeaders(response);
        response.setContentType("application/json");
        response.setCharacterEncoding("UTF-8");
        response.setStatus(HttpServletResponse.SC_OK);

        Map<String, Object> wrapper = new HashMap<>();
        wrapper.put("success", true);
        wrapper.put("data", data);

        try (PrintWriter writer = response.getWriter()) {
            writer.write(gson.toJson(wrapper));
            writer.flush();
        }
    }

    protected void writeError(HttpServletResponse response, int statusCode, String message) throws IOException {
        setCorsHeaders(response);
        response.setContentType("application/json");
        response.setCharacterEncoding("UTF-8");
        response.setStatus(statusCode);

        Map<String, Object> wrapper = new HashMap<>();
        wrapper.put("success", false);
        wrapper.put("error", message);

        try (PrintWriter writer = response.getWriter()) {
            writer.write(gson.toJson(wrapper));
            writer.flush();
        }
    }

    protected <T> T parseJsonBody(HttpServletRequest request, Class<T> clazz) throws IOException {
        StringBuilder sb = new StringBuilder();
        try (BufferedReader reader = request.getReader()) {
            String line;
            while ((line = reader.readLine()) != null) {
                sb.append(line);
            }
        }
        String body = sb.toString().trim();
        if (body.isEmpty()) {
            return null;
        }
        return gson.fromJson(body, clazz);
    }
}
