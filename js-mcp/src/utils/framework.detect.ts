import path from "node:path";
import fs from "node:fs";
import { findFiles } from "./file.utils.js";

export type FrameworkType =
  | "angular"
  | "react"
  | "typescript"
  | "vanilla-js"
  | "mixed";

export type DetectionResult = {
  framework: FrameworkType;
  version: string | null;
};

/**
 * Detect the primary framework used in a directory.
 * Reads package.json deps first, falls back to file extension sniffing.
 */
export function detectFramework(dir: string): DetectionResult {
  const pkgPath = path.join(dir, "package.json");

  if (fs.existsSync(pkgPath)) {
    const pkg = JSON.parse(fs.readFileSync(pkgPath, "utf-8"));
    const deps = {
      ...pkg.dependencies,
      ...pkg.devDependencies,
    } as Record<string, string>;

    if (deps["@angular/core"]) {
      return { framework: "angular", version: deps["@angular/core"] ?? null };
    }

    if (deps["react"]) {
      return { framework: "react", version: deps["react"] ?? null };
    }

    // Has typescript but no framework
    if (deps["typescript"]) {
      return { framework: "typescript", version: deps["typescript"] ?? null };
    }
  }

  // No package.json or no known deps — sniff file extensions
  const tsxFiles = findFiles(dir, "**/*.tsx");
  const jsxFiles = findFiles(dir, "**/*.jsx");
  const tsFiles  = findFiles(dir, "**/*.ts");

  if (tsxFiles.length > 0 || jsxFiles.length > 0) {
    return { framework: "react", version: null };
  }

  if (tsFiles.length > 0) {
    return { framework: "typescript", version: null };
  }

  return { framework: "vanilla-js", version: null };
}
