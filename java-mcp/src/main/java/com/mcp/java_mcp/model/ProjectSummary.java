package com.mcp.java_mcp.model;

public record ProjectSummary(
    String name,
    String type,
    String srcRoot,
    String buildFile
) {}
