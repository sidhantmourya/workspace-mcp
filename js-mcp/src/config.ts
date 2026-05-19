export function getWorkspaceRoot(): string {
  const root = process.env.APP_WORKSPACE_ROOT;
  if (!root) {
    throw new Error(
      "APP_WORKSPACE_ROOT env var is not set. " +
      "Set it to the absolute path of the codebase you want to analyze."
    );
  }
  return root;
}
