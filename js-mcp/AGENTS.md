# JS-MCP Agent Rules

You are working on a JavaScript/TypeScript codebase.
This codebase is served by the `js-mcp-server` MCP tool suite.
These rules are mandatory. Violating them causes context bloat and hallucinations.

---

## Forbidden actions

NEVER use any of the following to read source files:
- `cat`, `head`, `tail`, `less` on any `.ts`, `.tsx`, `.js`, `.jsx` file
- `grep` to search for function or class definitions
- `read_file` or any raw file-reading tool on source files
- `find` to map the codebase structure

These actions dump entire files into context. They are banned.

---

## Mandatory workflow

### Step 1 — Orient (always first in any new directory)
Call `js_detectFramework` before doing anything else in a directory
you have not visited in this session.

```
js_detectFramework({ dir: "packages/api" })
→ { framework: "typescript", version: "^5.4.0" }
```

### Step 2 — Locate the file
Use `js_findFile` to locate files. Never guess paths.

```
js_findFile({ pattern: "**/*.service.ts", scope: "packages/api/src" })
→ ["packages/api/src/user/user.service.ts", ...]
```

### Step 3 — Map the file
Before reading any body, call `js_getSymbols` on the file.
This gives you all exports with signatures — no bodies wasted in context.

```
js_getSymbols({ file: "packages/api/src/user/user.service.ts" })
→ [{ name: "getUser", kind: "function", signature: "(id: string): Promise<User>", line: 12 }]
```

### Step 4 — Understand imports and exports (if needed)
If you need to trace where something comes from or goes to, use
`js_getModuleSummary` — not file reading.

```
js_getModuleSummary({ file: "packages/api/src/user/user.service.ts" })
→ { imports: [{ from: "../db", names: ["db"] }], exports: ["getUser"], reExports: [] }
```

### Step 5 — Extract only what you need
Only after step 3 confirms the symbol exists, call `js_getFunctionBody`
with the exact name.

```
js_getFunctionBody({ file: "packages/api/src/user/user.service.ts", name: "getUser" })
→ { body: "...", startLine: 12, endLine: 20 }
```

---

## Framework-specific rules

### React / Next.js
- Use `js_getComponents` to inspect component props and hooks before reading the component body.
- Use `js_getRoutes` to understand routing before reading page files.

### Angular
- Use `js_getComponents` to read `@Component` metadata (selector, inputs, outputs).
- Use `js_getTypeSignature` to understand service method signatures before reading the service body.

### Vanilla JS / Plain TypeScript / Node
- `js_getSymbols` and `js_getFunctionBody` are sufficient.
- No framework-specific tool needed.

---

## Type shapes
To understand a data type or interface, always use:
```
js_getTypeSignature({ file: "...", name: "User" })
```
Never read the file to find a type definition.

---

## Penalty reminder
If you read a file directly:
- You waste context tokens on irrelevant code
- You increase the chance of hallucinating APIs that don't exist
- You lose track of the file structure you already mapped

Stay in the funnel:
**find → detect → symbols → body (only if needed)**
