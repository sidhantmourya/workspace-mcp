import { Project, SourceFile, SyntaxKind } from "ts-morph";
import { isWithinWorkspace } from "../utils/file.utils.js";
import { getWorkspaceRoot } from "../config.js";

export type SymbolKind = "function" | "class" | "const" | "type" | "interface";

export type ExportedSymbol = {
  name: string;
  kind: SymbolKind;
  signature: string;
  line: number;
};

export type ModuleSummary = {
  imports: { from: string; names: string[] }[];
  exports: string[];
  reExports: string[];
};

export type FunctionBody = {
  body: string;
  startLine: number;
  endLine: number;
};

// Singleton project — reused across all calls to avoid re-parsing
let _project: Project | null = null;

export function getProject(): Project {
  if (!_project) {
    _project = new Project({
      skipAddingFilesFromTsConfig: true,
      compilerOptions: {
        allowJs: true,       // parse .js files too
        checkJs: false,      // don't type-check JS
      },
    });
  }
  return _project;
}

export function getSourceFile(filePath: string): SourceFile {
  const root = getWorkspaceRoot();

  if (!isWithinWorkspace(filePath, root)) {
    throw new Error(`Path is outside workspace: ${filePath}`);
  }

  const project = getProject();
  const existing = project.getSourceFile(filePath);
  if (existing) return existing;

  return project.addSourceFileAtPath(filePath);
}

/**
 * Return all exported symbols from a file — signatures only, no bodies.
 */
export function extractExports(sourceFile: SourceFile): ExportedSymbol[] {
  const results: ExportedSymbol[] = [];

  // Exported functions
  for (const fn of sourceFile.getFunctions()) {
    if (!fn.isExported()) continue;
    results.push({
      name: fn.getName() ?? "(anonymous)",
      kind: "function",
      signature: fn.getSignature().getDeclaration().getText().split("{")[0].trim(),
      line: fn.getStartLineNumber(),
    });
  }

  // Exported classes
  for (const cls of sourceFile.getClasses()) {
    if (!cls.isExported()) continue;
    const methods = cls.getMethods().map((m) => m.getName()).join(", ");
    results.push({
      name: cls.getName() ?? "(anonymous)",
      kind: "class",
      signature: `class ${cls.getName()} { ${methods} }`,
      line: cls.getStartLineNumber(),
    });
  }

  // Exported const / arrow functions
  for (const varStmt of sourceFile.getVariableStatements()) {
    if (!varStmt.isExported()) continue;
    for (const decl of varStmt.getDeclarations()) {
      const init = decl.getInitializer();
      const isArrow = init?.getKind() === SyntaxKind.ArrowFunction;
      results.push({
        name: decl.getName(),
        kind: isArrow ? "function" : "const",
        signature: decl.getText().split("=>")[0].trim() + (isArrow ? " => ..." : ""),
        line: decl.getStartLineNumber(),
      });
    }
  }

  // Exported interfaces
  for (const iface of sourceFile.getInterfaces()) {
    if (!iface.isExported()) continue;
    results.push({
      name: iface.getName(),
      kind: "interface",
      signature: `interface ${iface.getName()} { ${iface.getProperties().map((p) => p.getText()).join("; ")} }`,
      line: iface.getStartLineNumber(),
    });
  }

  // Exported type aliases
  for (const ta of sourceFile.getTypeAliases()) {
    if (!ta.isExported()) continue;
    results.push({
      name: ta.getName(),
      kind: "type",
      signature: ta.getText(),
      line: ta.getStartLineNumber(),
    });
  }

  return results;
}

/**
 * Extract the full body of one named function, method, or arrow const.
 */
export function extractFunctionBody(
  sourceFile: SourceFile,
  name: string
): FunctionBody {
  // Named function declaration
  const fn = sourceFile.getFunction(name);
  if (fn) {
    return {
      body: fn.getText(),
      startLine: fn.getStartLineNumber(),
      endLine: fn.getEndLineNumber(),
    };
  }

  // Arrow function stored in a const
  for (const varStmt of sourceFile.getVariableStatements()) {
    for (const decl of varStmt.getDeclarations()) {
      if (decl.getName() === name) {
        return {
          body: varStmt.getText(),
          startLine: varStmt.getStartLineNumber(),
          endLine: varStmt.getEndLineNumber(),
        };
      }
    }
  }

  // Method inside a class
  for (const cls of sourceFile.getClasses()) {
    const method = cls.getMethod(name);
    if (method) {
      return {
        body: method.getText(),
        startLine: method.getStartLineNumber(),
        endLine: method.getEndLineNumber(),
      };
    }
  }

  throw new Error(`Symbol "${name}" not found in ${sourceFile.getFilePath()}`);
}

/**
 * Return imports, exports, and re-exports — no bodies.
 */
export function extractModuleSummary(sourceFile: SourceFile): ModuleSummary {
  const imports = sourceFile.getImportDeclarations().map((imp) => ({
    from: imp.getModuleSpecifierValue(),
    names: imp.getNamedImports().map((n) => n.getName()),
  }));

  const exports = extractExports(sourceFile).map((s) => s.name);

  const reExports = sourceFile.getExportDeclarations()
    .filter((e) => e.getModuleSpecifierValue() !== undefined)
    .map((e) => e.getModuleSpecifierValue() as string);

  return { imports, exports, reExports };
}
