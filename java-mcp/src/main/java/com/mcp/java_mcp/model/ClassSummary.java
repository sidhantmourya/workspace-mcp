package com.mcp.java_mcp.model;

import java.util.List;

public record ClassSummary(
    List<String> fields,
    List<MethodSignature> methods,
    List<String> baseClasses,
    List<String> annotations
) {}
