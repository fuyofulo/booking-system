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

// Global client and transport for handling MCP communication
let client: Client | null = null;
let transport: StreamableHTTPClientTransport | null = null;
let serverUrl = "http://localhost:3030/mcp"; // Updated to match server port
// We don't need the resumptionToken for tools to work
let sessionId: string | undefined = undefined;

// JWT authentication provider
const authProvider = new JwtAuthProvider();
// HTTP fetcher with authentication
const httpFetcher = new HttpFetcher(authProvider);

// Track received notifications
let notificationCount = 0;

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

// Global variables for tool management
let availableTools: McpTool[] = [];
let availablePrompts: Prompt[] = [];
let availableResources: Resource[] = [];

// Define types for message content to ensure type safety
type ToolUseContent = {
  type: "tool_use";
  name: string;
  input: Record<string, unknown>;
  id: string;
};

type ToolResultContent = {
  type: "tool_result";
  tool_use_id: string;
  content: string;
};

// Store message history
interface Message {
  role: "user" | "assistant" | "system";
  content: string | any[];
}

// Use an array instead of const for messageHistory to allow reassignment
let messageHistory: MessageParam[] = [];
let userProfile: any = null;

// Create the Express app
const app = express();
app.use(cors());
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

// Create routes - using the helper function to fix type errors
app.post(
  "/api/auth",
  createHandler(async (req: express.Request, res: express.Response) => {
    try {
      const { token } = req.body;

      if (!token) {
        res.status(400).json({ success: false, error: "No token provided" });
        return;
      }

      // Set the auth token
      authProvider.setToken(token);

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
      const { url } = req.body;

      if (url) {
        serverUrl = url;
      }

      await connectToServer();

      if (client) {
        await fetchServerCapabilities();

        // Fetch user profile if available
        await fetchUserProfile();

        // Initialize message history with system context
        initializeConversation(true);

        res.json({
          success: true,
          message: "Connected to MCP server",
          sessionId: sessionId,
          tools: availableTools,
          prompts: availablePrompts,
          resources: availableResources,
        });
      } else {
        res
          .status(500)
          .json({ success: false, error: "Failed to connect to server" });
      }
    } catch (error) {
      console.error("Connect error:", error);
      res
        .status(500)
        .json({ success: false, error: `Failed to connect: ${error}` });
    }
  })
);

app.post(
  "/api/disconnect",
  createHandler(async (req: express.Request, res: express.Response) => {
    try {
      await disconnectFromServer();
      res.json({ success: true, message: "Disconnected from MCP server" });
    } catch (error) {
      console.error("Disconnect error:", error);
      res.status(500).json({ success: false, error: "Failed to disconnect" });
    }
  })
);

app.post(
  "/api/call-tool",
  createHandler(async (req: express.Request, res: express.Response) => {
    try {
      const { name, args } = req.body;

      if (!name) {
        res
          .status(400)
          .json({ success: false, error: "Tool name is required" });
        return;
      }

      const result = await callTool(name, args || {});
      res.json({ success: true, result });
    } catch (error) {
      console.error("Call tool error:", error);
      res
        .status(500)
        .json({ success: false, error: `Failed to call tool: ${error}` });
    }
  })
);

app.post(
  "/api/chat",
  createHandler(async (req: express.Request, res: express.Response) => {
    try {
      const { message } = req.body;

      if (!message) {
        res.status(400).json({ success: false, error: "Message is required" });
        return;
      }

      // Refresh user profile to ensure we have the latest data before processing each message
      if (
        client &&
        availableTools.some((tool) => tool.name === "get-user-profile")
      ) {
        try {
          console.log("Refreshing user profile before processing message...");
          const profileUpdated = await fetchUserProfile();
          if (profileUpdated) {
            console.log(
              "User profile refreshed successfully before processing message"
            );
          } else {
            console.warn(
              "Failed to refresh user profile before processing message"
            );
          }
        } catch (error) {
          console.error("Error refreshing user profile:", error);
        }
      }

      // Process message differently based on availability of Claude
      const response = await processMessageWithClaude(message);

      res.json({
        success: true,
        response,
        history: messageHistory,
      });
    } catch (error) {
      console.error("Chat error:", error);
      res
        .status(500)
        .json({ success: false, error: `Failed to process message: ${error}` });
    }
  })
);

