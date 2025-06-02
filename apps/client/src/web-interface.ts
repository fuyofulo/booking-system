import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { StreamableHTTPClientTransport } from "@modelcontextprotocol/sdk/client/streamableHttp.js";
import {
  ListToolsRequest,
  ListToolsResultSchema,
  CallToolRequest,
  CallToolResultSchema,
  ListPromptsRequest,
  ListPromptsResultSchema,
  ListResourcesRequest,
  ListResourcesResultSchema,
  LoggingMessageNotificationSchema,
  ResourceListChangedNotificationSchema,
} from "@modelcontextprotocol/sdk/types.js";
import { JwtAuthProvider } from "./auth-provider.js";
import { HttpFetcher } from "./http-fetcher.js";
import express from "express";
import cors from "cors";
import path from "path";
import { fileURLToPath } from "url";
import { Anthropic } from "@anthropic-ai/sdk";
import { MessageParam } from "@anthropic-ai/sdk/resources/messages/messages.mjs";
import dotenv from "dotenv";

// Load environment variables
dotenv.config();

// Get directory name for ES modules (using fileURLToPath which is for ES modules)
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Check for Anthropic API key
const ANTHROPIC_API_KEY = process.env.ANTHROPIC_API_KEY;
if (!ANTHROPIC_API_KEY) {
  console.error(
    "Warning: ANTHROPIC_API_KEY is not set in the environment. Claude integration will not work."
  );
}

// Default server URL
const DEFAULT_SERVER_URL = "http://localhost:3030/mcp";

// Initialize Anthropic client
const anthropic = ANTHROPIC_API_KEY
  ? new Anthropic({ apiKey: ANTHROPIC_API_KEY })
  : null;

// Define interfaces for server resources
interface McpTool {
  name: string;
  description: string;
  inputSchema?: any;
}

interface Prompt {
  name: string;
  description: string;
}

interface Resource {
  name: string;
  uri: string;
}

// Extended MessageParam type that allows for tool call properties
type ExtendedMessageParam = MessageParam & {
  tool_use_id?: string;
  tool_result_id?: string;
};

// Define the user session class to encapsulate a client connection
class UserSession {
  client: Client | null = null;
  transport: StreamableHTTPClientTransport | null = null;
  sessionId?: string;
  serverUrl: string;
  availableTools: McpTool[] = [];
  availablePrompts: Prompt[] = [];
  availableResources: Resource[] = [];
  messageHistory: ExtendedMessageParam[] = [];
  userProfile: any = null;
  notificationCount: number = 0;
  authProvider: JwtAuthProvider;
  httpFetcher: HttpFetcher;
  token: string;
  restaurantId?: string | null;
  restaurantName?: string | null;

  constructor(
    token: string,
    serverUrl: string = DEFAULT_SERVER_URL,
    restaurantId?: string | null | number,
    restaurantName?: string | null
  ) {
    this.token = token;
    this.serverUrl = serverUrl;
    this.authProvider = new JwtAuthProvider();
    this.authProvider.setToken(token);
    this.httpFetcher = new HttpFetcher(this.authProvider);

    // Ensure restaurant ID is stored as string for consistent comparison
    this.restaurantId = restaurantId ? String(restaurantId) : null;
    this.restaurantName = restaurantName || null;

    console.log(
      `UserSession created with restaurantId: ${this.restaurantId}, restaurantName: ${this.restaurantName}`
    );
  }

  // Connect to the MCP server
  async connectToServer(): Promise<void> {
    if (this.client) {
      this.log("Already connected to server");
      return;
    }

    this.log(`Connecting to ${this.serverUrl}...`);

    // Log restaurantId status
    if (this.restaurantId) {
      this.log(`Using restaurant ID: ${this.restaurantId} for this session`);
    } else {
      this.log("No restaurant ID set for this session");
    }

    // Validate token is available
    if (!this.token || !this.authProvider.getToken()) {
      throw new Error("Authentication token is missing");
    }

    try {
      // Create a new client
      this.client = new Client({
        name: "claude-web-client",
        version: "1.0.0",
      });

      this.client.onerror = (error) => {
        this.handleError(error, "Client error");
      };

      // Create transport with auth headers
      const requestInit: RequestInit = {};
      const authHeaders = this.authProvider.createAuthHeaders();
      if (!authHeaders) {
        throw new Error("Failed to create auth headers - token may be invalid");
      }

      requestInit.headers = authHeaders;
      // Add restaurantId to headers if set
      if (this.restaurantId) {
        this.log(
          `Adding restaurant ID ${this.restaurantId} to request headers`
        );
        (requestInit.headers as any)["x-restaurant-id"] = this.restaurantId;
      }

      this.log(`Using server URL: ${this.serverUrl}`);

      try {
        this.transport = new StreamableHTTPClientTransport(
          new URL(this.serverUrl),
          {
            sessionId: this.sessionId,
            requestInit: requestInit,
          }
        );
      } catch (transportError) {
        throw new Error(`Failed to create transport: ${transportError}`);
      }

      // Set up notification handlers
      this.setupNotificationHandlers();

      // Connect the client
      try {
        await this.client.connect(this.transport);
        this.sessionId = this.transport.sessionId;
        this.log(`Transport created with session ID: ${this.sessionId}`);
        this.log("Connected to MCP server");
      } catch (connectError: any) {
        throw new Error(
          `Failed to connect client: ${connectError.message || connectError}`
        );
      }
    } catch (error: any) {
      // Check for auth-related errors
      if (error.message && error.message.includes("401")) {
        this.log("Authentication failed: Invalid or missing token", "error");
        throw new Error("Authentication failed: Invalid or missing token");
      } else {
        this.handleError(error, "Failed to connect");
        throw error;
      }
    } finally {
      if (!this.client || !this.transport) {
        this.log("Connection failed - cleaning up resources");
        this.client = null;
        this.transport = null;
      }
    }
  }

