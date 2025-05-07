// server.ts
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { z } from "zod";
import { registerTools } from "./tools.js";

// Use a mutable object to allow tools to access the current token
const authTokenRef = { current: null as string | null };

const server = new McpServer({
  name: "restaurant",
  version: "1.0.0",
});

// Tool: Authenticate using JWT token
server.tool(
  "authenticate",
  "Authenticate with a JWT token",
  {
    token: z.string().describe("JWT token for authentication"),
  },
  async ({ token }) => {
    authTokenRef.current = token;
    console.log("Authenticated with token:", token);

    return {
      content: [
        {
          type: "text",
          text: "Authentication successful",
        },
      ],
    };
  }
);

// Register all other tools from tools.ts
registerTools(server, authTokenRef);

// Start the server
async function main() {
  console.log("Starting MCP server...");
  const transport = new StdioServerTransport();
  await server.connect(transport);
  console.log("MCP Server is now running.");
}

main();