app.get(
  "/api/status",
  createHandler((req: express.Request, res: express.Response) => {
    res.json({
      connected: !!client,
      sessionId: sessionId,
      tools: availableTools.length,
      prompts: availablePrompts.length,
      resources: availableResources.length,
      authenticated: !!authProvider.getToken(),
      claudeEnabled: !!anthropic,
    });
  })
);

// Utility functions for MCP communication
async function connectToServer(): Promise<void> {
  if (client) {
    console.log("Already connected to server");
    return;
  }

  console.log(`Connecting to ${serverUrl}...`);

  // Check if auth token is available
  if (!authProvider.getToken()) {
    console.log("Warning: No authentication token set");
  }

  try {
    // Create a new client
    client = new Client({
      name: "claude-web-client",
      version: "1.0.0",
    });

    client.onerror = (error) => {
      console.error("Client error:", error);
    };

    // Create transport with auth headers
    const requestInit: RequestInit = {};
    const authHeaders = authProvider.createAuthHeaders();
    if (authHeaders) {
      requestInit.headers = authHeaders;
    }

    transport = new StreamableHTTPClientTransport(new URL(serverUrl), {
      sessionId: sessionId,
      requestInit: requestInit,
    });

    // Set up notification handlers
    client.setNotificationHandler(
      LoggingMessageNotificationSchema,
      (notification) => {
        notificationCount++;
        console.log(
          `Notification #${notificationCount}: ${notification.params.level} - ${notification.params.data}`
        );
        // Could emit this to connected websocket clients
      }
    );

    client.setNotificationHandler(
      ResourceListChangedNotificationSchema,
      async (_) => {
        console.log("Resource list changed notification received!");
        try {
          if (client) {
            const resourcesResult = await client.request(
              {
                method: "resources/list",
                params: {},
              },
              ListResourcesResultSchema
            );
            console.log(
              "Available resources count:",
              resourcesResult.resources.length
            );
          }
        } catch (error) {
          console.log("Failed to list resources after change notification");
        }
      }
    );

    // Connect the client
    await client.connect(transport);
    sessionId = transport.sessionId;
    console.log("Transport created with session ID:", sessionId);
    console.log("Connected to MCP server");
  } catch (error: any) {
    // Check for auth-related errors
    if (error.message && error.message.includes("401")) {
      console.error("Authentication failed: Invalid or missing token");
    } else {
      console.error("Failed to connect:", error);
    }

    client = null;
    transport = null;
    throw error;
  }
}

async function disconnectFromServer(): Promise<void> {
  if (!client || !transport) {
    console.log("Not connected to server");
    return;
  }

  try {
    await transport.close();
    console.log("Disconnected from MCP server");
    client = null;
    transport = null;

    // Clear available tools, prompts, and resources
    availableTools = [];
    availablePrompts = [];
    availableResources = [];
    // Clear conversation history
    messageHistory.length = 0;
    userProfile = null;
  } catch (error) {
    console.error("Error disconnecting:", error);
    throw error;
  }
}

async function fetchServerCapabilities(): Promise<void> {
  console.log("Fetching server capabilities...");

  try {
    // Fetch tools
    await listTools(false);

    // Fetch prompts
    await listPrompts(false);

    // Fetch resources
    await listResources(false);

    console.log(
      `Server capabilities fetched: ${availableTools.length} tools, ${availablePrompts.length} prompts, ${availableResources.length} resources`
    );
  } catch (error) {
    console.error("Error fetching server capabilities:", error);
    throw error;
  }
}

