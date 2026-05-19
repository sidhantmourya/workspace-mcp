# js-mcp

A token-efficient MCP server for AI agents navigating JavaScript and
TypeScript codebases. Built with Node.js, TypeScript, and ts-morph.

Supports: Vanilla JS · TypeScript · React · Next.js · Angular

No test runner. Discovery and parsing only.

---

## The navigation pattern

```
js_detectFramework        ← what kind of project is this?
        ↓
js_findFile               ← where is the file?
        ↓
js_getSymbols             ← what does the file export? (signatures only)
        ↓
js_getFunctionBody        ← get one function body, nothing else
```

This pattern keeps context small. The agent never reads whole files.

---

## Prerequisites

- Node.js 20+
- npm 9+

---

## Installation

```bash
git clone https://github.com/your-org/js-mcp
cd js-mcp
npm install
npm run build
```

---

## Configuration

Copy `.env.example` to `.env` and set your workspace root:

```
APP_WORKSPACE_ROOT=/absolute/path/to/your/project
```

---

## Client setup (Claude Desktop)

Add to your `claude_desktop_config.json`:

```json
{
  "mcpServers": {
    "js-mcp-server": {
      "command": "node",
      "args": ["/absolute/path/to/js-mcp/dist/index.js"],
      "env": {
        "APP_WORKSPACE_ROOT": "/absolute/path/to/your/project"
      }
    }
  }
}
```

Restart Claude Desktop after saving.

---

## Tools

| Tool | Purpose |
|---|---|
| `js_findFile` | Glob for files in workspace |
| `js_detectFramework` | Detect React / Angular / TS / vanilla JS |
| `js_getProjectStructure` | Entry points, config files, source roots |
| `js_getSymbols` | All exports from a file — signatures only |
| `js_getModuleSummary` | Imports, exports, re-exports for a file |
| `js_getFunctionBody` | One named function/method body |
| `js_getComponents` | React or Angular component metadata |
| `js_getRoutes` | Route definitions across the project |
| `js_getTypeSignature` | One type or interface definition |

---

## Agent rules

See `AGENTS.md`. Inject its contents into the agent system prompt
whenever the agent works on a codebase served by this server.

---

## Running alongside java-mcp

Both servers can run in the same MCP client config simultaneously:

```json
{
  "mcpServers": {
    "java-mcp-server": {
      "command": "java",
      "args": ["-Dapp.workspace-root=/path/to/java-project", "-jar", "/path/to/java-mcp.jar"]
    },
    "js-mcp-server": {
      "command": "node",
      "args": ["/path/to/js-mcp/dist/index.js"],
      "env": {
        "APP_WORKSPACE_ROOT": "/path/to/js-project"
      }
    }
  }
}
```
