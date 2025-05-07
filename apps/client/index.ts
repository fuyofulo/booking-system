// client.ts
import { Anthropic } from "@anthropic-ai/sdk";
import {
  MessageParam,
  Tool,
} from "@anthropic-ai/sdk/resources/messages/messages.mjs";

import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { StdioClientTransport } from "@modelcontextprotocol/sdk/client/stdio.js";
import readline from "readline/promises";
import dotenv from "dotenv";

dotenv.config();

const ANTHROPIC_API_KEY = process.env.ANTHROPIC_API_KEY;
if (!ANTHROPIC_API_KEY) {
  throw new Error("ANTHROPIC_API_KEY is not set");
}

// Define types based on the database schema
interface RestaurantInfo {
  id: number;
  name: string;
  role?: string;
  roleId?: number;
  isOwner: boolean;
}

interface UserInfo {
  id: string;
  name: string;
  email: string;
  jwtToken: string;
  restaurants: RestaurantInfo[];
}

// Configuration for initializing the client
interface MCPClientConfig {
  user: UserInfo | null;
  serverScriptPath: string;
}

// Application domain context for the LLM
const APPLICATION_CONTEXT = `
This is a restaurant management system with the following features:
- Users can own multiple restaurants
- Users can have different roles in various restaurants 
- Each restaurant has tables, staff members, and roles
- Tables can have time slots and bookings
- Roles include Owner, Manager, Staff, etc. with different permissions

The system allows:
- Managing staff and their roles
- Managing tables and availability
- Handling bookings and reservations
- Viewing restaurant details

When handling restaurant-specific queries, always use the correct restaurant ID.
`;

class MCPClient {
  private mcp: Client;
  private anthropic: Anthropic;
  private transport: StdioClientTransport | null = null;
  private tools: Tool[] = [];

  private userInfo: UserInfo;
  private currentRestaurantId: number | null = null;
  private currentRestaurantName: string = "";
  private restaurantMap: Map<string, RestaurantInfo> = new Map();

  constructor(config: MCPClientConfig) {
    this.anthropic = new Anthropic({
      apiKey: ANTHROPIC_API_KEY,
    });
    this.mcp = new Client({ name: "mcp-client-cli", version: "1.0.0" });

    this.userInfo = config.user || {
      id: "",
      name: "",
      email: "",
      jwtToken: "",
      restaurants: [],
    };

    if (config.user?.restaurants) {
      this.initializeRestaurants();
    }
  }

  private initializeRestaurants(): void {
    if (!this.userInfo.restaurants || this.userInfo.restaurants.length === 0) {
      console.warn("User has no restaurants");
      return;
    }

    for (const restaurant of this.userInfo.restaurants) {
      this.restaurantMap.set(restaurant.name.toLowerCase(), restaurant);
    }

    const firstRestaurant = this.userInfo.restaurants[0];
    this.currentRestaurantId = firstRestaurant.id;
    this.currentRestaurantName = firstRestaurant.name;
  }

  private async manualInitialization(): Promise<void> {
    const rl = readline.createInterface({
      input: process.stdin,
      output: process.stdout,
    });

    const jwtToken = await rl.question("Enter JWT token: ");
    this.userInfo = {
      id: "test-user-id",
      name: "Test User",
      email: "test@example.com",
      jwtToken,
      restaurants: [],
    };

    const addRestaurantPrompt = async () => {
      const restaurantIdStr = await rl.question("Enter restaurant ID: ");
      const restaurantId = parseInt(restaurantIdStr, 10);

      if (!isNaN(restaurantId)) {
        const restaurantName = await rl.question("Enter restaurant name: ");
        const isOwner =
          (await rl.question("Is owner? (y/n): ")).toLowerCase() === "y";
        const role = isOwner ? "Owner" : await rl.question("Enter role: ");

        if (restaurantName) {
          const restaurant: RestaurantInfo = {
            id: restaurantId,
            name: restaurantName,
            role,
            isOwner,
          };

          this.userInfo.restaurants.push(restaurant);
          this.restaurantMap.set(restaurantName.toLowerCase(), restaurant);

          if (this.currentRestaurantId === null) {
            this.currentRestaurantId = restaurantId;
            this.currentRestaurantName = restaurantName;
          }

          const addAnother = await rl.question(
            "Add another restaurant? (y/n): "
          );
          if (addAnother.toLowerCase() === "y") {
            await addRestaurantPrompt();
          }
        }
      }
    };

    await addRestaurantPrompt();
    rl.close();
  }

  private getRestaurantByName(name: string): RestaurantInfo | null {
    return this.restaurantMap.get(name.toLowerCase()) || null;
  }

  private getRestaurantList(): string {
    if (this.restaurantMap.size === 0) {
      return "No restaurants configured.";
    }

    let result = "Available restaurants:\n";
    this.userInfo.restaurants.forEach((restaurant) => {
      const isCurrent =
        restaurant.id === this.currentRestaurantId ? " (current)" : "";
      const roleInfo = restaurant.role ? ` | Role: ${restaurant.role}` : "";
      const ownerInfo = restaurant.isOwner ? " | Owner" : "";
      result += `- ${restaurant.name} (ID: ${restaurant.id})${isCurrent}${roleInfo}${ownerInfo}\n`;
    });
    return result;
  }

