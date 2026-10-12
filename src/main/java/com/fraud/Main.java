package com.fraud;

import com.fraud.util.DatabaseConnection;
import com.fraud.web.AuthServlet;
import com.fraud.web.AuthenticationFilter;
import com.fraud.web.DashboardServlet;
import com.fraud.web.FraudCaseServlet;
import com.fraud.web.TransactionServlet;
import org.apache.catalina.Context;
import org.apache.catalina.startup.Tomcat;
import org.apache.tomcat.util.descriptor.web.FilterDef;
import org.apache.tomcat.util.descriptor.web.FilterMap;

import java.io.File;
import java.sql.Connection;
import java.util.logging.Logger;

/**
 * Standalone embedded Tomcat launcher for live demonstration, academic viva, and local execution.
 *
 * Demonstrates:
 * - Embedded Apache Tomcat 10 container
 * - Programmatic servlet and filter registration
 * - Automatic schema initialization on launch
 */
public class Main {

    private static final Logger logger = Logger.getLogger(Main.class.getName());
    public static final int DEFAULT_PORT = 8080;

    public static void main(String[] args) throws Exception {
        int port = DEFAULT_PORT;
        String portEnv = System.getenv("PORT");
        if (portEnv != null && !portEnv.isEmpty()) {
            try {
                port = Integer.parseInt(portEnv);
            } catch (NumberFormatException ignored) {}
        }

        // Initialize Database schema and pool
        try (Connection conn = DatabaseConnection.getConnection()) {
            logger.info("Connected to database successfully for standalone runtime: " + conn.getMetaData().getDatabaseProductName());
        }

        Tomcat tomcat = new Tomcat();
        tomcat.setPort(port);
        tomcat.getConnector(); // trigger connector creation

        String docBase = new File("src/main/webapp").getAbsolutePath();
        Context ctx = tomcat.addWebapp("", docBase);

        // Register Servlets
        Tomcat.addServlet(ctx, "AuthServlet", new AuthServlet());
        ctx.addServletMappingDecoded("/api/auth/*", "AuthServlet");
        ctx.addServletMappingDecoded("/api/auth", "AuthServlet");

        Tomcat.addServlet(ctx, "TransactionServlet", new TransactionServlet());
        ctx.addServletMappingDecoded("/api/transactions/*", "TransactionServlet");
        ctx.addServletMappingDecoded("/api/transactions", "TransactionServlet");

        Tomcat.addServlet(ctx, "FraudCaseServlet", new FraudCaseServlet());
        ctx.addServletMappingDecoded("/api/cases/*", "FraudCaseServlet");
        ctx.addServletMappingDecoded("/api/cases", "FraudCaseServlet");
        ctx.addServletMappingDecoded("/api/alerts/*", "FraudCaseServlet");
        ctx.addServletMappingDecoded("/api/alerts", "FraudCaseServlet");

        Tomcat.addServlet(ctx, "DashboardServlet", new DashboardServlet());
        ctx.addServletMappingDecoded("/api/dashboard", "DashboardServlet");
        ctx.addServletMappingDecoded("/api/rules/*", "DashboardServlet");
        ctx.addServletMappingDecoded("/api/rules", "DashboardServlet");

        // Register AuthenticationFilter
        FilterDef filterDef = new FilterDef();
        filterDef.setFilterName("AuthenticationFilter");
        filterDef.setFilterClass(AuthenticationFilter.class.getName());
        ctx.addFilterDef(filterDef);

        FilterMap filterMap = new FilterMap();
        filterMap.setFilterName("AuthenticationFilter");
        filterMap.addURLPattern("/api/*");
        ctx.addFilterMap(filterMap);

        logger.info("Starting Embedded Tomcat on port " + port + "...");
        tomcat.start();
        logger.info("Fraud Detection System is live at: http://localhost:" + port);

        // Keep server running
        tomcat.getServer().await();
    }
}
