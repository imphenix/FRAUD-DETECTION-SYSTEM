<%@ page language="java" contentType="text/html; charset=UTF-8" pageEncoding="UTF-8"%>
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>AI-Powered Fraud Detection System</title>
    <style>
        body { font-family: system-ui, -apple-system, sans-serif; background: #f8fafc; color: #0f172a; margin: 0; padding: 2rem; display: flex; justify-content: center; }
        .card { max-width: 600px; width: 100%; background: #ffffff; border-radius: 12px; box-shadow: 0 4px 6px -1px rgba(0,0,0,0.1); border: 1px solid #e2e8f0; padding: 2rem; }
        .badge { display: inline-block; padding: 0.25rem 0.75rem; border-radius: 9999px; font-size: 0.875rem; font-weight: 600; background: #ecfdf5; color: #065f46; margin-bottom: 1rem; }
        h1 { margin: 0 0 0.5rem 0; font-size: 1.5rem; color: #1e293b; }
        p { color: #475569; font-size: 0.95rem; line-height: 1.5; }
        .status-box { background: #f1f5f9; border-radius: 8px; padding: 1rem; margin-top: 1.5rem; border-left: 4px solid #3b82f6; }
        .status-item { display: flex; justify-content: space-between; margin-bottom: 0.5rem; font-size: 0.9rem; }
        .status-item:last-child { margin-bottom: 0; }
        .label { font-weight: 500; color: #334155; }
        .val { font-family: monospace; color: #0284c7; }
    </style>
</head>
<body>
    <div class="card">
        <span class="badge">System Operational</span>
        <h1>AI-Powered Fraud Detection System</h1>
        <p>3rd Semester B.Tech Java Project &mdash; Multi-factor Risk Scoring, Concurrency, and JDBC Transactions.</p>
        
        <div class="status-box">
            <div class="status-item">
                <span class="label">Phase Status:</span>
                <span class="val">Phase 1 &mdash; Database & Connection Layer Completed</span>
            </div>
            <div class="status-item">
                <span class="label">Architecture:</span>
                <span class="val">Layered (Web / Service / Strategy / Repository / JDBC)</span>
            </div>
            <div class="status-item">
                <span class="label">Database Engine:</span>
                <span class="val">MySQL 8 / MariaDB (Embedded H2 MySQL Mode Active)</span>
            </div>
            <div class="status-item">
                <span class="label">Runtime:</span>
                <span class="val">Java 17 OpenJDK + Maven + Jakarta Servlet 6.0</span>
            </div>
        </div>
    </div>
</body>
</html>
