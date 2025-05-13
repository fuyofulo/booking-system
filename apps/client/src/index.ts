import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { StreamableHTTPClientTransport } from "@modelcontextprotocol/sdk/client/streamableHttp.js";
import { createInterface } from "node:readline";
import {
  ListToolsRequest,
  ListToolsResultSchema,
  CallToolRequest,
  CallToolResultSchema,
  ListPromptsRequest,
  ListPromptsResultSchema,
  GetPromptRequest,
  GetPromptResultSchema,
  ListResourcesRequest,
  ListResourcesResultSchema,
  LoggingMessageNotificationSchema,
  ResourceListChangedNotificationSchema,
} from "@modelcontextprotocol/sdk/types.js";
import { JwtAuthProvider } from "./auth-provider.js";
import { HttpFetcher } from "./http-fetcher.js";

// Create readline interface for user input
const readline = createInterface({
  input: process.stdin,
  output: process.stdout,
});

// Track received notifications for debugging resumability
let notificationCount = 0;

// Global client and transport for interactive commands
let client: Client | null = null;
let transport: StreamableHTTPClientTransport | null = null;
let serverUrl = "http://localhost:3000/mcp";
let notificationsToolLastEventId: string | undefined = undefined;
let sessionId: string | undefined = undefined;
// JWT authentication provider
const authProvider = new JwtAuthProvider();
// HTTP fetcher with authentication
const httpFetcher = new HttpFetcher(authProvider);

