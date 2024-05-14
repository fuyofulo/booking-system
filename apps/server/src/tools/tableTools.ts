import { z } from "zod";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { CallToolResult } from "@modelcontextprotocol/sdk/types.js";
import { getTokenForSession, getUserIdForSession } from "../auth.js";
import { post } from "../req-helper.js";
import { BACKEND_API_URL } from "../config.js";
import { CreateTableSchema } from "@repo/schemas/types";

/**
 * Register table-related tools with the MCP server
 */
export function registerTableTools(server: McpServer): void {
  // Register create-table tool
  server.tool(
    "create-table",
    "Creates a new table in a restaurant with specified capacity",
    CreateTableSchema.shape,
    async (
      {
        restaurantId,
        name,
        capacity,
      }: { restaurantId: number; name: string; capacity: number },
      context: any
    ): Promise<CallToolResult> => {
      try {
        // Get session ID from context
        const sessionId = context.sessionId || context.transport?.sessionId;

        if (!sessionId) {
          return {
            content: [
              {
                type: "text",
                text: "Error: Could not determine session ID for authentication",
              },
            ],
            isError: true,
          };
        }

        // Get token for session
        const token = getTokenForSession(sessionId);
        if (!token) {
          return {
            content: [
              {
                type: "text",
                text: "Error: Authentication token not found. Please login again.",
              },
            ],
            isError: true,
          };
        }

        // Get user ID for logging
        const userId = getUserIdForSession(sessionId);

        // Use sendNotification if available
        const { sendNotification } = context;

        if (sendNotification) {
          await sendNotification({
            method: "notifications/message",
            params: {
              level: "info",
              data: `Creating table '${name}' with capacity ${capacity} for restaurant ID: ${restaurantId}...`,
            },
          });
        }

        // Make the API request to create the table
        console.log(
          `User ${userId} creating table '${name}' for restaurant ID: ${restaurantId}`
        );
        const tableUrl = `${BACKEND_API_URL}/tables/create`;

        const result = await post(tableUrl, token, {
          restaurantId,
          name,
          capacity,
        });

        // Check if table creation was successful
        if (result.message === "table created successfully" && result.table) {
          return {
            content: [
              {
                type: "text",
                text: `Table created successfully!
                
Table Details:
- Name: ${result.table.name}
- ID: ${result.table.id}
- Capacity: ${result.table.capacity} people
- Restaurant ID: ${result.table.restaurantId}`,
              },
            ],
          };
        } else {
          return {
            content: [
              {
                type: "text",
                text: `Table creation response: ${result.message || "Unknown status"}`,
              },
            ],
            isError: true,
          };
        }
      } catch (error) {
        console.error("Error creating table:", error);
        return {
          content: [
            {
              type: "text",
              text: `Failed to create table: ${error instanceof Error ? error.message : String(error)}`,
            },
          ],
          isError: true,
        };
      }
    }
  );

  // Add more table-related tools here as needed
}