async function listTools(printToConsole: boolean = true): Promise<void> {
  if (!client) {
    console.log("Not connected to server");
    throw new Error("Not connected to server");
  }

  try {
    const toolsRequest: ListToolsRequest = {
      method: "tools/list",
      params: {},
    };

    const toolsResult = await client.request(
      toolsRequest,
      ListToolsResultSchema
    );

    // Update the global tools list with input schema for Claude
    availableTools = toolsResult.tools.map((tool) => ({
      name: tool.name,
      description: tool.description || "",
      inputSchema: tool.inputSchema,
    }));

    if (printToConsole) {
      console.log("Available tools:", availableTools);
    }
  } catch (error) {
    console.log(`Tools not supported by this server (${error})`);
    availableTools = [];
  }
}

async function listPrompts(printToConsole: boolean = true): Promise<void> {
  if (!client) {
    console.log("Not connected to server");
    throw new Error("Not connected to server");
  }

  try {
    const promptsRequest: ListPromptsRequest = {
      method: "prompts/list",
      params: {},
    };

    const promptsResult = await client.request(
      promptsRequest,
      ListPromptsResultSchema
    );

    // Update the global prompts list
    availablePrompts = promptsResult.prompts.map((prompt) => ({
      name: prompt.name,
      description: prompt.description || "",
    }));

    if (printToConsole) {
      console.log("Available prompts:", availablePrompts);
    }
  } catch (error) {
    console.log(`Prompts not supported by this server (${error})`);
    availablePrompts = [];
  }
}

async function listResources(printToConsole: boolean = true): Promise<void> {
  if (!client) {
    console.log("Not connected to server");
    throw new Error("Not connected to server");
  }

  try {
    const resourcesRequest: ListResourcesRequest = {
      method: "resources/list",
      params: {},
    };

    const resourcesResult = await client.request(
      resourcesRequest,
      ListResourcesResultSchema
    );

    // Update the global resources list
    availableResources = resourcesResult.resources.map((resource) => ({
      name: resource.name,
      uri: resource.uri,
    }));

    if (printToConsole) {
      console.log("Available resources:", availableResources);
    }
  } catch (error) {
    console.log(`Resources not supported by this server (${error})`);
    availableResources = [];
  }
}

interface ToolResult {
  content: Array<{
    type: string;
    text?: string;
    [key: string]: unknown;
  }>;
  isError?: boolean;
}

async function callTool(
  name: string,
  args: Record<string, unknown>
): Promise<ToolResult> {
  if (!client) {
    console.log("Not connected to server");
    throw new Error("Not connected to server");
  }

  try {
    const request: CallToolRequest = {
      method: "tools/call",
      params: {
        name,
        arguments: args,
      },
    };

    console.log(`Calling tool '${name}' with args:`, args);

    // Make the request without resumption token options, just like claude-client.ts
    const result = await client.request(request, CallToolResultSchema);

    return {
      content: result.content,
      isError: result.isError,
    };
  } catch (error) {
    console.log(`Error calling tool ${name}: ${error}`);
    return {
      content: [
        {
          type: "text",
          text: `Error calling tool ${name}: ${error}`,
        },
      ],
      isError: true,
    };
  }
}

// Function to fetch user profile
async function fetchUserProfile(): Promise<boolean> {
  if (!client) return false;

  // Check if get-user-profile tool is available
  if (availableTools.some((tool) => tool.name === "get-user-profile")) {
    try {
      console.log("Fetching user profile information...");
      const result = await callTool("get-user-profile", {});

      if (result.isError) {
        console.error("Error fetching user profile:", result.content);
        return false;
      }

      // Extract profile text from result
      const profileText = result.content
        .filter((item) => item.type === "text" && item.text)
        .map((item) => item.text)
        .join("\n");

      if (!profileText || profileText.trim() === "") {
        console.error("Error: Received empty profile text");
        return false;
      }

      // Store the previous profile data to check for changes
      const oldProfile = userProfile ? JSON.stringify(userProfile) : "";

      // Update user profile data
      userProfile = {
        text: profileText,
        restaurants: extractRestaurantInfo(profileText),
      };

      // Check if the profile has actually changed
      const newProfile = JSON.stringify(userProfile);
      if (oldProfile !== newProfile) {
        console.log("User profile updated with new data");

        // Log the restaurants for debugging
        if (userProfile.restaurants && userProfile.restaurants.length > 0) {
          console.log(
            "Available restaurants:",
            userProfile.restaurants
              .map((r: any) => `${r.name} (ID: ${r.id})`)
              .join(", ")
          );
        }

        // Re-initialize conversation context with fresh data
        initializeConversation(true);
      } else {
        console.log("User profile refreshed (no changes detected)");
      }

      return true;
    } catch (error) {
      console.error("Error fetching user profile:", error);
      return false;
    }
  }

  return false; // Profile tool not available
}