  // Set up notification handlers
  private setupNotificationHandlers(): void {
    if (!this.client) return;

    this.client.setNotificationHandler(
      LoggingMessageNotificationSchema,
      (notification) => {
        this.notificationCount++;
        this.log(
          `Notification #${this.notificationCount}: ${notification.params.level} - ${notification.params.data}`
        );
      }
    );

    this.client.setNotificationHandler(
      ResourceListChangedNotificationSchema,
      async (_) => {
        this.log("Resource list changed notification received!");
        try {
          if (this.client) {
            const resourcesResult = await this.client.request(
              {
                method: "resources/list",
                params: {},
              },
              ListResourcesResultSchema
            );
            this.log(
              `Available resources count: ${resourcesResult.resources.length}`
            );
          }
        } catch (error) {
          this.log(
            "Failed to list resources after change notification",
            "warn"
          );
        }
      }
    );
  }

  // Disconnect from the server
  async disconnectFromServer(): Promise<void> {
    if (!this.client || !this.transport) {
      this.log("Not connected to server");
      return;
    }

    try {
      await this.transport.close();
      this.log("Disconnected from MCP server");
      this.client = null;
      this.transport = null;

      // Clear available tools, prompts, and resources
      this.availableTools = [];
      this.availablePrompts = [];
      this.availableResources = [];
      // Clear conversation history
      this.messageHistory.length = 0;
      this.userProfile = null;
    } catch (error) {
      const errorMsg = this.handleError(error, "Error disconnecting");
      throw new Error(errorMsg);
    }
  }

  // Fetch all server capabilities
  async fetchServerCapabilities(): Promise<void> {
    console.log(
      `[Session ${this.token.substring(0, 8)}...] Fetching server capabilities...`
    );

    try {
      // Fetch tools
      await this.listTools(false);

      // Fetch prompts
      await this.listPrompts(false);

      // Fetch resources
      await this.listResources(false);

      console.log(
        `[Session ${this.token.substring(0, 8)}...] Server capabilities fetched: ${this.availableTools.length} tools, ${this.availablePrompts.length} prompts, ${this.availableResources.length} resources`
      );
    } catch (error) {
      console.error(
        `[Session ${this.token.substring(0, 8)}...] Error fetching server capabilities:`,
        error
      );
      throw error;
    }
  }

  // List available tools
  async listTools(printToConsole: boolean = true): Promise<void> {
    if (!this.client) {
      console.log(
        `[Session ${this.token.substring(0, 8)}...] Not connected to server`
      );
      throw new Error("Not connected to server");
    }

    try {
      const toolsRequest: ListToolsRequest = {
        method: "tools/list",
        params: {},
      };

      const toolsResult = await this.client.request(
        toolsRequest,
        ListToolsResultSchema
      );

      // Update the tools list with input schema for Claude
      this.availableTools = toolsResult.tools.map((tool) => ({
        name: tool.name,
        description: tool.description || "",
        inputSchema: tool.inputSchema,
      }));

      if (printToConsole) {
        console.log(
          `[Session ${this.token.substring(0, 8)}...] Available tools:`,
          this.availableTools
        );
      }
    } catch (error) {
      console.log(
        `[Session ${this.token.substring(0, 8)}...] Tools not supported by this server (${error})`
      );
      this.availableTools = [];
    }
  }

  // List available prompts
  async listPrompts(printToConsole: boolean = true): Promise<void> {
    if (!this.client) {
      console.log(
        `[Session ${this.token.substring(0, 8)}...] Not connected to server`
      );
      throw new Error("Not connected to server");
    }

    try {
      const promptsRequest: ListPromptsRequest = {
        method: "prompts/list",
        params: {},
      };

      const promptsResult = await this.client.request(
        promptsRequest,
        ListPromptsResultSchema
      );

      // Update the prompts list
      this.availablePrompts = promptsResult.prompts.map((prompt) => ({
        name: prompt.name,
        description: prompt.description || "",
      }));

      if (printToConsole) {
        console.log(
          `[Session ${this.token.substring(0, 8)}...] Available prompts:`,
          this.availablePrompts
        );
      }
    } catch (error) {
      console.log(
        `[Session ${this.token.substring(0, 8)}...] Prompts not supported by this server (${error})`
      );
      this.availablePrompts = [];
    }
  }

  // List available resources
  async listResources(printToConsole: boolean = true): Promise<void> {
    if (!this.client) {
      console.log(
        `[Session ${this.token.substring(0, 8)}...] Not connected to server`
      );
      throw new Error("Not connected to server");
    }

    try {
      const resourcesRequest: ListResourcesRequest = {
        method: "resources/list",
        params: {},
      };

      const resourcesResult = await this.client.request(
        resourcesRequest,
        ListResourcesResultSchema
      );

      // Update the resources list
      this.availableResources = resourcesResult.resources.map((resource) => ({
        name: resource.name,
        uri: resource.uri,
      }));

      if (printToConsole) {
        console.log(
          `[Session ${this.token.substring(0, 8)}...] Available resources:`,
          this.availableResources
        );
      }
    } catch (error) {
      console.log(
        `[Session ${this.token.substring(0, 8)}...] Resources not supported by this server (${error})`
      );
      this.availableResources = [];
    }
  }

