package com.mcp.java_mcp.util;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Component;

import java.nio.file.Path;
import java.nio.file.Paths;

@Component
public class PathSanitizer {

    @Value("${app.workspace-root}")
    private String workspaceRoot;

    /**
     * Resolves a relative path against the workspace root, ensuring
     * the result stays within the workspace boundary.
     * Blocks path traversal attempts (e.g. ../../etc/passwd).
     */
    public Path safe(String relativePath) {
        Path workspace = Paths.get(workspaceRoot).toAbsolutePath();
        Path resolved = workspace.resolve(relativePath)
                                 .toAbsolutePath()
                                 .normalize();
        if (!resolved.startsWith(workspace)) {
            throw new SecurityException("Path traversal attempt blocked: " + relativePath);
        }
        return resolved;
    }

    public String getWorkspaceRoot() {
        return workspaceRoot;
    }
}
