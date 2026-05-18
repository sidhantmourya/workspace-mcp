package com.mcp.java_mcp.model;

public record MethodSignature(
    String name,
    String params,
    String returnType,
    int startLine,
    int endLine,
    String enclosingClass
) {}
