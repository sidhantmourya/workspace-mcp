# Java MCP Server (java-mcp)

A token-efficient Model Context Protocol (MCP) server built with Spring Boot, designed to help AI assistants navigate and interact with large Java codebases without blowing up their context window.

## Goal & Core Philosophy

The primary goal of this server is to prevent context degradation and token exhaustion when AI agents analyze Java projects. Instead of loading entire files into memory, the AI requests only the information it needs, when it needs it.

**The Core Navigation Pattern:**
```
file name → java_getFunctions() → [signatures only]
                ↓
         java_getFunctionBody(specific method)
                ↓
         minimal context, no hallucinations
```

## Architecture

This project is built using:
- **Java 21**
- **Spring Boot 3.x**
- **Spring AI MCP Server** (`spring-ai-mcp-server-spring-boot-starter`)
- **JavaParser** (`javaparser-symbol-solver-core` 3.26.3) for precise AST-based code extraction.

### Core Components

The server exposes three main suites of tools via the MCP protocol using the `stdio` transport:

1. **`WorkspaceTool`**: Helps the agent understand the workspace layout. Includes finding files across the entire workspace (`findFile`) or scoped to specific projects (`findFileInProject`), and identifying project types.
2. **`JavaFileTool`**: The core parsing engine. Exposes methods to extract summaries (`java_getClassSummary`), method signatures (`java_getFunctions`), and specific method bodies (`java_getFunctionBody`, `java_getFunctionWithContext`).
3. **`TestRunnerTool`**: A self-verifying loop mechanism. Allows the agent to run specific tests (`java_runTest`) or test classes (`java_runTestClass`) via Maven and inspect the output to iteratively fix code.

## Usage

### Prerequisites
- Java 21
- Maven

### Running the Server
Build the project using Maven:
```bash
mvn clean package
```

### Client Configuration (e.g., Claude Desktop)
Add the following to your MCP client configuration (like `claude_desktop_config.json`) to register the server. Ensure you set the `app.workspace-root` system property to the directory you want the AI to have access to.

```json
{
  "mcpServers": {
    "java-mcp-server": {
      "command": "java or path to java binary",
      "args": [
        "-Dapp.workspace-root=d:\\Codes\\workspace-mcp\\java-mcp",
        "-jar",
        "d:\\Codes\\workspace-mcp\\java-mcp\\target\\java-mcp.jar"
      ]
    }
  }
}
```

## Working alongside `AGENTS.md`

This project includes an `AGENTS.md` file which defines strict execution rules and constraints for the AI agent interacting with the codebase. 

### When to use `AGENTS.md`
Whenever an AI agent is tasked with working on a codebase that is serviced by this Java MCP server, the rules defined in `AGENTS.md` **must** be injected into the agent's system instructions or prompt. It is the rulebook that governs *how* the AI uses the server.

### How it enforces the architecture
While the MCP server provides the *capabilities*, `AGENTS.md` provides the *constraints*:
- **Forbidden Actions:** The agent is explicitly forbidden from using raw bash commands (`cat`, `grep`, `sed`) or standard `read` tools to dump entire `.java` files into its context.
- **Mandatory Workflow:** 
  1. **Discovery:** The agent *must* use `java-mcp-server` tools (like `java_getFunctions` or `java_getClassSummary`) to map out the file structure first.
  2. **Analysis:** Evaluate the returned signatures and fields.
  3. **Targeted Inspection:** Extract only the necessary logic using targeted tools like `java_getFunctionBody`.
- **Penalty Enforcement:** The file warns the agent that violating these rules leads to immediate context bloating and degradation.

By pairing the powerful AST-parsing capabilities of `java-mcp` with the strict behavioral guidelines in `AGENTS.md`, AI agents can efficiently maintain massive Java codebases while remaining fast, focused, and token-efficient.
