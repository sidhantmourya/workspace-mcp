package com.mcp.java_mcp.model;

public record FileMatch(
    String relativePath,
    String projectName,
    String packageName,
    long lineCount,
    String lastModified
) {}