  // Call a tool with arguments
  async callTool(
    name: string,
    args: Record<string, unknown>
  ): Promise<ToolResult> {
    if (!this.client) {
      throw new Error("Not connected to MCP server");
    }

    try {
      // Log tool call with original args
      this.log(
        `Tool call request: ${name} with initial args: ${JSON.stringify(args)}`
      );

      // Auto-inject restaurantId if it's not provided but we have it in the session
      // and the tool has a restaurantId parameter in its schema
      if (this.restaurantId && !args.hasOwnProperty("restaurantId")) {
        // List of tools that we know require a restaurantId
        const toolsRequiringRestaurantId = [
          "create-table",
          "get-tables",
          "get-orders",
          "create-menu",
          "get-menus",
          "get-time-slots",
        ];

        // For known tools or tools whose schema include a restaurantId field
        if (toolsRequiringRestaurantId.includes(name)) {
          this.log(
            `Auto-injecting restaurantId (${this.restaurantId}) for ${name} tool call`
          );
          // Convert string ID to number as most API endpoints expect numeric IDs
          args.restaurantId = parseInt(this.restaurantId);
          this.log(`Converted restaurantId to number: ${args.restaurantId}`);
        } else {
          // Look up the tool schema to check if it requires restaurantId
          const tool = this.availableTools.find((t) => t.name === name);
          if (
            tool?.inputSchema?.properties?.restaurantId &&
            (tool.inputSchema.required || []).includes("restaurantId")
          ) {
            this.log(
              `Auto-injecting restaurantId (${this.restaurantId}) based on schema for ${name} tool call`
            );
            args.restaurantId = parseInt(this.restaurantId);
            this.log(`Converted restaurantId to number: ${args.restaurantId}`);
          } else {
            this.log(
              `Tool ${name} doesn't require restaurantId, not injecting`
            );
          }
        }
      } else if (!this.restaurantId && name === "create-table") {
        this.log(
          `WARNING: Tool ${name} requires restaurantId but none is available in the session`,
          "warn"
        );
      }

      this.log(`Calling tool ${name} with final args: ${JSON.stringify(args)}`);

      const request: CallToolRequest = {
        method: "tools/call",
        params: {
          name,
          arguments: args,
        },
      };

      const result = await this.client.request(request, CallToolResultSchema);
      this.log(`Tool ${name} result received`);
      return result;
    } catch (error: any) {
      const errorMessage = this.handleError(
        error,
        `Error calling tool ${name}`
      );

      // Return formatted error
      return {
        content: [
          {
            type: "text",
            text: `Error calling tool ${name}: ${errorMessage}`,
          },
        ],
        isError: true,
      };
    }
  }

  // Fetch user profile
  async fetchUserProfile(): Promise<boolean> {
    if (!this.client || !this.availableTools) {
      return false;
    }

    // Check if get-user-profile tool is available
    if (this.availableTools.some((tool) => tool.name === "get-user-profile")) {
      try {
        console.log(
          `[Session ${this.token.substring(0, 8)}...] Fetching user profile...`
        );
        const result = await this.callTool("get-user-profile", {});

        // Store the profile text content
        if (result.content.length > 0 && result.content[0]!.type === "text") {
          const profileText = result.content[0]!.text || "";
          this.userProfile = {
            text: profileText,
            restaurants: this.extractRestaurantInfo(profileText),
          };

          // Display profile info in the console
          console.log(
            `[Session ${this.token.substring(0, 8)}...] User profile fetched:`
          );
          console.log(
            `[Session ${this.token.substring(0, 8)}...] Restaurants:`,
            this.userProfile.restaurants
          );

          // Log all available restaurant IDs for debugging
          this.log(
            `Available restaurant IDs: ${JSON.stringify(this.userProfile.restaurants.map((r: { id: string; name: string }) => ({ id: r.id, name: r.name })))}`
          );

          return true;
        }
      } catch (error) {
        console.error(
          `[Session ${this.token.substring(0, 8)}...] Error fetching user profile:`,
          error
        );
      }
    }

    return false;
  }

  // Extract restaurant info from profile text
  extractRestaurantInfo(
    profileText: string
  ): Array<{ id: string; name: string }> {
    const restaurants: Array<{ id: string; name: string }> = [];

    // Parse the profile text to extract restaurant IDs and names
    if (profileText) {
      const lines = profileText.split("\n");
      let isRestaurantSection = false;

      for (const line of lines) {
        if (line.includes("--- Restaurants ---")) {
          isRestaurantSection = true;
          continue;
        }

        if (isRestaurantSection && line.trim()) {
          const restaurantMatch = line.match(/Restaurant: (.+)/);
          const idMatch = line.match(/ID: (\d+)/);

          if (restaurantMatch && idMatch) {
            restaurants.push({
              name: restaurantMatch[1]!,
              id: idMatch[1]!,
            });
          }
        }
      }
    }

    return restaurants;
  }

  // Utility: Get current date as a string (e.g., May 22, 2025)
  private getCurrentDateString(): string {
    const now = new Date();
    return now.toLocaleDateString("en-US", {
      year: "numeric",
      month: "long",
      day: "numeric",
    });
  }