// Define interfaces for server resources
interface Tool {
  name: string;
  description: string;
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
let availableTools: Tool[] = [];
let availablePrompts: Prompt[] = [];
let availableResources: Resource[] = [];

// Version of the client
const CLIENT_VERSION = "1.1.0";

async function main(): Promise<void> {
  console.log("MCP Interactive Client");
  console.log("=====================");

  // Check for command-line arguments
  const args = process.argv.slice(2);
  if (args.length > 0) {
    // Check for help or version flags
    if (args[0] === "--version" || args[0] === "-v") {
      console.log(`Version: ${CLIENT_VERSION}`);
      process.exit(0);
    } else if (args[0] === "--help" || args[0] === "-h") {
      printMinimalHelp();
      process.exit(0);
    }

    // First argument can be the JWT token
    const token = args[0];
    if (token) {
      console.log("JWT token provided as command-line argument");
      setAuthToken(token);
      try {
        await connect();

        // If connection successful, fetch available tools
        if (client) {
          await fetchServerCapabilities();
        }
      } catch (error) {
        console.error("Failed to connect with provided token:", error);
        console.log("Please check your token and try again.");
        console.log(
          "You can use 'auth <token>' followed by 'connect' to retry."
        );
      }
    }
  } else {
    // No command-line arguments, use stored token if available
    if (authProvider.getToken()) {
      await connect();

      // If connection successful, fetch available tools
      if (client) {
        await fetchServerCapabilities();
      }
    } else {
      console.log(
        "No authentication token found. Use 'auth <token>' to authenticate."
      );
      console.log("Then use 'connect' to connect to the server.");
      console.log("Or restart with token: npm run dev <jwt-token>");

      // Print minimal help for disconnected state
      printMinimalHelp();
    }
  }

  // Start the command loop
  commandLoop();
}

// Fetch available tools, prompts, and resources from the server
async function fetchServerCapabilities(): Promise<void> {
  console.log("Fetching server capabilities...");

  try {
    // Fetch tools
    await listTools(false); // false means don't print to console

    // Fetch prompts
    await listPrompts(false);

    // Fetch resources
    await listResources(false);

    console.log(
      `Server capabilities fetched: ${availableTools.length} tools, ${availablePrompts.length} prompts, ${availableResources.length} resources`
    );

    // Display available tools
    console.log("\nAvailable tools:");
    if (availableTools.length === 0) {
      console.log("  No tools available");
    } else {
      for (const tool of availableTools) {
        console.log(`  - ${tool.name}: ${tool.description}`);
      }
    }

    // Display available prompts if any
    if (availablePrompts.length > 0) {
      console.log("\nAvailable prompts:");
      for (const prompt of availablePrompts) {
        console.log(`  - ${prompt.name}: ${prompt.description}`);
      }
    }

    // Display available resources if any
    if (availableResources.length > 0) {
      console.log("\nAvailable resources:");
      for (const resource of availableResources) {
        console.log(`  - ${resource.name}: ${resource.uri}`);
      }
    }
  } catch (error) {
    console.error("Error fetching server capabilities:", error);
  }
}

// Print minimal help menu for when not connected
function printMinimalHelp(): void {
  console.log("\nAvailable commands:");
  console.log(
    "  connect [url]              - Connect to MCP server (default: http://localhost:3000/mcp)"
  );
  console.log(
    "  auth [token]               - Set JWT authorization token for requests"
  );
  console.log("  help                       - Show this help");
  console.log("  quit                       - Exit the program");
  console.log("\nCommand line options:");
  console.log("  <jwt-token>                - Connect with specified token");
  console.log("  --version, -v              - Show version information");
  console.log("  --help, -h                 - Show this help");
}

// Print full help with available tools
function printHelp(): void {
  console.log("\nAvailable commands:");
  console.log(
    "  connect [url]              - Connect to MCP server (default: http://localhost:3000/mcp)"
  );
  console.log("  disconnect                 - Disconnect from server");
  console.log("  terminate-session          - Terminate the current session");
  console.log("  reconnect                  - Reconnect to the server");
  console.log(
    "  auth [token]               - Set JWT authorization token for requests"
  );
  console.log("  list-tools                 - List available tools");
  console.log(
    "  call-tool <name> [args]    - Call a tool with optional JSON arguments"
  );

  // Only show tool-specific commands if connected and tools are available
  if (client && availableTools.length > 0) {
    const toolNames = availableTools.map((t) => t.name);

    // Only show specific tool commands if those tools exist
    if (toolNames.includes("greet")) {
      console.log("  greet [name]               - Call the greet tool");
    }

    if (toolNames.includes("multi-greet")) {
      console.log(
        "  multi-greet [name]         - Call the multi-greet tool with notifications"
      );
    }

    if (toolNames.includes("start-notification-stream")) {
      console.log(
        "  start-notifications [interval] [count] - Start periodic notifications"
      );
    }
  }

  console.log("  list-prompts               - List available prompts");
  console.log(
    "  get-prompt [name] [args]   - Get a prompt with optional JSON arguments"
  );
  console.log("  list-resources             - List available resources");
  console.log("  help                       - Show this help");
  console.log("  quit                       - Exit the program");
}

function commandLoop(): void {
  readline.question("\n> ", async (input) => {
    const args = input.trim().split(/\s+/);
    const command = args[0]?.toLowerCase();

    try {
      switch (command) {
        case "connect":
          await connect(args[1]);
          if (client) {
            await fetchServerCapabilities();
            // Don't show full help after connecting
          }
          break;

        case "disconnect":
          await disconnect();
          // Clear available tools, prompts, and resources
          availableTools = [];
          availablePrompts = [];
          availableResources = [];
          break;

        case "terminate-session":
          await terminateSession();
          availableTools = [];
          availablePrompts = [];
          availableResources = [];
          break;

        case "reconnect":
          await reconnect();
          if (client) {
            await fetchServerCapabilities();
            // Don't show full help after reconnecting
          }
          break;

        case "auth":
          if (args.length < 2) {
            console.log(
              "Current auth token: " +
                (authProvider.getToken()
                  ? `${authProvider.getToken()!.substring(0, 10)}...`
                  : "Not set")
            );
            console.log(
              "Usage: auth <token> - Set a new JWT authorization token"
            );
          } else {
            setAuthToken(args[1]!);
          }
          break;

        case "list-tools":
          await listTools(true); // true means print to console
          break;

        case "call-tool":
          if (args.length < 2) {
            console.log("Usage: call-tool <name> [args]");
          } else {
            const toolName = args[1];
            let toolArgs = {};
            if (args.length > 2) {
              try {
                toolArgs = JSON.parse(args.slice(2).join(" "));
              } catch {
                console.log("Invalid JSON arguments. Using empty args.");
              }
            }
            await callTool(toolName!, toolArgs);
          }
          break;

        case "greet":
          // Check if tool exists before calling
          if (client && availableTools.some((t) => t.name === "greet")) {
            await callGreetTool(args[1] || "MCP User");
          } else {
            console.log("Tool 'greet' is not available on this server.");
          }
          break;

        case "multi-greet":
          // Check if tool exists before calling
          if (client && availableTools.some((t) => t.name === "multi-greet")) {
            await callMultiGreetTool(args[1] || "MCP User");
          } else {
            console.log("Tool 'multi-greet' is not available on this server.");
          }
          break;

        case "start-notifications": {
          // Check if tool exists before calling
          if (
            client &&
            availableTools.some((t) => t.name === "start-notification-stream")
          ) {
            const interval = args[1] ? parseInt(args[1], 10) : 2000;
            const count = args[2] ? parseInt(args[2], 10) : 10;
            await startNotifications(interval, count);
          } else {
            console.log(
              "Tool 'start-notification-stream' is not available on this server."
            );
          }
          break;
        }

        case "list-prompts":
          await listPrompts(true); // true means print to console
          break;

        case "get-prompt":
          if (args.length < 2) {
            console.log("Usage: get-prompt <name> [args]");
          } else {
            const promptName = args[1];
            let promptArgs = {};
            if (args.length > 2) {
              try {
                promptArgs = JSON.parse(args.slice(2).join(" "));
              } catch {
                console.log("Invalid JSON arguments. Using empty args.");
              }
            }
            await getPrompt(promptName!, promptArgs);
          }
          break;

        case "list-resources":
          await listResources(true); // true means print to console
          break;

        case "help":
          if (client) {
            printHelp();
          } else {
            printMinimalHelp();
          }
          break;

        case "quit":
        case "exit":
          await cleanup();
          return;

        default:
          // Check if command matches any available tool name
          if (
            command &&
            client &&
            availableTools.some((t) => t.name === command)
          ) {
            // This is a direct tool call by name
            let toolArgs = {};
            if (args.length > 1) {
              try {
                // Try to parse remaining args as JSON
                toolArgs = JSON.parse(args.slice(1).join(" "));
              } catch {
                // If not valid JSON, treat as a simple string argument
                toolArgs = { input: args.slice(1).join(" ") };
              }
            }
            await callTool(command, toolArgs);
          } else if (command) {
            console.log(`Unknown command: ${command}`);
          }
          break;
      }
    } catch (error) {
      console.error(`Error executing command: ${error}`);
    }

    // Continue the command loop
    commandLoop();
  });
}

async function connect(url?: string): Promise<void> {
  if (client) {
    console.log("Already connected. Disconnect first.");
    return;
  }

  if (url) {
    serverUrl = url;
  }

  console.log(`Connecting to ${serverUrl}...`);

  // Check if auth token is available
  if (!authProvider.getToken()) {
    console.log("Warning: No authentication token set. Connection may fail.");
    console.log("Use 'auth <token>' to set your authentication token first.");
  }

  try {
    // Create a new client
    client = new Client({
      name: "example-client",
      version: "1.0.0",
    });
    client.onerror = (error) => {
      console.error("\x1b[31mClient error:", error, "\x1b[0m");
    };

    // Create transport with our custom authentication headers
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
          `\nNotification #${notificationCount}: ${notification.params.level} - ${notification.params.data}`
        );
        // Re-display the prompt
        process.stdout.write("> ");
      }
    );

    client.setNotificationHandler(
      ResourceListChangedNotificationSchema,
      async (_) => {
        console.log(`\nResource list changed notification received!`);
        try {
          if (!client) {
            console.log("Client disconnected, cannot fetch resources");
            return;
          }
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
        } catch {
          console.log("Failed to list resources after change notification");
        }
        // Re-display the prompt
        process.stdout.write("> ");
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
      console.log(
        "Use 'auth <token>' to set your authentication token, then try reconnecting"
      );
    } else {
      console.error("Failed to connect:", error);
    }
    client = null;
    transport = null;
  }
}

