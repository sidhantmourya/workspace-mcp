import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import path from "node:path";
import { getWorkspaceRoot } from "../config.js";
import { toAbsolute, toRelative, isWithinWorkspace, findFiles } from "../utils/file.utils.js";
import { detectFramework } from "../utils/framework.detect.js";
import { getSourceFile, extractExports } from "../parsers/core.parser.js";
import { getComponents as getReactComponents } from "../parsers/react.parser.js";
import {
  getComponents as getAngularComponents,
} from "../parsers/angular.parser.js";

export function registerFrameworkTools(server: McpServer): void {

  // ── js_getComponents ─────────────────────────────────────────────────────
  server.tool(
    "js_getComponents",
    "List all components in a file with their props/inputs and hooks used. " +
    "Works for React (.tsx/.jsx) and Angular (.ts with @Component). No bodies returned.",
    {
      file: z.string().describe("Workspace-relative path to the component file"),
    },
    async ({ file }) => {
      const root = getWorkspaceRoot();
      const absFile = toAbsolute(file, root);

      if (!isWithinWorkspace(absFile, root)) {
        throw new Error(`File is outside workspace: ${file}`);
      }

      const dir = path.dirname(absFile);
      const { framework } = detectFramework(dir);
      const sf = getSourceFile(absFile);

      let components: unknown[];

      if (framework === "react") {
        components = getReactComponents(sf);
      } else if (framework === "angular") {
        components = getAngularComponents(sf);
      } else {
        // Vanilla TS/JS — return uppercase exported functions as possible components
        components = extractExports(sf).filter(
          (s) => s.kind === "function" && /^[A-Z]/.test(s.name)
        );
      }

      return {
        content: [{ type: "text", text: JSON.stringify(components, null, 2) }],
      };
    }
  );

  // ── js_getRoutes ─────────────────────────────────────────────────────────
  server.tool(
    "js_getRoutes",
    "Extract route definitions from a project directory. " +
    "Supports React Router, Angular RouterModule, and Next.js file-system routes.",
    {
      dir: z.string().describe("Workspace-relative path to the project directory"),
    },
    async ({ dir }) => {
      const root = getWorkspaceRoot();
      const absDir = toAbsolute(dir, root);

      if (!isWithinWorkspace(absDir, root)) {
        throw new Error(`dir is outside workspace: ${dir}`);
      }

      const { framework } = detectFramework(absDir);
      const routes: { path: string; component: string; file: string }[] = [];

      if (framework === "react") {
        // Next.js: app/ or pages/ directory = file-system routes
        const appDir = path.join(absDir, "src", "app");
        const pagesDir = path.join(absDir, "src", "pages");

        // findFiles is sync — use try/catch for directories that may not exist
        const routeFiles: string[] = [];
        try { routeFiles.push(...findFiles(appDir, "**/page.tsx")); } catch { /* dir may not exist */ }
        try { routeFiles.push(...findFiles(pagesDir, "**/*.tsx")); } catch { /* dir may not exist */ }

        for (const f of routeFiles) {
          const rel = toRelative(f, absDir);
          const routePath = rel
            .replace(/\/page\.tsx$/, "")
            .replace(/\.tsx$/, "")
            .replace(/^src\/(app|pages)/, "")
            || "/";
          routes.push({ path: routePath, component: "(file-system)", file: toRelative(f, root) });
        }

        // React Router: look for <Route path=... or routes config
        const routerFiles = findFiles(absDir, "**/*router*").concat(
          findFiles(absDir, "**/*routes*")
        );
        for (const f of routerFiles) {
          const sf = getSourceFile(f);
          const text = sf.getText();
          const matches = [...text.matchAll(/path:\s*["'`]([^"'`]+)["'`]/g)];
          for (const m of matches) {
            routes.push({ path: m[1], component: "(react-router)", file: toRelative(f, root) });
          }
        }
      }

      if (framework === "angular") {
        // Angular: look for RouterModule.forRoot or loadChildren patterns
        const routeFiles = findFiles(absDir, "**/*routing*").concat(
          findFiles(absDir, "**/*routes*")
        );
        for (const f of routeFiles) {
          const sf = getSourceFile(f);
          const text = sf.getText();
          const matches = [...text.matchAll(/path:\s*["'`]([^"'`]*)["'`]/g)];
          const components = [...text.matchAll(/component:\s*(\w+)/g)];
          matches.forEach((m, i) => {
            routes.push({
              path: m[1],
              component: components[i]?.[1] ?? "(unknown)",
              file: toRelative(f, root),
            });
          });
        }
      }

      return {
        content: [{ type: "text", text: JSON.stringify(routes, null, 2) }],
      };
    }
  );

  // ── js_getTypeSignature ──────────────────────────────────────────────────
  server.tool(
    "js_getTypeSignature",
    "Extract the definition of one type alias or interface by name. " +
    "Use this to understand data shapes without reading the whole file.",
    {
      file: z.string().describe("Workspace-relative path to the file"),
      name: z.string().describe("Name of the type or interface to extract"),
    },
    async ({ file, name }) => {
      const root = getWorkspaceRoot();
      const absFile = toAbsolute(file, root);

      if (!isWithinWorkspace(absFile, root)) {
        throw new Error(`File is outside workspace: ${file}`);
      }

      const sf = getSourceFile(absFile);

      const iface = sf.getInterface(name);
      if (iface) {
        return {
          content: [{
            type: "text",
            text: JSON.stringify({ signature: iface.getText(), line: iface.getStartLineNumber() }, null, 2),
          }],
        };
      }

      const ta = sf.getTypeAlias(name);
      if (ta) {
        return {
          content: [{
            type: "text",
            text: JSON.stringify({ signature: ta.getText(), line: ta.getStartLineNumber() }, null, 2),
          }],
        };
      }

      throw new Error(`Type or interface "${name}" not found in ${file}`);
    }
  );
}
