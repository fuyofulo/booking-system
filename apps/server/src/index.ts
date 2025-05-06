import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { z } from "zod";

const BACKEND_BASE_URL = "http://localhost:7000/api/v1";

let authToken: string | null = null;

// Generic HTTP request helper
async function makeHttpRequest<T>(
  url: string,
  method: "GET" | "POST" | "PUT" | "DELETE" | "PATCH" = "GET",
  headers: Record<string, string> = {},
  body?: any
): Promise<T | null> {
  try {
    const finalHeaders: Record<string, string> = {
      "Content-Type": "application/json",
      ...headers,
    };

    if (authToken) {
      finalHeaders["Authorization"] = `${authToken}`;
    }

    const options: RequestInit = {
      method,
      headers: finalHeaders,
    };

    if (body) {
      options.body = JSON.stringify(body);
    }

    const response = await fetch(url, options);

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    return (await response.json()) as T;
  } catch (error) {
    console.error(`Error making ${method} request to ${url}:`, error);
    return null;
  }
}

// Create server instance
const server = new McpServer({
  name: "restaurant",
  version: "1.0.0",
});

// Authentication tool to receive token from client
server.tool(
  "authenticate",
  "Authenticate with a JWT token",
  {
    token: z.string().describe("JWT token for authentication"),
  },
  async ({ token }) => {
    authToken = token;
    console.log("Authenticated with token:", authToken);

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


// Register get-users tool
server.tool("get-users", "Get all users from the database", {}, async () => {
  try {
    const usersUrl = `${BACKEND_BASE_URL}/general/users`;
    const response = await makeHttpRequest<{ users: any[] }>(usersUrl);

    if (!response) {
      return {
        content: [
          {
            type: "text",
            text: "Failed to retrieve users from the database. The server might be down or the request failed.",
          },
        ],
      };
    }

    if (!response.users || response.users.length === 0) {
      return {
        content: [
          {
            type: "text",
            text: "No users found in the database",
          },
        ],
      };
    }

    return {
      content: [
        {
          type: "text",
          text: JSON.stringify(response.users),
        },
      ],
    };
  } catch (error: any) {
    return {
      content: [
        {
          type: "text",
          text: `An error occurred while fetching users: ${error.message}`,
        },
      ],
    };
  }
});

// Register create-restaurant tool
server.tool(
  "create-restaurant",
  "Create a new restaurant",
  {
    name: z.string().describe("Name of the restaurant"),
  },
  async ({ name }) => {
    try {
      const response = await makeHttpRequest<{ message: string }>(
        `${BACKEND_BASE_URL}/restaurant/create`,
        "POST",
        {},
        { name }
      );

      if (!response) {
        return {
          content: [
            {
              type: "text",
              text: "Failed to create restaurant. The server might be down or the request failed.",
            },
          ],
        };
      }

      return {
        content: [
          {
            type: "text",
            text: `Restaurant "${name}" created successfully!`,
          },
        ],
      };
    } catch (error: any) {
      return {
        content: [
          {
            type: "text",
            text: `An error occurred while creating the restaurant: ${error.message}`,
          },
        ],
      };
    }
  }
);

async function main() {
  console.log("Starting MCP server...");
  const transport = new StdioServerTransport();
  await server.connect(transport);
  console.log("MCP Server is now running");
}

main();