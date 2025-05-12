import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StreamableHTTPServerTransport } from "@modelcontextprotocol/sdk/server/streamableHttp.js";
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
} from "@modelcontextprotocol/sdk/types.js";
import express from "express";
import { randomUUID } from "crypto";
import http from "http";

// Create Express app
const app = express();
app.use(express.json());

// Create MCP Server
const server = new Server(
  {
    name: "mcp-streamable-http-server",
    version: "0.1.0",
  },
  {
    capabilities: {
      tools: {}, // Enable tools capability
    },
  }
);

// Tool handler implementations
server.setRequestHandler(ListToolsRequestSchema, async () => {
  return {
    tools: [
      {
        name: "example_tool",
        description: "An example tool",
        inputSchema: {
          type: "object",
          properties: {
            input: { type: "string", description: "Example input" },
          },
          required: ["input"],
        },
      },
    ],
  };
});

server.setRequestHandler(CallToolRequestSchema, async (request) => {
  const { name, arguments: args } = request.params;

  if (!args) {
    throw new Error(`No arguments provided for tool: ${name}`);
  }

  switch (name) {
    case "example_tool":
      return {
        content: [
          {
            type: "text",
            text: `Example tool called with input: ${args.input}`,
          },
        ],
      };
    default:
      throw new Error(`Unknown tool: ${name}`);
  }
});

// Prepare Streamable HTTP Transport
const transport = new StreamableHTTPServerTransport({
  sessionIdGenerator: () => randomUUID(),
  enableJsonResponse: false, // Set to true if you want JSON responses instead of SSE streams
});

// Connect server to transport
async function setupServer() {
  await server.connect(transport);
  console.log("MCP Server connected to transport");
}

// Express route for MCP requests
app.all("/mcp", async (req, res) => {
  try {
    await transport.handleRequest(req, res);
  } catch (error) {
    console.error("Error handling MCP request:", error);
    res.status(500).json({
      jsonrpc: "2.0",
      error: {
        code: -32000,
        message: "Internal server error",
      },
      id: null,
    });
  }
});

// Start HTTP server
const PORT = 3000;
const httpServer = http.createServer(app);

httpServer.listen(PORT, () => {
  console.log(`MCP Streamable HTTP Server listening on port ${PORT}`);
  setupServer().catch((error) => {
    console.error("Failed to setup MCP Server:", error);
    process.exit(1);
  });
});

// Handle shutdown gracefully
process.on("SIGINT", async () => {
  console.log("Shutting down MCP Server...");
  await transport.close();
  httpServer.close();
  process.exit(0);
});
