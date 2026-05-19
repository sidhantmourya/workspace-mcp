import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { getWorkspaceRoot } from "../config.js";
import { findFiles, toRelative, toAbsolute, isWithinWorkspace } from "../utils/file.utils.js";
import { detectFramework } from "../utils/framework.detect.js";
import path from "node:path";
import fs from "node:fs";

export function registerWorkspaceTools(server: McpServer): void {

  // ── js_findFile ──────────────────────────────────────────────────────────
  server.tool(
    "js_findFile",
    "Find files in the workspace by glob pattern. Returns workspace-relative paths.",
    {
      pattern: z.string().describe("Glob pattern, e.g. '**/*.service.ts'"),
      scope: z.string().optional().describe("Subdirectory to search in (workspace-relative)"),
    },
    async ({ pattern, scope }) => {
      const root = getWorkspaceRoot();
      const searchIn = scope
        ? toAbsolute(scope, root)
        : root;

      if (!isWithinWorkspace(searchIn, root)) {
        throw new Error(`scope is outside workspace: ${scope}`);
      }

      const files = findFiles(searchIn, pattern);
      const relative = files.map((f) => toRelative(f, root));

      return {
        content: [{ type: "text", text: JSON.stringify(relative, null, 2) }],
      };
    }
  );

  // ── js_detectFramework ───────────────────────────────────────────────────
  server.tool(
    "js_detectFramework",
    "Detect which JS/TS framework a directory uses. Call this first when entering any new directory.",
    {
      dir: z.string().describe("Workspace-relative path to the project directory"),
    },
    async ({ dir }) => {
      const root = getWorkspaceRoot();
      const absDir = toAbsolute(dir, root);

      if (!isWithinWorkspace(absDir, root)) {
        throw new Error(`dir is outside workspace: ${dir}`);
      }

      const result = detectFramework(absDir);

      return {
        content: [{ type: "text", text: JSON.stringify(result, null, 2) }],
      };
    }
  );

  // ── js_getProjectStructure ───────────────────────────────────────────────
  server.tool(
    "js_getProjectStructure",
    "Get entry points, config files, and source roots for a project. No file bodies returned.",
    {
      dir: z.string().describe("Workspace-relative path to the project directory"),
    },
    async ({ dir }) => {
      const root = getWorkspaceRoot();
      const absDir = toAbsolute(dir, root);

      if (!isWithinWorkspace(absDir, root)) {
        throw new Error(`dir is outside workspace: ${dir}`);
      }

      const configPatterns = [
        "tsconfig*.json",
        "vite.config.*",
        "webpack.config.*",
        "angular.json",
        "next.config.*",
        "package.json",
      ];

      const entryPatterns = [
        "src/main.ts",
        "src/main.tsx",
        "src/index.ts",
        "src/index.tsx",
        "src/index.js",
        "index.ts",
        "index.js",
      ];

      const configFiles = configPatterns
        .flatMap((p) => findFiles(absDir, p))
        .map((f) => toRelative(f, root));

      const entryPoints = entryPatterns
        .map((p) => path.join(absDir, p))
        .filter((f) => fs.existsSync(f))
        .map((f) => toRelative(f, root));

      const sourceRoots = ["src", "lib", "app"]
        .map((d) => path.join(absDir, d))
        .filter((d) => fs.existsSync(d) && fs.statSync(d).isDirectory())
        .map((d) => toRelative(d, root));

      const structure = { entryPoints, configFiles, sourceRoots };

      return {
        content: [{ type: "text", text: JSON.stringify(structure, null, 2) }],
      };
    }
  );
}
