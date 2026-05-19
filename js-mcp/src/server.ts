import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { getWorkspaceRoot } from "./config.js";
import { registerWorkspaceTools } from "./tools/workspace.tool.js";
import { registerJsFileTools } from "./tools/jsfile.tool.js";
import { registerFrameworkTools } from "./tools/framework.tool.js";

let _server: McpServer | null = null;

export function getServer(): McpServer {
  if (!_server) {
    _server = new McpServer({
      name: "js-mcp",
      version: "1.0.0",
    });
  }
  return _server;
}

export async function start(): Promise<void> {
  const root = getWorkspaceRoot();
  const server = getServer();

  // Tools are registered by each tool module (chunks 08-10).
  registerWorkspaceTools(server);
  registerJsFileTools(server);
  registerFrameworkTools(server);

  const transport = new StdioServerTransport();
  await server.connect(transport);

  console.error(`js-mcp ready. Workspace: ${root}`);
}
