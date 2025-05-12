#!/usr/bin/env node

import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { StreamableHTTPClientTransport } from "@modelcontextprotocol/sdk/client/streamableHttp.js";

async function main() {
  try {
    // Create client
    const client = new Client(
      {
        name: "mcp-client",
        version: "0.1.0",
      },
      {
        capabilities: {
          // Define client capabilities as needed
          tools: {},
        },
      }
    );

    // Connection parameters - change URL to match your server
    // You can change the port or use a different hostname if needed
    const serverUrl = new URL("http://127.0.0.1:3000/mcp");

    // Create transport
    const transport = new StreamableHTTPClientTransport(serverUrl);

    // Connect to the server
    console.log("Connecting to MCP server...");
    await client.connect(transport);

    // After connection, log server capabilities and version
    const serverVersion = client.getServerVersion();
    console.log(
      `Connected to server: ${serverVersion?.name} ${serverVersion?.version}`
    );

    console.log("Server capabilities:", client.getServerCapabilities());

    // List available tools
    console.log("Listing available tools...");
    const toolsResult = await client.listTools();
    console.log("Available tools:", toolsResult.tools);

    // Call the example tool
    if (toolsResult.tools.some((tool) => tool.name === "example_tool")) {
      console.log("Calling example_tool...");
      const result = await client.callTool({
        name: "example_tool",
        arguments: {
          input: "Hello from MCP client!",
        },
      });

      console.log("Tool result:", result);
    }

    // Close the connection
    await client.close();
    console.log("Connection closed");
  } catch (error) {
    console.error("Error:", error);
    process.exit(1);
  }
}

// Handle graceful shutdown
process.on("SIGINT", async () => {
  console.log("Shutting down...");
  process.exit(0);
});

// Add a debug statement to help troubleshoot the connection
console.log("Starting MCP client...");

// Execute main function
main();