// Extract restaurant info from profile text
function extractRestaurantInfo(
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

// Generate tool descriptions for system prompt
function generateToolDescriptions(tools: McpTool[]): string {
  if (!tools || tools.length === 0) {
    return "No tools are currently available.";
  }

  let description = "Available tools:\n\n";

  tools.forEach((tool) => {
    description += `📌 ${tool.name}: ${tool.description || "No description available"}\n`;

    // Add schema information if available
    if (tool.inputSchema) {
      try {
        const schema =
          typeof tool.inputSchema === "string"
            ? JSON.parse(tool.inputSchema)
            : tool.inputSchema;

        if (schema.properties) {
          description += "   Parameters:\n";
          Object.entries(schema.properties).forEach(
            ([paramName, paramInfo]: [string, any]) => {
              const type = paramInfo.type || "any";
              const isRequired =
                schema.required && schema.required.includes(paramName);
              const desc = paramInfo.description || "";

              description += `   - ${paramName} (${type})${isRequired ? " [Required]" : ""}: ${desc}\n`;
            }
          );
        }
      } catch (e) {
        console.error("Error parsing tool schema:", e);
      }
    }

    description += "\n";
  });

  return description;
}

// Modify initializeConversation to include tool descriptions
function initializeConversation(forceReset: boolean = false): void {
  // Only clear history if explicitly requested
  if (forceReset || messageHistory.length === 0) {
    console.log("Initializing a fresh conversation history");

    // Clear existing history if needed
    messageHistory.length = 0;

    // Create system message with user context using our helper function
    const systemContext = generateSystemContext();

    // Add system context as a special user message
    messageHistory.push({
      role: "user",
      content: systemContext,
    });

    // Add assistant's acknowledgment
    messageHistory.push({
      role: "assistant",
      content:
        "I understand. I'll help you manage your restaurants. I can create tables, check restaurant information, and assist with other management tasks.",
    });

    console.log("Conversation initialized with user context");
  } else {
    console.log("Keeping existing conversation history");
  }
}

// Helper function to attempt to fix and retry a failed tool call
async function retryToolCall(
  toolName: string,
  originalArgs: Record<string, unknown>,
  errorMessage: string
): Promise<ToolResult> {
  console.log(`Attempting to retry failed tool call: ${toolName}`);

  // Create modified arguments based on the tool and error
  let fixedArgs = { ...originalArgs };

  // For create-table tool, try to fix common issues
  if (toolName === "create-table") {
    // Try to parse restaurantId from string or extract it from error message
    if (typeof fixedArgs.restaurantId === "string") {
      // Extract numbers from the string
      const matches = String(fixedArgs.restaurantId).match(/\d+/);
      if (matches && matches[0]) {
        fixedArgs.restaurantId = Number(matches[0]);
      }
    }

    // Try to convert capacity to a reasonable number if it's not already
    if (typeof fixedArgs.capacity !== "number") {
      if (typeof fixedArgs.capacity === "string") {
        const matches = String(fixedArgs.capacity).match(/\d+/);
        if (matches && matches[0]) {
          fixedArgs.capacity = Number(matches[0]);
        } else {
          // Default to 4 if no number found
          fixedArgs.capacity = 4;
        }
      } else {
        // Default capacity if missing
        fixedArgs.capacity = 4;
      }
    }

    // Make sure name is a string
    if (!fixedArgs.name || typeof fixedArgs.name !== "string") {
      fixedArgs.name = `Table ${Math.floor(Math.random() * 100)}`;
    }
  }

  // Log the fixed arguments
  console.log(`Retrying tool ${toolName} with fixed args:`, fixedArgs);

  // Try the call again with fixed arguments
  return await callTool(toolName, fixedArgs);
}

// Define interface for tool schema types to match Anthropic expectations
interface InputSchema {
  type: "object";
  properties?: Record<string, any>;
  required?: string[];
  [key: string]: any;
}

// Helper function to clean up conversation history
// This ensures that all tool_result entries have matching tool_use entries
function cleanupConversationHistory() {
  console.log("Cleaning up conversation history...");

  // Create a map of all tool_use IDs in the conversation
  const toolUseIds: Set<string> = new Set();

  // First pass: collect all tool_use IDs
  for (const message of messageHistory) {
    if (message.role === "assistant" && Array.isArray(message.content)) {
      for (const contentItem of message.content) {
        if (contentItem.type === "tool_use" && contentItem.id) {
          toolUseIds.add(contentItem.id);
        }
      }
    }
  }

  // Second pass: filter out tool_result entries with no matching tool_use
  const validMessages: MessageParam[] = [];

  for (const message of messageHistory) {
    // For user messages that contain tool_results, check if they have valid tool_use_id
    if (message.role === "user" && Array.isArray(message.content)) {
      const validContent = [];
      let hasInvalidToolResult = false;

      for (const contentItem of message.content) {
        if (contentItem.type === "tool_result" && contentItem.tool_use_id) {
          // Only keep tool_result if there's a matching tool_use
          if (toolUseIds.has(contentItem.tool_use_id)) {
            validContent.push(contentItem);
          } else {
            hasInvalidToolResult = true;
            console.log(
              `Removing invalid tool_result with ID: ${contentItem.tool_use_id}`
            );
          }
        } else {
          validContent.push(contentItem);
        }
      }

      // If we have at least one valid content item, or it's not a tool result message
      if (validContent.length > 0) {
        validMessages.push({
          role: message.role,
          content:
            validContent.length === 1 && typeof validContent[0] === "string"
              ? validContent[0]
              : validContent,
        });
      } else if (hasInvalidToolResult) {
        // For completely invalid tool result messages, we convert to plain text to maintain context
        validMessages.push({
          role: message.role,
          content:
            "I tried to use a tool but there was an issue with the request.",
        });
      } else {
        // Keep other messages as is
        validMessages.push(message);
      }
    } else {
      // Keep non-user messages or non-tool-result messages as is
      validMessages.push(message);
    }
  }

  // Replace the messageHistory with validated messages
  messageHistory.length = 0;
  validMessages.forEach((msg) => messageHistory.push(msg));

  console.log(
    `Cleaned up conversation history: ${messageHistory.length} messages remaining`
  );
}

// Process user message using Claude
async function processMessageWithClaude(message: string): Promise<string> {
  if (!client) {
    return "Not connected to MCP server. Please connect first.";
  }

  if (!anthropic) {
    // Fall back to simple command processing if Claude is not available
    return await processUserMessage(message);
  }

  // Instead of clearing the messageHistory, we preserve it between requests
  // Only initialize if it's empty (first time)
  if (messageHistory.length === 0) {
    const systemContext = generateSystemContext();
    // Initialize with system message
    messageHistory.push({
      role: "user",
      content: systemContext,
    });

    // Add assistant's acknowledgment
    messageHistory.push({
      role: "assistant",
      content:
        "I understand. I'll help you manage your restaurants. I can create tables, check restaurant information, and assist with other management tasks.",
    });
  }

  // Add user message to history (preserving previous messages)
  messageHistory.push({
    role: "user",
    content: message,
  });

  try {
    console.log("Sending query to Claude...");

    // Convert MCP tools to Claude tool format
    const claudeTools = availableTools.map((tool) => {
      return {
        name: tool.name,
        description: tool.description || "",
        input_schema: tool.inputSchema,
      };
    });

    // Clean up conversation history to ensure valid tool_use/tool_result pairing
    cleanupConversationHistory();

    // Limit history to last 15 messages to avoid token limits
    if (messageHistory.length > 16) {
      // Type-safe way to trim the history while keeping the first message
      const firstMessage = messageHistory[0];
      const recentMessages = messageHistory.slice(-15);

      // Create a new array with the known good types
      const newHistory: MessageParam[] = [];

      // Add the first message if it exists
      if (firstMessage) {
        newHistory.push(firstMessage);
      }

      // Add the recent messages
      recentMessages.forEach((msg) => newHistory.push(msg));

      // Replace the message history
      messageHistory = newHistory;
      console.log("Trimmed conversation history to 16 messages");
    }

    // Initial Claude API call with conversation history
    const response = await anthropic.messages.create({
      model: "claude-3-5-sonnet-20241022",
      max_tokens: 1000,
      messages: messageHistory,
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
        messageHistory.push({
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

        console.log(`Claude is calling tool: ${toolName}`);

        // Add the tool call message to history
        messageHistory.push({
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
          const result = await callTool(toolName, toolArgs);

          // Format tool result for display
          const toolOutput = result.content
            .filter((item) => item.type === "text" && item.text)
            .map((item) => item.text)
            .join("\n");

          // Add the tool output
          finalText.push(toolOutput);

          // Immediately refresh user profile after data-changing operations
          if (toolName === "create-restaurant" || toolName === "create-table") {
            console.log("Updating profile after data change operation...");

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
                  `Profile refresh attempt ${attempts}/${maxAttempts}...`
                );
                const refreshed = await fetchUserProfile();

                if (refreshed) {
                  // Check if the new data includes what we just created
                  if (toolName === "create-restaurant") {
                    const restaurantName = toolArgs.name as string;
                    success =
                      userProfile &&
                      userProfile.restaurants &&
                      userProfile.restaurants.some(
                        (r: any) =>
                          r.name.toLowerCase() === restaurantName.toLowerCase()
                      );

                    if (success) {
                      console.log(
                        `Successfully found new restaurant '${restaurantName}' in profile.`
                      );
                    } else {
                      console.log(
                        `Couldn't find new restaurant '${restaurantName}' in profile yet.`
                      );
                    }
                  } else {
                    // For other operations, just assume the refresh worked
                    success = true;
                  }
                }
              } catch (error) {
                console.error(
                  `Error in profile refresh attempt ${attempts}:`,
                  error
                );
              }
            }

            if (!success && toolName === "create-restaurant") {
              console.log("Could not verify new data, but proceeding anyway.");
            }
          }

          // Add the tool result to conversation history
          messageHistory.push({
            role: "user",
            content: [
              {
                type: "tool_result" as const,
                tool_use_id: toolUseId,
                content: toolOutput,
              },
            ],
          });

          // Get follow-up response from Claude - using the full conversation
          console.log("Getting Claude's response to tool output...");
          const followUpResponse = await anthropic.messages.create({
            model: "claude-3-5-sonnet-20241022",
            max_tokens: 1000,
            messages: messageHistory,
            tools: claudeTools,
          });

          // Extract Claude's text response
          let claudeFollowupText = "";
          for (const followUpContent of followUpResponse.content) {
            if (followUpContent.type === "text") {
              claudeFollowupText += followUpContent.text;
            }
          }

          // Include Claude's follow-up response in the output to make it more conversational
          if (claudeFollowupText.trim()) {
            finalText.push("\n" + claudeFollowupText);
          }

          // Update message history with Claude's response
          messageHistory.push({
            role: "assistant",
            content: claudeFollowupText,
          });
        } catch (error) {
          console.error(`Error calling tool ${toolName}:`, error);
          const errorMessage = `Error calling tool ${toolName}: ${error}`;
          finalText.push(errorMessage);

          // Add the error as regular text message
          messageHistory.push({
            role: "assistant",
            content: errorMessage,
          });
        }
      }
    }

    return finalText.join("\n");
  } catch (error) {
    console.error("Error processing query with Claude:", error);
    return `Failed to process your query: ${error}`;
  }
}

// Helper function to generate the system context message
function generateSystemContext(): string {
  let systemContext =
    "You are a helpful assistant for a restaurant management system. " +
    "You can help users create and manage tables, view restaurant information, and perform other restaurant management tasks.";

  if (userProfile) {
    systemContext += "\n\nUser profile information:\n" + userProfile.text;

    // Add specific context about restaurants for table creation
    if (userProfile.restaurants && userProfile.restaurants.length > 0) {
      systemContext += "\n\nAvailable restaurants for this user:";
      userProfile.restaurants.forEach(
        (restaurant: { id: string; name: string }) => {
          systemContext += `\n- ${restaurant.name} (ID: ${restaurant.id})`;
        }
      );

      // Add guidance for table creation
      systemContext +=
        "\n\nWhen creating tables with the create-table tool, use one of these restaurant IDs. " +
        "If the user mentions a restaurant by name, look up its ID from the list above and use that ID.";
    }
  }

  systemContext +=
    "\n\nMaintain conversation context between messages. Reference previous messages when appropriate. " +
    "When a user asks to perform an action related to restaurant management, use the appropriate tool rather than explaining you can't do it.";

  return systemContext;
}

// Function to process user messages and generate responses (fallback method)
async function processUserMessage(message: string): Promise<string> {
  if (!client) {
    return "Not connected to the MCP server. Please connect first.";
  }

  // Parse the message to determine what action to take
  const parts = message.trim().split(/\s+/);
  const command = parts[0]?.toLowerCase();

  try {
    switch (command) {
      case "connect":
        await connectToServer();
        await fetchServerCapabilities();
        return `Connected to MCP server. Available: ${availableTools.length} tools, ${availablePrompts.length} prompts, ${availableResources.length} resources.`;

      case "disconnect":
        await disconnectFromServer();
        return "Disconnected from MCP server.";

      case "tools":
      case "list-tools":
        await listTools(false);
        return `Available tools:\n${availableTools.map((t) => `- ${t.name}: ${t.description}`).join("\n")}`;

      case "prompts":
      case "list-prompts":
        await listPrompts(false);
        return `Available prompts:\n${availablePrompts.map((p) => `- ${p.name}: ${p.description}`).join("\n")}`;

      case "resources":
      case "list-resources":
        await listResources(false);
        return `Available resources:\n${availableResources.map((r) => `- ${r.name}: ${r.uri}`).join("\n")}`;

      default:
        // Check if the message matches a tool name
        const tool = availableTools.find((t) => t.name === command);
        if (tool && command) {
          // Add null/undefined check for command
          // Extract arguments
          let args = {};
          if (parts.length > 1) {
            try {
              // Try to parse as JSON
              args = JSON.parse(parts.slice(1).join(" "));
            } catch {
              // Not valid JSON, treat as simple string input
              args = { input: parts.slice(1).join(" ") };
            }
          }

          const result = await callTool(command, args);
          return result.content
            .filter((item) => item.type === "text" && item.text)
            .map((item) => item.text)
            .join("\n");
        }

        // If no tool matches, call the help tool if available
        if (availableTools.some((t) => t.name === "help")) {
          const result = await callTool("help", { query: message });
          return result.content
            .filter((item) => item.type === "text" && item.text)
            .map((item) => item.text)
            .join("\n");
        }

        return "I don't understand that command. Try 'tools' to see available tools.";
    }
  } catch (error) {
    console.error("Error processing message:", error);
    return `Error processing your message: ${error}`;
  }
}

// Start the server
const PORT = process.env.PORT || 8080;
app.listen(PORT, () => {
  console.log(`Web interface running on http://localhost:${PORT}`);
  console.log(`Claude integration ${anthropic ? "enabled" : "disabled"}`);
});

// Handle server shutdown
process.on("SIGINT", async () => {
  console.log("Shutting down...");

  if (client && transport) {
    try {
      await disconnectFromServer();
    } catch (error) {
      console.error("Error during shutdown:", error);
    }
  }

  process.exit(0);
});
