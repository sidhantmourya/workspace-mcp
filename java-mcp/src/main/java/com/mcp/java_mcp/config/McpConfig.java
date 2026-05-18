package com.mcp.java_mcp.config;

import com.mcp.java_mcp.tools.JavaFileTool;
import com.mcp.java_mcp.tools.TestRunnerTool;
import com.mcp.java_mcp.tools.WorkspaceTool;
import org.springframework.ai.tool.ToolCallbackProvider;
import org.springframework.ai.tool.method.MethodToolCallbackProvider;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

@Configuration
public class McpConfig {

    @Bean
    public ToolCallbackProvider workspaceToolProvider(WorkspaceTool workspaceTool) {
        return MethodToolCallbackProvider.builder()
                .toolObjects(workspaceTool)
                .build();
    }

    @Bean
    public ToolCallbackProvider javaFileToolProvider(JavaFileTool javaFileTool) {
        return MethodToolCallbackProvider.builder()
                .toolObjects(javaFileTool)
                .build();
    }

    @Bean
    public ToolCallbackProvider testRunnerToolProvider(TestRunnerTool testRunnerTool) {
        return MethodToolCallbackProvider.builder()
                .toolObjects(testRunnerTool)
                .build();
    }
}
