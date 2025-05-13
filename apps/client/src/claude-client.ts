import { Anthropic } from "@anthropic-ai/sdk";
import {
  MessageParam,
  Tool,
} from "@anthropic-ai/sdk/resources/messages/messages.mjs";
import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { StreamableHTTPClientTransport } from "@modelcontextprotocol/sdk/client/streamableHttp.js";
import readline from "readline/promises";
import dotenv from "dotenv";
import { JwtAuthProvider } from "./auth-provider.js";
import {
  ListToolsRequest,
  ListToolsResultSchema,
  CallToolRequest,
  CallToolResultSchema,
} from "@modelcontextprotocol/sdk/types.js";

dotenv.config(); // Load environment variables from .env file

const ANTHROPIC_API_KEY = process.env.ANTHROPIC_API_KEY;
if (!ANTHROPIC_API_KEY) {
  console.error(
    "Error: ANTHROPIC_API_KEY is not set in the environment. Please create a .env file with your API key."
  );
  process.exit(1);
}

export class ClaudeMcpClient {
  private mcp: Client;
  private anthropic: Anthropic;
  private transport: StreamableHTTPClientTransport | null = null;
  private tools: Tool[] = [];
  private authProvider: JwtAuthProvider;
  private serverUrl: string;
  private sessionId?: string;

  constructor(serverUrl = "http://localhost:3000/mcp") {
    // Initialize Anthropic client and MCP client
    this.anthropic = new Anthropic({
      apiKey: ANTHROPIC_API_KEY,
    });
    this.mcp = new Client({
      name: "claude-mcp-client",
      version: "1.0.0",
    });
    this.mcp.onerror = (error) => {
      console.error("\x1b[31mClient error:", error, "\x1b[0m");
    };
    this.authProvider = new JwtAuthProvider();
    this.serverUrl = serverUrl;
  }

  /**
   * Set the JWT token for authentication
   */
  setAuthToken(token: string): void {
    this.authProvider.setToken(token);
    console.log(`Authorization token set: ${token.substring(0, 10)}...`);
  }

  /**
   * Connect to the MCP server
   */
  async connectToServer(): Promise<boolean> {
    try {
      // Check if auth token is available
      if (!this.authProvider.getToken()) {
        console.log(
          "Warning: No authentication token set. Connection may fail."
        );
        return false;
      }

      console.log(`Connecting to ${this.serverUrl}...`);

      // Create transport with our custom authentication headers
      const requestInit: RequestInit = {};
      const authHeaders = this.authProvider.createAuthHeaders();
      if (authHeaders) {
        requestInit.headers = authHeaders;
      }

      this.transport = new StreamableHTTPClientTransport(
        new URL(this.serverUrl),
        {
          sessionId: this.sessionId,
          requestInit: requestInit,
        }
      );

      // Connect the client
      await this.mcp.connect(this.transport);
      this.sessionId = this.transport.sessionId;
      console.log("Connected to MCP server with session ID:", this.sessionId);

      // Fetch available tools
      await this.fetchAvailableTools();

      return true;
    } catch (error: any) {
      // Check for auth-related errors
      if (error.message && error.message.includes("401")) {
        console.error("Authentication failed: Invalid or missing token");
      } else {
        console.error("Failed to connect:", error);
      }
      return false;
    }
  }

  /**
   * Fetch available tools from the MCP server
   */
  private async fetchAvailableTools(): Promise<void> {
    try {
      console.log("Fetching available tools...");
      const toolsRequest: ListToolsRequest = {
        method: "tools/list",
        params: {},
      };

      const toolsResult = await this.mcp.request(
        toolsRequest,
        ListToolsResultSchema
      );

      // Convert to Claude tool format
      this.tools = toolsResult.tools.map((tool) => {
        return {
          name: tool.name,
          description: tool.description || "",
          input_schema: tool.inputSchema,
        };
      });

      console.log(
        "Available tools:",
        this.tools.map(({ name }) => name).join(", ")
      );
    } catch (error) {
      console.error("Failed to fetch tools:", error);
      this.tools = [];
    }
  }