  // Generate system context for Claude
  generateSystemContext(): string {
    // Add today's date at the very top
    const todayString = this.getCurrentDateString();
    let systemContext = `TODAY'S DATE IS: ${todayString}.\n`;
    // Start with restaurant context first if available - make it the most prominent information
    systemContext +=
      "You are a helpful assistant for a restaurant management system. ";

    // Log restaurant ID status for debugging
    this.log(
      `Generating system context with restaurantId: ${this.restaurantId || "none"}, restaurantName: ${this.restaurantName || "none"}`
    );

    // If restaurantId is set, make it the FIRST and MOST PROMINENT piece of information
    if (this.restaurantId) {
      const displayName =
        this.restaurantName || `Restaurant ID: ${this.restaurantId}`;
      systemContext =
        `IMPORTANT CONTEXT: YOU ARE CURRENTLY WORKING WITH RESTAURANT "${displayName}" (ID: ${this.restaurantId}).\n\n` +
        systemContext;
      systemContext += `\n\nCRITICAL INSTRUCTION: AUTOMATICALLY USE RESTAURANT ID ${this.restaurantId} FOR ALL TOOL CALLS.`;
      systemContext += `\nDO NOT ASK THE USER WHICH RESTAURANT TO USE.`;
      systemContext += `\nDO NOT REQUEST THE RESTAURANT ID FROM THE USER.`;
    }

    if (this.userProfile) {
      systemContext +=
        "\n\nUser profile information:\n" + this.userProfile.text;

      // Add specific context about restaurants for table creation
      if (
        this.userProfile.restaurants &&
        this.userProfile.restaurants.length > 0
      ) {
        systemContext += "\n\nAvailable restaurants for this user:";

        // Log all available restaurant IDs for debugging
        this.log(
          `Available restaurant IDs: ${JSON.stringify(this.userProfile.restaurants.map((r: { id: string; name: string }) => ({ id: r.id, name: r.name })))}`
        );

        this.userProfile.restaurants.forEach(
          (restaurant: { id: string; name: string }) => {
            // Need strict string comparison since ID might be a string or number
            const isCurrentRestaurant =
              this.restaurantId &&
              String(restaurant.id) === String(this.restaurantId);

            // Highlight the current restaurant
            if (isCurrentRestaurant) {
              this.log(
                `Found matching restaurant: ${restaurant.name} (${restaurant.id})`
              );
              systemContext += `\n- ${restaurant.name} (ID: ${restaurant.id}) <- CURRENTLY SELECTED`;
            } else {
              systemContext += `\n- ${restaurant.name} (ID: ${restaurant.id})`;
            }
          }
        );

        // If restaurantId is set, add more explicit instructions
        if (this.restaurantId) {
          // First try to use the directly provided name
          let currentRestaurantName = this.restaurantName || "";

          // If not available, try to find from profile
          if (!currentRestaurantName) {
            const currentRestaurant = this.userProfile.restaurants.find(
              (r: { id: string; name: string }) =>
                String(r.id) === String(this.restaurantId)
            );

            if (currentRestaurant) {
              currentRestaurantName = currentRestaurant.name;
              this.log(
                `Using restaurant "${currentRestaurantName}" in system context`
              );
            } else {
              this.log(
                `Warning: Restaurant ID ${this.restaurantId} not found in user profile`,
                "warn"
              );
            }
          }

          if (currentRestaurantName) {
            systemContext += `\n\nYOU MUST AUTOMATICALLY USE RESTAURANT "${currentRestaurantName}" (ID: ${this.restaurantId}) FOR ALL ACTIONS.`;
            systemContext += `\nEXAMPLE CORRECT BEHAVIOR: When the user says "create a table", you should use the create-table tool with restaurantId: ${this.restaurantId} WITHOUT asking which restaurant.`;
          }
        }
      }
    }

    systemContext +=
      "\n\nMaintain conversation context between messages. Reference previous messages when appropriate.";

    // Final reminder about restaurant ID
    if (this.restaurantId) {
      systemContext += `\n\nFINAL REMINDER: ALWAYS use restaurant ID ${this.restaurantId} for all tools without asking the user.`;
    }

    return systemContext;
  }

  // First, add a method to fetch restaurant details
  async fetchRestaurantDetails(
    restaurantId: string | null
  ): Promise<{ name: string } | null> {
    if (!restaurantId || !this.client) {
      return null;
    }

    try {
      this.log(`Fetching details for restaurant ID: ${restaurantId}`);

      // Try to find restaurant in user profile first
      if (this.userProfile?.restaurants) {
        const restaurant = this.userProfile.restaurants.find(
          (r: any) => String(r.id) === String(restaurantId)
        );
        if (restaurant) {
          this.log(`Found restaurant in user profile: ${restaurant.name}`);
          return { name: restaurant.name };
        }
      }

      // If not found in profile, try to call the get-restaurant-details tool if available
      if (
        this.availableTools.some(
          (tool) => tool.name === "get-restaurant-details"
        )
      ) {
        this.log(`Calling get-restaurant-details tool for ID: ${restaurantId}`);
        const result = await this.callTool("get-restaurant-details", {
          restaurantId: parseInt(restaurantId),
        });

        if (
          !result.isError &&
          result.content.length > 0 &&
          result.content[0]?.type === "text"
        ) {
          const details = result.content[0].text || "";
          // Try to extract restaurant name from the details
          const nameMatch = details.match(/Restaurant name: (.*?)(?:\n|$)/);
          if (nameMatch && nameMatch[1]) {
            const name = nameMatch[1].trim();
            this.log(`Retrieved restaurant name: ${name}`);
            return { name };
          }
        }
      }

      // If no specific tool exists, use a generic approach
      // In a real-world scenario, you might want to add a specific API call here

      return null;
    } catch (error) {
      this.log(`Error fetching restaurant details: ${error}`, "error");
      return null;
    }
  }

