import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { getWorkspaceRoot } from "../config.js";
import { toAbsolute, isWithinWorkspace } from "../utils/file.utils.js";
import {
  getSourceFile,
  extractExports,
  extractFunctionBody,
  extractModuleSummary,
} from "../parsers/core.parser.js";

export function registerJsFileTools(server: McpServer): void {

  // ── js_getSymbols ────────────────────────────────────────────────────────
  server.tool(
    "js_getSymbols",
    "List all exported symbols in a file: functions, classes, consts, types, interfaces. " +
    "Returns signatures only — no bodies. Always call this before js_getFunctionBody.",
    {
      file: z.string().describe("Workspace-relative path to the file"),
    },
    async ({ file }) => {
      const root = getWorkspaceRoot();
      const absFile = toAbsolute(file, root);

      if (!isWithinWorkspace(absFile, root)) {
        throw new Error(`File is outside workspace: ${file}`);
      }

      const sf = getSourceFile(absFile);
      const symbols = extractExports(sf);

      return {
        content: [{ type: "text", text: JSON.stringify(symbols, null, 2) }],
      };
    }
  );

  // ── js_getModuleSummary ──────────────────────────────────────────────────
  server.tool(
    "js_getModuleSummary",
    "Get the import/export map of a file. Shows dependencies and what is exposed. " +
    "Use this to trace barrel files and import chains without reading any file body.",
    {
      file: z.string().describe("Workspace-relative path to the file"),
    },
    async ({ file }) => {
      const root = getWorkspaceRoot();
      const absFile = toAbsolute(file, root);

      if (!isWithinWorkspace(absFile, root)) {
        throw new Error(`File is outside workspace: ${file}`);
      }

      const sf = getSourceFile(absFile);
      const summary = extractModuleSummary(sf);

      return {
        content: [{ type: "text", text: JSON.stringify(summary, null, 2) }],
      };
    }
  );

  // ── js_getFunctionBody ───────────────────────────────────────────────────
  server.tool(
    "js_getFunctionBody",
    "Extract the full source of one named function, method, or arrow const. " +
    "Only call this after js_getSymbols confirms the symbol name exists in the file.",
    {
      file: z.string().describe("Workspace-relative path to the file"),
      name: z.string().describe("Exact name of the function, method, or const to extract"),
    },
    async ({ file, name }) => {
      const root = getWorkspaceRoot();
      const absFile = toAbsolute(file, root);

      if (!isWithinWorkspace(absFile, root)) {
        throw new Error(`File is outside workspace: ${file}`);
      }

      const sf = getSourceFile(absFile);
      const result = extractFunctionBody(sf, name);

      return {
        content: [{ type: "text", text: JSON.stringify(result, null, 2) }],
      };
    }
  );
}
