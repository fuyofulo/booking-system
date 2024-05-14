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
  private userProfile: any = null; // Store user profile data
  private conversationHistory: MessageParam[] = []; // Store conversation history

  constructor(serverUrl = "http://localhost:3030/mcp") {
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

      // Reset conversation history when reconnecting
      this.conversationHistory = [];

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

      // Fetch user profile if the tool is available
      await this.fetchUserProfile();

      // Initialize conversation with system context
      this.initializeConversation();

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
   * Initialize the conversation with user profile context
   */
  private initializeConversation(): void {
    // Create system message with user context
    let systemContext =
      "You are a helpful assistant for a restaurant management system. ";

    if (this.userProfile) {
      systemContext += "\nUser profile information:\n" + this.userProfile.text;

      // Add specific context about restaurants for table creation
      if (
        this.userProfile.restaurants &&
        this.userProfile.restaurants.length > 0
      ) {
        systemContext += "\n\nAvailable restaurants for this user:";
        this.userProfile.restaurants.forEach(
          (restaurant: { id: string; name: string }) => {
            systemContext += `\n- ${restaurant.name} (ID: ${restaurant.id})`;
          }
        );

        // Add guidance for table creation
        systemContext +=
          "\n\nWhen creating tables with the create-table tool, use one of these restaurant IDs.";
      }
    }

    systemContext +=
      "\n\nMaintain conversation context between messages. Reference previous messages when appropriate.";

    // Add system context as a special user message that Claude will consider as context
    this.conversationHistory = [
      {
        role: "user",
        content: systemContext,
      },
    ];

    // Add Claude's acknowledgment
    this.conversationHistory.push({
      role: "assistant",
      content: "I understand. I'll help you manage your restaurants.",
    });

    console.log("Conversation initialized with user context");
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
   * Fetch user profile data using the get-user-profile tool
   */
  private async fetchUserProfile(): Promise<void> {
    // Check if get-user-profile tool is available
    if (this.tools.some((tool) => tool.name === "get-user-profile")) {
      try {
        console.log("Fetching user profile information...");
        const toolRequest: CallToolRequest = {
          method: "tools/call",
          params: {
            name: "get-user-profile",
            arguments: {},
          },
        };

        const result = await this.mcp.request(
          toolRequest,
          CallToolResultSchema
        );

        // Extract user data from result
        const profileText = result.content
          .filter((item) => item.type === "text")
          .map((item) => (item as any).text)
          .join("\n");

        // Store the profile information
        this.userProfile = {
          text: profileText,
          // Extract restaurant IDs from profile text (simple regex pattern)
          restaurants: this.extractRestaurantInfo(profileText),
        };

        console.log("User profile loaded successfully.");
      } catch (error) {
        console.error("Error fetching user profile:", error);
      }
    }
  }

  /**
   * Extract restaurant information from profile text
   */
  private extractRestaurantInfo(
    profileText: string
  ): Array<{ id: string; name: string }> {
    try {
      const restaurants: Array<{ id: string; name: string }> = [];
      const lines = profileText.split("\n");
      let currentRestaurant: { id?: string; name?: string } = {};

      for (const line of lines) {
        if (line.startsWith("Restaurant:")) {
          // Start of a new restaurant
          if (currentRestaurant.id && currentRestaurant.name) {
            restaurants.push({
              id: currentRestaurant.id,
              name: currentRestaurant.name,
            });
          }
          currentRestaurant = {
            name: line.replace("Restaurant:", "").trim(),
          };
        } else if (line.startsWith("ID:")) {
          currentRestaurant.id = line.replace("ID:", "").trim();
        }
      }

      // Don't forget the last one
      if (currentRestaurant.id && currentRestaurant.name) {
        restaurants.push({
          id: currentRestaurant.id,
          name: currentRestaurant.name,
        });
      }

      return restaurants;
    } catch (error) {
      console.error("Error parsing restaurant information:", error);
      return [];
    }
  }

  /**
   * Process a query using Claude and available tools
   */
  async processQuery(query: string): Promise<string> {
    if (!this.transport || this.tools.length === 0) {
      return "Not connected to server or no tools available. Please connect first.";
    }

    // Add the user's new message to conversation history
    this.conversationHistory.push({
      role: "user",
      content: query,
    });

    try {
      console.log("Sending query to Claude...");

      // Initial Claude API call with full conversation history
      const response = await this.anthropic.messages.create({
        model: "claude-3-5-sonnet-20241022",
        max_tokens: 1000,
        messages: this.conversationHistory,
        tools: this.tools,
      });

      // Process response and handle tool calls
      const finalText: string[] = [];
      let usedTool = false;

      for (const content of response.content) {
        if (content.type === "text" && !usedTool) {
          // Only include Claude's text response if no tool has been used
          finalText.push(content.text);

          // Add Claude's response to the conversation history
          this.conversationHistory.push({
            role: "assistant",
            content: content.text,
          });
        } else if (content.type === "tool_use") {
          // Execute tool call
          const toolName = content.name;
          const toolArgs = content.input as Record<string, unknown>;

          // Set flag to indicate a tool was used
          usedTool = true;

          // Clear any previous text since we only want to show tool output
          finalText.length = 0;

          console.log(`Claude is calling tool: ${toolName}`);
          // Don't include the tool name in the output
          // finalText.push(`\n[Using tool: ${toolName}]\n`);

          // Add the tool call to conversation history
          this.conversationHistory.push({
            role: "assistant",
            content: [
              {
                type: "tool_use",
                name: toolName,
                input: toolArgs,
                id: content.id,
              },
            ],
          });

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

            // This is the only output we want to show
            finalText.push(toolOutput);

            // Add the tool result to conversation history
            this.conversationHistory.push({
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
              messages: this.conversationHistory,
              tools: this.tools,
            });

            // Store Claude's interpretation in conversation history and add to output for more conversation
            for (const followUpContent of followUpResponse.content) {
              if (followUpContent.type === "text") {
                // Include Claude's follow-up text to make the experience more conversational
                if (followUpContent.text.trim()) {
                  finalText.push("\n" + followUpContent.text);
                }

                // Add Claude's final response to conversation history
                this.conversationHistory.push({
                  role: "assistant",
                  content: followUpContent.text,
                });
              }
            }
          } catch (error) {
            finalText.push(`Error calling tool ${toolName}: ${error}`);
          }
        }
      }

      // Limit history to last 20 messages to avoid token limits
      if (this.conversationHistory.length > 20) {
        // Always keep the first system context message
        const systemContext = this.conversationHistory[0];
        this.conversationHistory = [
          systemContext!,
          ...this.conversationHistory.slice(-19),
        ];
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
        } else if (message.toLowerCase() === "clear") {
          // Add a command to clear conversation history
          this.initializeConversation();
          console.log("Conversation history cleared and reinitialized.");
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
export async function startClaudeClient(
  args: string[] = [],
  serverUrl?: string
): Promise<void> {
  const client = new ClaudeMcpClient(serverUrl);

  // Check if a token was provided as an argument
  if (args.length > 0) {
    client.setAuthToken(args[0]!);
  }

  // Connect to the server
  await client.connectToServer();

  // Start interactive chat loop
  await client.chatLoop();

  // Clean up on exit
  await client.cleanup();
}

// If this file is run directly
// Replace CommonJS-style check with ES module compatible check
// Using import.meta.url to check if it's the main module
/* Commenting out to prevent duplicate initialization since claude-main.ts already calls startClaudeClient
const isMainModule = import.meta.url.endsWith('claude-client.js') || 
                     import.meta.url.endsWith('claude-client.ts');

if (isMainModule) {
  startClaudeClient(process.argv.slice(2)).catch((error) => {
    console.error("Error running Claude MCP client:", error);
    process.exit(1);
  });
}
*/