  // Now, update the initializeConversation method to use the new function
  async initializeConversation(forceReset: boolean = false): Promise<void> {
    if (forceReset) {
      this.messageHistory = [];
    }

    if (this.messageHistory.length === 0) {
      const systemContext = this.generateSystemContext();

      // Add system context as a special user message that Claude will consider as context
      this.messageHistory.push({
        role: "user",
        content: systemContext,
      });

      // Create a welcoming first message from the assistant
      let welcomeMessage = "";

      // Check if we have a specific restaurant selected
      if (this.restaurantId) {
        // First try to use the direct restaurantName from the session
        let restaurantName = this.restaurantName || "selected restaurant";

        // If not directly available, try to find from profile
        if (!this.restaurantName && this.userProfile?.restaurants) {
          const restaurant = this.userProfile.restaurants.find(
            (r: any) => String(r.id) === String(this.restaurantId)
          );
          if (restaurant) {
            restaurantName = restaurant.name;
            this.log(
              `Found restaurant name "${restaurantName}" for ID ${this.restaurantId}`
            );
          } else {
            this.log(
              `Could not find restaurant name for ID ${this.restaurantId} in user profile`,
              "warn"
            );
          }
        }

        // If we have a restaurant name, use it in the welcome message
        if (restaurantName) {
          this.log(
            `Creating welcome message for restaurant: ${restaurantName}`
          );
          welcomeMessage = `Welcome! I'm your restaurant assistant for ${restaurantName}.\n\nI can help you with:\n- Managing tables and reservations\n- Creating and updating menus\n- Handling orders\n- Managing staff and permissions\n\nWhat would you like to do today?`;
        } else {
          // If name not available, use generic message
          this.log(
            `No restaurant name available, using generic welcome message`
          );
          welcomeMessage = `Welcome! I'm your restaurant assistant.\n\nI can help you manage your restaurant.\n\nWhat would you like to do today?`;
        }
      } else {
        // Generic welcome message when no restaurant is selected
        welcomeMessage = `Welcome! I'm your restaurant management assistant.\n\nI can help you with:\n- Managing tables and reservations\n- Creating and updating menus\n- Handling orders\n- Managing staff and permissions\n\nPlease let me know what you'd like to do today.`;
      }

      // Store the acknowledgment separately - this is for system purposes
      let acknowledgment =
        "I understand. I'll help you manage your restaurants.";
      if (this.restaurantId) {
        let restaurantName = "your selected restaurant";
        if (this.userProfile?.restaurants) {
          const restaurant = this.userProfile.restaurants.find(
            (r: any) => String(r.id) === String(this.restaurantId)
          );
          if (restaurant) {
            restaurantName = `${restaurant.name}`;
          }
        }

        acknowledgment = `I understand. I'll help you manage ${restaurantName} (ID: ${this.restaurantId}). I'll automatically use this restaurant ID for all operations without asking.`;
      }

      // Add the welcome message as the visible message from the assistant
      this.messageHistory.push({
        role: "assistant",
        content: welcomeMessage,
      });

      this.log(`Conversation initialized with welcome message`);
    }
  }

