package com.mcp.java_mcp.model;

public record TestResult(
    Status status,
    String reason,
    int line,
    String duration,
    String fullOutput
) {
    public enum Status {
        PASS, FAIL, ERROR, COMPILATION_ERROR
    }
}
