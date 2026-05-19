import { SourceFile, SyntaxKind, Node } from "ts-morph";
import { extractExports, ExportedSymbol } from "./core.parser.js";

export type ReactComponent = {
  name: string;
  propsType: string;      // name of props interface/type, or "none"
  hooksUsed: string[];    // ["useState", "useEffect", ...]
  signature: string;
  line: number;
};

/**
 * A symbol is a React component if:
 * 1. Name starts with an uppercase letter, AND
 * 2. Its body contains a JSX return (checked via raw text heuristic)
 *    OR it is typed as React.FC / JSX.Element
 */
export function isComponent(
  symbol: ExportedSymbol,
  sourceFile: SourceFile
): boolean {
  if (!/^[A-Z]/.test(symbol.name)) return false;

  const fnNode =
    sourceFile.getFunction(symbol.name) ??
    findArrowConst(sourceFile, symbol.name);

  if (!fnNode) return false;

  const fnText = fnNode.getText();
  return (
    fnText.includes("return (") && (fnText.includes("<") && fnText.includes("/>") || fnText.includes("</"))
    || fnText.includes(": JSX.Element")
    || fnText.includes(": React.FC")
    || fnText.includes(": React.ReactElement")
  );
}

/**
 * Collect all hook calls (use*) inside a named function/component.
 */
export function getHooksUsed(
  sourceFile: SourceFile,
  name: string
): string[] {
  const fnNode =
    sourceFile.getFunction(name) ??
    findArrowConst(sourceFile, name);

  if (!fnNode) return [];

  const hooks = new Set<string>();
  fnNode.forEachDescendant((node) => {
    if (node.getKind() === SyntaxKind.CallExpression) {
      const expr = node.getFirstChild();
      const callName = expr?.getText() ?? "";
      if (/^use[A-Z]/.test(callName)) {
        hooks.add(callName);
      }
    }
  });

  return [...hooks];
}

/**
 * Detect the props type name for a component.
 * Looks for: function Foo(props: FooProps), React.FC<FooProps>, etc.
 */
export function getPropsType(
  sourceFile: SourceFile,
  name: string
): string {
  const fn = sourceFile.getFunction(name);
  if (fn) {
    const params = fn.getParameters();
    if (params.length > 0) {
      const typeNode = params[0].getTypeNode();
      if (typeNode) return typeNode.getText();
    }
    return "none";
  }

  // Arrow const: const Foo: React.FC<FooProps> = ...
  for (const varStmt of sourceFile.getVariableStatements()) {
    for (const decl of varStmt.getDeclarations()) {
      if (decl.getName() !== name) continue;
      const typeNode = decl.getTypeNode();
      if (typeNode) {
        const t = typeNode.getText();
        // Extract generic arg from React.FC<Arg>
        const match = t.match(/(?:React\.FC|React\.FunctionComponent)<([^>]+)>/);
        if (match) return match[1];
        return t;
      }
    }
  }

  return "none";
}

/**
 * Return all React components in a source file.
 */
export function getComponents(sourceFile: SourceFile): ReactComponent[] {
  const symbols = extractExports(sourceFile);

  return symbols
    .filter((s) => isComponent(s, sourceFile))
    .map((s) => ({
      name: s.name,
      propsType: getPropsType(sourceFile, s.name),
      hooksUsed: getHooksUsed(sourceFile, s.name),
      signature: s.signature,
      line: s.line,
    }));
}

/**
 * Return all exported hooks (use* functions) in a source file.
 */
export function getHooks(sourceFile: SourceFile): ExportedSymbol[] {
  return extractExports(sourceFile).filter(
    (s) => s.kind === "function" && /^use[A-Z]/.test(s.name)
  );
}

// --- internal helper ---

function findArrowConst(sourceFile: SourceFile, name: string): Node | undefined {
  for (const varStmt of sourceFile.getVariableStatements()) {
    for (const decl of varStmt.getDeclarations()) {
      if (decl.getName() === name) return decl.getInitializer();
    }
  }
  return undefined;
}