  // Process user message using Claude
  async processMessageWithClaude(message: string): Promise<string> {
    if (!this.client) {
      return "Not connected to MCP server. Please connect first.";
    }

    if (!anthropic) {
      return "Claude integration not available. Please check your API key.";
    }

    // Initialize conversation if needed
    this.initializeConversation();

    // Add restaurant context reminder if the message indicates table/restaurant operations and we have a restaurant ID
    let userMessage = message;

    // Add today's date to the user message for extra clarity
    const todayString = this.getCurrentDateString();
    userMessage = `TODAY'S DATE IS: ${todayString}.\n` + userMessage;

    // Log original message and restaurant ID status
    this.log(`Processing user message: "${message}"`);
    this.log(`Current restaurantId: ${this.restaurantId || "none"}`);

    const tableRelatedTerms = [
      "table",
      "booking",
      "reservation",
      "menu",
      "order",
      "dish",
      "create",
    ];
    const containsTableRelatedTerms = tableRelatedTerms.some((term) =>
      message.toLowerCase().includes(term)
    );

    if (this.restaurantId && containsTableRelatedTerms) {
      // First try to use the direct restaurantName from the session
      let restaurantName = this.restaurantName || "selected restaurant";

      // If not directly available, try to find from profile
      if (!this.restaurantName && this.userProfile?.restaurants) {
        const restaurant = this.userProfile.restaurants.find(
          (r: any) => String(r.id) === String(this.restaurantId)
        );
        if (restaurant) {
          restaurantName = restaurant.name;
          this.log(
            `Found restaurant name "${restaurantName}" for ID ${this.restaurantId}`
          );
        } else {
          this.log(
            `Could not find restaurant name for ID ${this.restaurantId} in user profile`,
            "warn"
          );
        }
      }

      // Prepend a clear reminder to the user's message
      this.log(
        `Adding restaurant context reminder to user message using name: ${restaurantName}`
      );
      userMessage = `Remember, I want to work with "${restaurantName}" (ID: ${this.restaurantId}) for this request.\n\n${userMessage}`;
    } else {
      if (containsTableRelatedTerms && !this.restaurantId) {
        this.log(
          `User message contains table-related terms but no restaurantId is set`,
          "warn"
        );
      } else if (!containsTableRelatedTerms) {
        this.log(`Message doesn't appear to need restaurant context`);
      }
    }

    // Add user message to history
    this.messageHistory.push({
      role: "user",
      content: userMessage,
    });

    try {
      this.log(`Sending query to Claude...`);

      // Convert MCP tools to Claude tool format
      const claudeTools = this.availableTools.map((tool) => {
        return {
          name: tool.name,
          description: tool.description || "",
          input_schema: tool.inputSchema,
        };
      });

      // Clean up conversation history to ensure valid tool_use/tool_result pairing
      this.cleanupConversationHistory();

      // Limit history to last 15 messages to avoid token limits
      if (this.messageHistory.length > 16) {
        // Type-safe way to trim the history while keeping the first message
        const firstMessage = this.messageHistory[0];
        const recentMessages = this.messageHistory.slice(-15);

        // Create a new array with the known good types
        const newHistory: ExtendedMessageParam[] = [];

        // Add the first message if it exists
        if (firstMessage) {
          newHistory.push(firstMessage);
        }

        // Add the recent messages
        recentMessages.forEach((msg) => newHistory.push(msg));

        // Replace the message history
        this.messageHistory = newHistory;
        console.log(
          `[Session ${this.token.substring(0, 8)}...] Trimmed conversation history to 16 messages`
        );
      }

      // Initial Claude API call with conversation history
      const response = await anthropic.messages.create({
        model: "claude-3-5-sonnet-20241022",
        max_tokens: 1000,
        messages: this.messageHistory,
        tools: claudeTools,
      });

      // Process response and handle tool calls
      const finalText: string[] = [];
      let usedTool = false;

      for (const content of response.content) {
        if (content.type === "text" && !usedTool) {
          // Only include text if no tool has been used yet
          finalText.push(content.text);

          // Add Claude's response to the conversation history
          this.messageHistory.push({
            role: "assistant",
            content: content.text,
          });
        } else if (content.type === "tool_use") {
          // Execute tool call
          const toolName = content.name;
          const toolArgs = content.input as Record<string, unknown>;
          const toolUseId = content.id;

          // Set flag to indicate a tool was used
          usedTool = true;

          // Clear any previous text since we only want to show tool output followed by explanation
          finalText.length = 0;

          console.log(
            `[Session ${this.token.substring(0, 8)}...] Claude is calling tool: ${toolName}`
          );

          // Add the tool call message to history
          this.messageHistory.push({
            role: "assistant",
            content: [
              {
                type: "tool_use" as const,
                name: toolName,
                input: toolArgs,
                id: toolUseId,
              },
            ],
          });

          // Call the MCP tool
          try {
            const result = await this.callTool(toolName, toolArgs);

            // Format tool result for display
            const toolOutput = result.content
              .filter((item) => item.type === "text" && item.text)
              .map((item) => item.text)
              .join("\n");

            // Immediately refresh user profile after data-changing operations
            if (
              toolName === "create-restaurant" ||
              toolName === "create-table"
            ) {
              console.log(
                `[Session ${this.token.substring(0, 8)}...] Updating profile after data change operation...`
              );

              // Try multiple times with delays to ensure we get the fresh data
              let attempts = 0;
              const maxAttempts = 3;
              let success = false;

              while (attempts < maxAttempts && !success) {
                try {
                  attempts++;
                  // Wait a bit to give the server time to process the change
                  await new Promise((resolve) =>
                    setTimeout(resolve, 500 * attempts)
                  );

                  console.log(
                    `[Session ${this.token.substring(0, 8)}...] Profile refresh attempt ${attempts}/${maxAttempts}...`
                  );
                  const refreshed = await this.fetchUserProfile();

                  if (refreshed) {
                    // Check if the new data includes what we just created
                    if (toolName === "create-restaurant") {
                      const restaurantName = toolArgs.name as string;
                      success =
                        this.userProfile &&
                        this.userProfile.restaurants &&
                        this.userProfile.restaurants.some(
                          (r: any) =>
                            r.name.toLowerCase() ===
                            restaurantName.toLowerCase()
                        );

                      if (success) {
                        console.log(
                          `[Session ${this.token.substring(0, 8)}...] Successfully found new restaurant '${restaurantName}' in profile.`
                        );
                      } else {
                        console.log(
                          `[Session ${this.token.substring(0, 8)}...] Couldn't find new restaurant '${restaurantName}' in profile yet.`
                        );
                      }
                    } else {
                      // For other operations, just assume the refresh worked
                      success = true;
                    }
                  }
                } catch (error) {
                  console.error(
                    `[Session ${this.token.substring(0, 8)}...] Error in profile refresh attempt ${attempts}:`,
                    error
                  );
                }
              }

              if (!success && toolName === "create-restaurant") {
                console.log(
                  `[Session ${this.token.substring(0, 8)}...] Could not verify new data, but proceeding anyway.`
                );
              }
            }

            // Add the tool result to conversation history
            this.messageHistory.push({
              role: "user",
              content: [
                {
                  type: "tool_result" as const,
                  tool_use_id: toolUseId,
                  content: toolOutput,
                },
              ],
            });

            // Now, make a follow-up call to Claude to explain the tool results
            console.log(
              `[Session ${this.token.substring(0, 8)}...] Getting Claude's explanation of tool results...`
            );

            const followupResponse = await anthropic.messages.create({
              model: "claude-3-5-sonnet-20241022",
              max_tokens: 1000,
              messages: this.messageHistory,
            });

            // Add Claude's explanation to the final output
            if (
              followupResponse.content.length > 0 &&
              followupResponse.content[0]!.type === "text"
            ) {
              finalText.push("\n\n" + followupResponse.content[0]!.text);

              // Add the follow-up response to conversation history
              this.messageHistory.push({
                role: "assistant",
                content: followupResponse.content[0]!.text,
              });
            }
          } catch (error) {
            // Handle tool error
            const errorMessage = `Tool execution failed: ${error}`;

            // Add error result to conversation history
            this.messageHistory.push({
              role: "user",
              content: [
                {
                  type: "tool_result" as const,
                  tool_use_id: toolUseId,
                  content: errorMessage,
                },
              ],
            });

            // Get Claude to explain the error
            try {
              const errorFollowupResponse = await anthropic.messages.create({
                model: "claude-3-5-sonnet-20241022",
                max_tokens: 1000,
                messages: this.messageHistory,
              });

              if (
                errorFollowupResponse.content.length > 0 &&
                errorFollowupResponse.content[0]!.type === "text"
              ) {
                finalText.push("\n\n" + errorFollowupResponse.content[0]!.text);

                // Add the follow-up response to conversation history
                this.messageHistory.push({
                  role: "assistant",
                  content: errorFollowupResponse.content[0]!.text,
                });
              }
            } catch (followupError) {
              console.error(
                `[Session ${this.token.substring(0, 8)}...] Error getting follow-up explanation:`,
                followupError
              );
              finalText.push("\n\nI'm having trouble processing that request.");
            }
          }
        }
      }

      return finalText.join("");
    } catch (error: any) {
      console.error(
        `[Session ${this.token.substring(0, 8)}...] Error processing message with Claude:`,
        error
      );

      // Add error to conversation history
      this.messageHistory.push({
        role: "assistant",
        content: `I encountered an error: ${error.message || String(error)}`,
      });

      return `Error processing your request: ${error.message || String(error)}`;
    }
  }