function setAuthToken(token: string): void {
  authProvider.setToken(token);
  console.log(`Authorization token set: ${token.substring(0, 10)}...`);

  // Update the token in the existing transport if connected
  if (transport) {
    console.log(
      "To use the new token with an active connection, please reconnect to the server."
    );
  }
}

async function disconnect(): Promise<void> {
  if (!client || !transport) {
    console.log("Not connected.");
    return;
  }

  try {
    await transport.close();
    console.log("Disconnected from MCP server");
    client = null;
    transport = null;
  } catch (error) {
    console.error("Error disconnecting:", error);
  }
}

async function terminateSession(): Promise<void> {
  if (!client || !transport) {
    console.log("Not connected.");
    return;
  }

  try {
    console.log("Terminating session with ID:", transport.sessionId);
    await transport.terminateSession();
    console.log("Session terminated successfully");

    // Check if sessionId was cleared after termination
    if (!transport.sessionId) {
      console.log("Session ID has been cleared");
      sessionId = undefined;

      // Also close the transport and clear client objects
      await transport.close();
      console.log("Transport closed after session termination");
      client = null;
      transport = null;
    } else {
      console.log(
        "Server responded with 405 Method Not Allowed (session termination not supported)"
      );
      console.log("Session ID is still active:", transport.sessionId);
    }
  } catch (error) {
    console.error("Error terminating session:", error);
  }
}

async function reconnect(): Promise<void> {
  if (client) {
    await disconnect();
  }
  await connect();
}

async function listTools(printToConsole: boolean = true): Promise<void> {
  if (!client) {
    console.log("Not connected to server.");
    return;
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

    // Update the global tools list
    availableTools = toolsResult.tools.map((tool) => ({
      name: tool.name,
      description: tool.description || "", // Handle potentially undefined descriptions
    }));

    if (printToConsole) {
      console.log("Available tools:");
      if (availableTools.length === 0) {
        console.log("  No tools available");
      } else {
        for (const tool of availableTools) {
          console.log(`  - ${tool.name}: ${tool.description}`);
        }
      }
    }
  } catch (error) {
    console.log(`Tools not supported by this server (${error})`);
    availableTools = [];
  }
}