  async connectToServer(serverScriptPath: string) {
    try {
      const isJs = serverScriptPath.endsWith(".js");
      const isPy = serverScriptPath.endsWith(".py");
      if (!isJs && !isPy) {
        throw new Error("Server script must be a .js or .py file");
      }
      const command = isPy
        ? process.platform === "win32"
          ? "python"
          : "python3"
        : process.execPath;

      this.transport = new StdioClientTransport({
        command,
        args: [serverScriptPath],
      });
      this.mcp.connect(this.transport);

      const toolsResult = await this.mcp.listTools();
      this.tools = toolsResult.tools.map((tool: any) => {
        return {
          name: tool.name,
          description: tool.description,
          input_schema: tool.inputSchema,
        };
      });

      if (!this.userInfo.jwtToken) {
        await this.manualInitialization();
      }

      const authTool = this.tools.find((t) => t.name === "authenticate");
      if (authTool && this.userInfo.jwtToken) {
        await this.mcp.callTool({
          name: "authenticate",
          arguments: { token: this.userInfo.jwtToken },
        });
        console.log("Authentication successful");
      } else {
        console.log("Warning: Server doesn't require authentication");
      }

      console.log(
        "Connected to server with tools:",
        this.tools.map(({ name }) => name)
      );
    } catch (e) {
      console.log("Failed to connect to MCP server: ", e);
      throw e;
    }
  }

  async processQuery(query: string) {
    // Handle special commands
    if (query.match(/^(switch|use) restaurant\s+["']?([^"']+)["']?/i)) {
      const name = query.match(
        /^(?:switch|use) restaurant\s+["']?([^"']+)["']?/i
      )?.[1];
      if (name) {
        const restaurant = this.getRestaurantByName(name);
        if (restaurant) {
          this.currentRestaurantId = restaurant.id;
          this.currentRestaurantName = restaurant.name;
          return `Switched to restaurant: ${restaurant.name} (ID: ${restaurant.id})`;
        } else {
          return `Restaurant "${name}" not found. ${this.getRestaurantList()}`;
        }
      }
    }

    if (
      query.match(/^list (?:all )?restaurants/i) ||
      query.match(/^show (?:all )?restaurants/i)
    ) {
      return this.getRestaurantList();
    }

    // Prepare system context
    const systemContext = `${APPLICATION_CONTEXT}
You are helping ${this.userInfo.name} manage their restaurant(s).
Current restaurant: ${this.currentRestaurantName} (ID: ${this.currentRestaurantId})

${this.getRestaurantList()}`;

    // Set up the messages - start with system context
    const messages: MessageParam[] = [
      {
        role: "user",
        content: systemContext,
      },
      {
        role: "assistant",
        content: `I'll help you with ${this.currentRestaurantName}.`,
      },
      {
        role: "user",
        content: query,
      },
    ];

    try {
      // Call Claude
      const response = await this.anthropic.messages.create({
        model: "claude-3-5-sonnet-20241022",
        max_tokens: 1000,
        messages,
        tools: this.tools,
      });

      // Process the response
      const finalText = [];

      for (const content of response.content) {
        if (content.type === "text") {
          finalText.push(content.text);
        } else if (content.type === "tool_use") {
          // Handle tool calls
          const toolName = content.name;
          const toolArgs = content.input as { [key: string]: unknown };

          // Add restaurant ID if needed and not provided
          if (
            toolName === "get-restaurant-users" &&
            !toolArgs.restaurantID &&
            this.currentRestaurantId
          ) {
            toolArgs.restaurantID = this.currentRestaurantId;
          }

          console.log(`Calling tool: ${toolName}`, toolArgs);
          const result = await this.mcp.callTool({
            name: toolName,
            arguments: toolArgs,
          });

          finalText.push(`[Tool result: ${toolName}]`);

          // Add tool result to conversation
          messages.push({
            role: "user",
            content: result.content as string,
          });

          // Get follow-up response
          const followup = await this.anthropic.messages.create({
            model: "claude-3-5-sonnet-20241022",
            max_tokens: 1000,
            messages,
          });

          if (followup.content[0]?.type === "text") {
            finalText.push(followup.content[0].text);
          }
        }
      }

      return finalText.join("\n");
    } catch (error: unknown) {
      const errorMessage =
        error instanceof Error ? error.message : String(error);
      console.error("Error processing query:", errorMessage);
      return `Error: ${errorMessage || "Unknown error occurred"}`;
    }
  }

  async chatLoop() {
    const rl = readline.createInterface({
      input: process.stdin,
      output: process.stdout,
    });

    try {
      console.log(`\nMCP Client Started for ${this.userInfo.name}!`);
      console.log("Type your queries or 'quit' to exit.");
      console.log(this.getRestaurantList());

      if (this.currentRestaurantId) {
        const currentRestaurant = this.userInfo.restaurants.find(
          (r) => r.id === this.currentRestaurantId
        );
        const roleInfo = currentRestaurant?.role
          ? ` | Role: ${currentRestaurant.role}`
          : "";
        const ownerInfo = currentRestaurant?.isOwner ? " | Owner" : "";
        console.log(
          `Currently active: ${this.currentRestaurantName} (ID: ${this.currentRestaurantId})${roleInfo}${ownerInfo}`
        );
      }

      while (true) {
        const message = await rl.question("\nQuery: ");
        if (message.toLowerCase() === "quit") break;

        console.log("Processing request...");
        try {
          const response = await this.processQuery(message);
          console.log("\n" + response);
        } catch (error: unknown) {
          const errorMessage =
            error instanceof Error ? error.message : String(error);
          console.error("Error:", errorMessage || "An unknown error occurred");
        }
      }
    } finally {
      rl.close();
    }
  }

  async cleanup() {
    await this.mcp.close();
  }
}

async function main() {
  const serverScriptPath = "../server/build/index.js";

  const mcpClient = new MCPClient({
    serverScriptPath,
    user: null,
  });

  try {
    await mcpClient.connectToServer(serverScriptPath);
    await mcpClient.chatLoop();
  } finally {
    await mcpClient.cleanup();
    process.exit(0);
  }
}

main();