  // Clean up conversation history to ensure valid pairs
  cleanupConversationHistory(): void {
    // Create a map of tool use IDs to their results
    const toolUseMap: Map<string, boolean> = new Map();
    const toolResultMap: Map<string, boolean> = new Map();

    // Identify all tool uses and tool results
    this.messageHistory.forEach((message) => {
      if (message.role === "assistant" && Array.isArray(message.content)) {
        message.content.forEach((content) => {
          if (content.type === "tool_use") {
            toolUseMap.set(content.id, false); // Initially mark as not completed
          }
        });
      }

      if (message.role === "user" && Array.isArray(message.content)) {
        message.content.forEach((content) => {
          if (content.type === "tool_result" && content.tool_use_id) {
            toolResultMap.set(content.tool_use_id, true);
            toolUseMap.set(content.tool_use_id, true); // Mark as completed
          }
        });
      }
    });

    // Keep messages that are valid (either not tool-related or have complete tool use/result pairs)
    const newHistory = this.messageHistory.filter((message) => {
      // Regular text messages are kept
      if (typeof message.content === "string") {
        return true;
      }

      // Tool uses are kept if they have corresponding results
      if (message.role === "assistant" && Array.isArray(message.content)) {
        const hasToolUse = message.content.some(
          (item) => item.type === "tool_use"
        );

        if (!hasToolUse) return true; // Keep non-tool messages

        // For tool use messages, check if all tools have results
        return message.content.every(
          (item) => item.type !== "tool_use" || toolUseMap.get(item.id) === true
        );
      }

      // Tool results are kept if they correspond to a known tool use
      if (message.role === "user" && Array.isArray(message.content)) {
        const hasToolResult = message.content.some(
          (item) => item.type === "tool_result"
        );

        if (!hasToolResult) return true; // Keep non-tool result messages

        // For tool result messages, verify they match known tool uses
        return message.content.every(
          (item) =>
            item.type !== "tool_result" ||
            (item.tool_use_id && toolResultMap.has(item.tool_use_id))
        );
      }

      return true; // Default to keeping messages
    });

    this.messageHistory = newHistory;
    console.log(
      `[Session ${this.token.substring(0, 8)}...] Cleaned up conversation history: ${this.messageHistory.length} messages remaining`
    );
  }

  // Utility method for consistent logging
  private log(
    message: string,
    level: "info" | "error" | "warn" = "info"
  ): void {
    const prefix = `[Session ${this.token.substring(0, 8)}...]`;
    switch (level) {
      case "error":
        console.error(`${prefix} ${message}`);
        break;
      case "warn":
        console.warn(`${prefix} ${message}`);
        break;
      default:
        console.log(`${prefix} ${message}`);
        break;
    }
  }

  // Utility method for handling errors
  private handleError(error: any, context: string): string {
    const errorMessage = error.message || String(error);
    this.log(`${context}: ${errorMessage}`, "error");
    return errorMessage;
  }

  // Utility method to add message to history
  private addMessageToHistory(
    role: "user" | "assistant" | "system",
    content: string | any[]
  ): void {
    this.messageHistory.push({
      role: role,
      content: content,
    } as ExtendedMessageParam);
  }
}

// Define tool result interface
interface ToolResult {
  content: Array<{
    type: string;
    text?: string;
    [key: string]: unknown;
  }>;
  isError?: boolean;
}

// Store user sessions indexed by token
const userSessions: Map<string, UserSession> = new Map();

// Create the Express app with proper CORS configuration
const app = express();
app.use(
  cors({
    origin: "*", // Allow any origin for development
    methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization"],
    credentials: true,
  })
);
app.use(express.json());
app.use(express.static(path.join(__dirname, "../public")));

// Helper function to create properly typed request handlers
const createHandler = (
  handler: (req: express.Request, res: express.Response) => Promise<void> | void
): express.RequestHandler => {
  return async (req, res, next) => {
    try {
      await handler(req, res);
      // Don't call next if response has been sent
      if (!res.headersSent) {
        next();
      }
    } catch (error) {
      next(error);
    }
  };
};

// Helper to get token from request
const getTokenFromRequest = (req: express.Request): string | null => {
  let token = req.body.token;

  // If no token in body, try to get it from Authorization header
  if (!token) {
    const authHeader = req.headers.authorization;
    if (authHeader && authHeader.startsWith("Bearer ")) {
      token = authHeader.substring(7);
    }
  }

  return token || null;
};

// Helper to get user session
const getUserSession = (
  token: string,
  res: express.Response
): UserSession | null => {
  const session = userSessions.get(token);
  if (!session) {
    res.status(401).json({
      success: false,
      error: "No active session for this token. Please reconnect.",
    });
    return null;
  }
  return session;
};

// Create routes - using the helper function to fix type errors
app.post(
  "/api/auth",
  createHandler(async (req: express.Request, res: express.Response) => {
    try {
      let token = req.body.token;

      // If no token in body, try to get it from Authorization header
      if (!token) {
        const authHeader = req.headers.authorization;
        if (authHeader && authHeader.startsWith("Bearer ")) {
          token = authHeader.substring(7);
        }
      }

      if (!token) {
        res.status(400).json({ success: false, error: "No token provided" });
        return;
      }

      // Create a new session or get existing one
      let session = userSessions.get(token);
      if (!session) {
        session = new UserSession(token);
        userSessions.set(token, session);
        console.log(
          `Created new session for token: ${token.substring(0, 8)}...`
        );
      }

      res.json({ success: true, message: "Authentication token set" });
    } catch (error) {
      console.error("Auth error:", error);
      res
        .status(500)
        .json({ success: false, error: "Failed to set authentication token" });
    }
  })
);

