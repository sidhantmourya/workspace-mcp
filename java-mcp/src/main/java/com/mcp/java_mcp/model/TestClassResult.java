package com.mcp.java_mcp.model;

import java.util.List;

public record TestClassResult(
    List<String> passed,
    List<String> failed,
    List<String> errors,
    String summary
) {}