  /**
   * Process a query using Claude and available tools
   */
  async processQuery(query: string): Promise<string> {
    if (!this.transport || this.tools.length === 0) {
      return "Not connected to server or no tools available. Please connect first.";
    }

    const messages: MessageParam[] = [
      {
        role: "user",
        content: query,
      },
    ];

    try {
      console.log("Sending query to Claude...");

      // Initial Claude API call
      const response = await this.anthropic.messages.create({
        model: "claude-3-5-sonnet-20241022",
        max_tokens: 1000,
        messages,
        tools: this.tools,
      });

      // Process response and handle tool calls
      const finalText: string[] = [];

      for (const content of response.content) {
        if (content.type === "text") {
          finalText.push(content.text);
        } else if (content.type === "tool_use") {
          // Execute tool call
          const toolName = content.name;
          const toolArgs = content.input as Record<string, unknown>;

          console.log(`Claude is calling tool: ${toolName}`);
          finalText.push(`\n[Using tool: ${toolName}]\n`);

          // Call the MCP tool
          try {
            const toolRequest: CallToolRequest = {
              method: "tools/call",
              params: {
                name: toolName,
                arguments: toolArgs,
              },
            };

            const result = await this.mcp.request(
              toolRequest,
              CallToolResultSchema
            );

            // Format tool result for display
            const toolOutput = result.content
              .map((item) => {
                if (item.type === "text") {
                  return item.text;
                }
                return `[${item.type} content]`;
              })
              .join("\n");

            finalText.push(toolOutput);

            // Continue conversation with tool results
            messages.push({
              role: "assistant",
              content: [
                {
                  type: "tool_use",
                  name: toolName,
                  input: toolArgs,
                  id: content.id, // Add the id that was missing
                },
              ],
            });

            messages.push({
              role: "user",
              content: [
                {
                  type: "tool_result",
                  tool_use_id: content.id,
                  content: toolOutput,
                },
              ],
            });

            // Get next response from Claude
            console.log("Getting Claude's response to tool output...");
            const followUpResponse = await this.anthropic.messages.create({
              model: "claude-3-5-sonnet-20241022",
              max_tokens: 1000,
              messages,
            });

            // Add Claude's interpretation of the tool result
            for (const followUpContent of followUpResponse.content) {
              if (followUpContent.type === "text") {
                finalText.push("\n" + followUpContent.text);
              }
            }
          } catch (error) {
            finalText.push(`Error calling tool ${toolName}: ${error}`);
          }
        }
      }

      return finalText.join("\n");
    } catch (error) {
      console.error("Error processing query with Claude:", error);
      return `Failed to process your query: ${error}`;
    }
  }

  /**
   * Start an interactive chat loop
   */
  async chatLoop(): Promise<void> {
    const rl = readline.createInterface({
      input: process.stdin,
      output: process.stdout,
    });

    try {
      console.log("\nClaude MCP Client Started!");
      console.log(
        "Type your queries, 'connect' to connect/reconnect, 'auth <token>' to set token, or 'quit' to exit."
      );

      while (true) {
        const message = await rl.question("\nQuery: ");

        if (message.toLowerCase() === "quit") {
          break;
        } else if (message.toLowerCase() === "connect") {
          const success = await this.connectToServer();
          if (success) {
            console.log("Successfully connected to MCP server.");
          } else {
            console.log(
              "Failed to connect. Check your auth token and server status."
            );
          }
        } else if (message.toLowerCase().startsWith("auth ")) {
          const token = message.substring(5);
          this.setAuthToken(token);
        } else {
          const response = await this.processQuery(message);
          console.log("\nClaude's response:");
          console.log(response);
        }
      }
    } finally {
      rl.close();
    }
  }

  /**
   * Clean up resources
   */
  async cleanup(): Promise<void> {
    if (this.transport) {
      try {
        await this.transport.close();
        console.log("Connection closed");
      } catch (error) {
        console.error("Error closing connection:", error);
      }
    }
  }
}

/**
 * Main function to start the Claude MCP client
 */
export async function startClaudeClient(args: string[] = []): Promise<void> {
  const claudeClient = new ClaudeMcpClient();

  try {
    // Check if JWT token was provided as command-line argument
    if (args.length > 0) {
      const token = args[0];
      if (token) {
        // Add null check
        console.log("JWT token provided as command-line argument");
        claudeClient.setAuthToken(token);
        await claudeClient.connectToServer();
      }
    }

    await claudeClient.chatLoop();
  } finally {
    await claudeClient.cleanup();
  }
}

// If this file is run directly
if (require.main === module) {
  startClaudeClient(process.argv.slice(2)).catch((error) => {
    console.error("Error running Claude MCP client:", error);
    process.exit(1);
  });
}
