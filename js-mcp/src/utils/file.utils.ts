import fs from "node:fs";
import path from "node:path";
import fg from "fast-glob";

/**
 * Glob for files under root matching pattern.
 * Returns absolute paths.
 */
export function findFiles(root: string, pattern: string): string[] {
  return fg.sync(pattern, {
    cwd: root,
    absolute: true,
    ignore: ["**/node_modules/**", "**/dist/**", "**/.git/**"],
  });
}

/**
 * Read a file as UTF-8 text.
 * Throws a clear message if file is missing.
 */
export function readFile(filePath: string): string {
  if (!fs.existsSync(filePath)) {
    throw new Error(`File not found: ${filePath}`);
  }
  return fs.readFileSync(filePath, "utf-8");
}

/**
 * Security guard — ensures filePath is inside workspaceRoot.
 * Call this before every file read.
 */
export function isWithinWorkspace(
  filePath: string,
  workspaceRoot: string
): boolean {
  const resolved = path.resolve(filePath);
  const resolvedRoot = path.resolve(workspaceRoot);
  return resolved.startsWith(resolvedRoot + path.sep) || resolved === resolvedRoot;
}

/**
 * Convert an absolute path to a workspace-relative path.
 * Returned paths always use forward slashes.
 */
export function toRelative(filePath: string, workspaceRoot: string): string {
  return path.relative(workspaceRoot, filePath).replace(/\\/g, "/");
}

/**
 * Convert a workspace-relative path to absolute.
 */
export function toAbsolute(relativePath: string, workspaceRoot: string): string {
  return path.resolve(workspaceRoot, relativePath);
}