async function callTool(
  name: string,
  args: Record<string, unknown>
): Promise<void> {
  if (!client) {
    console.log("Not connected to server.");
    return;
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
    const onLastEventIdUpdate = (event: string) => {
      notificationsToolLastEventId = event;
    };
    const result = await client.request(request, CallToolResultSchema, {
      resumptionToken: notificationsToolLastEventId,
      onresumptiontoken: onLastEventIdUpdate,
    });

    console.log("Tool result:");
    result.content.forEach((item) => {
      if (item.type === "text") {
        console.log(`  ${item.text}`);
      } else {
        console.log(`  ${item.type} content:`, item);
      }
    });
  } catch (error) {
    console.log(`Error calling tool ${name}: ${error}`);
  }
}

async function callGreetTool(name: string): Promise<void> {
  await callTool("greet", { name });
}

async function callMultiGreetTool(name: string): Promise<void> {
  console.log("Calling multi-greet tool with notifications...");
  await callTool("multi-greet", { name });
}

async function startNotifications(
  interval: number,
  count: number
): Promise<void> {
  console.log(
    `Starting notification stream: interval=${interval}ms, count=${count || "unlimited"}`
  );
  await callTool("start-notification-stream", { interval, count });
}

async function listPrompts(printToConsole: boolean = true): Promise<void> {
  if (!client) {
    console.log("Not connected to server.");
    return;
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
      description: prompt.description || "", // Handle potentially undefined descriptions
    }));

    if (printToConsole) {
      console.log("Available prompts:");
      if (availablePrompts.length === 0) {
        console.log("  No prompts available");
      } else {
        for (const prompt of availablePrompts) {
          console.log(`  - ${prompt.name}: ${prompt.description}`);
        }
      }
    }
  } catch (error) {
    console.log(`Prompts not supported by this server (${error})`);
    availablePrompts = [];
  }
}

async function getPrompt(
  name: string,
  args: Record<string, unknown>
): Promise<void> {
  if (!client) {
    console.log("Not connected to server.");
    return;
  }

  try {
    const promptRequest: GetPromptRequest = {
      method: "prompts/get",
      params: {
        name,
        arguments: args as Record<string, string>,
      },
    };

    const promptResult = await client.request(
      promptRequest,
      GetPromptResultSchema
    );
    console.log("Prompt template:");
    promptResult.messages.forEach((msg, index) => {
      console.log(`  [${index + 1}] ${msg.role}: ${msg.content.text}`);
    });
  } catch (error) {
    console.log(`Error getting prompt ${name}: ${error}`);
  }
}

async function listResources(printToConsole: boolean = true): Promise<void> {
  if (!client) {
    console.log("Not connected to server.");
    return;
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
      console.log("Available resources:");
      if (availableResources.length === 0) {
        console.log("  No resources available");
      } else {
        for (const resource of availableResources) {
          console.log(`  - ${resource.name}: ${resource.uri}`);
        }
      }
    }
  } catch (error) {
    console.log(`Resources not supported by this server (${error})`);
    availableResources = [];
  }
}

async function cleanup(): Promise<void> {
  if (client && transport) {
    try {
      // First try to terminate the session gracefully
      if (transport.sessionId) {
        try {
          console.log("Terminating session before exit...");
          await transport.terminateSession();
          console.log("Session terminated successfully");
        } catch (error) {
          console.error("Error terminating session:", error);
        }
      }

      // Then close the transport
      await transport.close();
    } catch (error) {
      console.error("Error closing transport:", error);
    }
  }

  process.stdin.setRawMode(false);
  readline.close();
  console.log("\nGoodbye!");
  process.exit(0);
}

// Set up raw mode for keyboard input to capture Escape key
process.stdin.setRawMode(true);
process.stdin.on("data", async (data) => {
  // Check for Escape key (27)
  if (data.length === 1 && data[0] === 27) {
    console.log("\nESC key pressed. Disconnecting from server...");

    // Abort current operation and disconnect from server
    if (client && transport) {
      await disconnect();
      console.log("Disconnected. Press Enter to continue.");
    } else {
      console.log("Not connected to server.");
    }

    // Re-display the prompt
    process.stdout.write("> ");
  }
});

// Handle Ctrl+C
process.on("SIGINT", async () => {
  console.log("\nReceived SIGINT. Cleaning up...");
  await cleanup();
});

// Start the interactive client
main().catch((error: unknown) => {
  console.error("Error running MCP client:", error);
  process.exit(1);
});
