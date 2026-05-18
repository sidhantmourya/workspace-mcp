package com.mcp.java_mcp.model;

import java.util.List;

public record MethodWithContext(
    String body,
    List<String> imports,
    List<String> fields
) {}