app.post(
  "/api/connect",
  createHandler(async (req: express.Request, res: express.Response) => {
    try {
      console.log("Received connection request:", req.body);
      const token = getTokenFromRequest(req);
      const url = req.body.url;
      const restaurantId = req.body.restaurantId;
      const restaurantName = req.body.restaurantName;

      // Log received parameters
      console.log(
        `Connection parameters: URL=${url}, restaurantId=${restaurantId}, restaurantName=${restaurantName}`
      );

      if (!token) {
        console.log("No token provided in request");
        res.status(400).json({ success: false, error: "No token provided" });
        return;
      }

      console.log(`Connecting with token: ${token.substring(0, 8)}...`);

      // Get or create session for this token
      let session = userSessions.get(token);
      if (!session) {
        session = new UserSession(
          token,
          url || DEFAULT_SERVER_URL,
          restaurantId,
          restaurantName
        );
        userSessions.set(token, session);
        console.log(
          `Created new session for token: ${token.substring(0, 8)}...`
        );
      } else {
        if (url) {
          // Update server URL if provided
          session.serverUrl = url;
        }
        if (restaurantId) {
          session.restaurantId = restaurantId;
        }
        if (restaurantName) {
          session.restaurantName = restaurantName;
        }
      }

      try {
        console.log("Connecting to server:", session.serverUrl);
        await session.connectToServer();
        console.log("Connected successfully");

        await session.fetchServerCapabilities();
        console.log("Fetched capabilities");

        await session.fetchUserProfile();
        console.log("Fetched user profile");

        session.initializeConversation(true);
        console.log("Initialized conversation");

        res.json({
          success: true,
          message: "Connected to MCP server",
          sessionId: session.sessionId,
          tools: session.availableTools,
          prompts: session.availablePrompts,
          resources: session.availableResources,
        });
      } catch (connectionError: any) {
        console.error("Connection failed:", connectionError);

        // Clean up the session if connection failed
        userSessions.delete(token);

        res.status(500).json({
          success: false,
          error: `Failed to connect: ${connectionError.message || connectionError}`,
          details: {
            serverUrl: session.serverUrl,
            errorType: connectionError.constructor.name,
            stack: connectionError.stack,
          },
        });
      }
    } catch (error: any) {
      console.error("Connect error:", error);
      res.status(500).json({
        success: false,
        error: `Failed to connect: ${error.message || error}`,
        stack: error.stack,
      });
    }
  })
);

app.post(
  "/api/disconnect",
  createHandler(async (req: express.Request, res: express.Response) => {
    try {
      const token = getTokenFromRequest(req);

      if (!token) {
        res.status(400).json({ success: false, error: "No token provided" });
        return;
      }

      const session = userSessions.get(token);
      if (session) {
        await session.disconnectFromServer();
        userSessions.delete(token); // Remove the session
        console.log(
          `Disconnected and removed session for token: ${token.substring(0, 8)}...`
        );
      }

      res.json({ success: true, message: "Disconnected from MCP server" });
    } catch (error) {
      console.error("Disconnect error:", error);
      res.status(500).json({
        success: false,
        error: `Failed to disconnect: ${error}`,
      });
    }
  })
);

app.post(
  "/api/chat",
  createHandler(async (req: express.Request, res: express.Response) => {
    try {
      const token = getTokenFromRequest(req);
      const message = req.body.message;

      if (!token) {
        res.status(400).json({
          success: false,
          error:
            "Token is required. Provide it in the request body or as a Bearer token in Authorization header.",
        });
        return;
      }

      if (!message) {
        res.status(400).json({
          success: false,
          error: "Message is required",
        });
        return;
      }

      const session = getUserSession(token, res);
      if (!session) return;

      if (!session.client) {
        res.status(400).json({
          success: false,
          error: "Not connected to MCP server. Please connect first.",
        });
        return;
      }

      const response = await session.processMessageWithClaude(message);
      res.json({
        success: true,
        response,
        history: session.messageHistory,
      });
    } catch (error) {
      console.error("Chat error:", error);
      res
        .status(500)
        .json({ success: false, error: `Chat processing error: ${error}` });
    }
  })
);

app.get(
  "/api/user-profile",
  createHandler(async (req: express.Request, res: express.Response) => {
    try {
      const token = req.query.token as string;

      if (!token) {
        res.status(400).json({ success: false, error: "Token is required" });
        return;
      }

      const session = getUserSession(token, res);
      if (!session) return;

      res.json({
        success: true,
        profile: session.userProfile,
      });
    } catch (error) {
      console.error("User profile error:", error);
      res.status(500).json({
        success: false,
        error: `Failed to get user profile: ${error}`,
      });
    }
  })
);

// Add endpoint to get initial conversation history
app.get(
  "/api/chat/initial",
  createHandler(async (req: express.Request, res: express.Response) => {
    try {
      const token = (req.query.token as string) || getTokenFromRequest(req);

      if (!token) {
        res.status(400).json({
          success: false,
          error:
            "Token is required. Provide it in the request body, as a query parameter, or as a Bearer token in Authorization header.",
        });
        return;
      }

      const session = getUserSession(token, res);
      if (!session) return;

      if (!session.client) {
        res.status(400).json({
          success: false,
          error: "Not connected to MCP server. Please connect first.",
        });
        return;
      }

      // Return the conversation history including the welcome message
      console.log(
        `[Session ${token.substring(0, 8)}...] Returning initial conversation history with ${session.messageHistory.length} messages`
      );
      res.json({
        success: true,
        history: session.messageHistory,
      });
    } catch (error) {
      console.error("Error fetching initial conversation:", error);
      res.status(500).json({
        success: false,
        error: `Error fetching initial conversation: ${error}`,
      });
    }
  })
);

// Start the server
const PORT = 8080;
app.listen(PORT, () => {
  console.log(`Web interface server listening on port ${PORT}`);
  console.log(
    `Debug info available at http://localhost:${PORT}/api/debug/sessions`
  );
  console.log(`Visit http://localhost:${PORT}/ to use the web interface`);
});
