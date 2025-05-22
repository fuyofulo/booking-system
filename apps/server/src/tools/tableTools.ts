import { z } from "zod";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { CallToolResult } from "@modelcontextprotocol/sdk/types.js";
import { getTokenForSession, getUserIdForSession } from "../auth.js";
import { del, get, post, put } from "../req-helper.js";
import { BACKEND_API_URL } from "../config.js";
import { CreateTableSchema } from "@repo/schemas/types";

/**
 * Available Table Tools:
 * - create-table: Creates a new table in a restaurant
 * - get-restaurant-tables: Fetches all tables for a restaurant
 * - get-table-details: Fetches details for a specific table
 * - update-table: Updates an existing table's details
 * - delete-table: Deletes a table from a restaurant
 *
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

  // Register get-restaurant-tables tool
  server.tool(
    "get-restaurant-tables",
    "Fetches all tables for a specific restaurant",
    {
      restaurantId: z.number().int().positive(),
    },
    async (
      { restaurantId }: { restaurantId: number },
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

        // Use sendNotification if available
        const { sendNotification } = context;
        if (sendNotification) {
          await sendNotification({
            method: "notifications/message",
            params: {
              level: "info",
              data: `Fetching tables for restaurant ID: ${restaurantId}...`,
            },
          });
        }

        // Make the API request to get all tables
        console.log(`Fetching tables for restaurant ID: ${restaurantId}`);
        const tablesUrl = `${BACKEND_API_URL}/tables?restaurantId=${restaurantId}`;

        const result = await get(tablesUrl, token);

        if (!result.tables || result.tables.length === 0) {
          return {
            content: [
              {
                type: "text",
                text: "No tables found for this restaurant.",
              },
            ],
          };
        }

        // Format tables data for display
        const formattedTables = result.tables
          .map((table: any) => {
            return `- ${table.name} (ID: ${table.id})
  Capacity: ${table.capacity} people`;
          })
          .join("\n\n");

        return {
          content: [
            {
              type: "text",
              text: `Restaurant Tables (${result.tables.length} total):\n\n${formattedTables}`,
            },
          ],
        };
      } catch (error) {
        console.error("Error fetching restaurant tables:", error);
        return {
          content: [
            {
              type: "text",
              text: `Failed to fetch restaurant tables: ${error instanceof Error ? error.message : String(error)}`,
            },
          ],
          isError: true,
        };
      }
    }
  );

  // Register get-table-details tool
  server.tool(
    "get-table-details",
    "Fetches details for a specific table by ID",
    {
      tableId: z.number().int().positive(),
    },
    async (
      { tableId }: { tableId: number },
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

        // Use sendNotification if available
        const { sendNotification } = context;
        if (sendNotification) {
          await sendNotification({
            method: "notifications/message",
            params: {
              level: "info",
              data: `Fetching details for table ID: ${tableId}...`,
            },
          });
        }

        // Make the API request to get table details
        console.log(`Fetching details for table ID: ${tableId}`);
        const tableUrl = `${BACKEND_API_URL}/tables/${tableId}`;

        const result = await get(tableUrl, token);

        if (!result.table) {
          return {
            content: [
              {
                type: "text",
                text: "Table not found.",
              },
            ],
            isError: true,
          };
        }

        const table = result.table;
        return {
          content: [
            {
              type: "text",
              text: `Table Details:
              
- Name: ${table.name}
- ID: ${table.id}
- Capacity: ${table.capacity} people
- Restaurant ID: ${table.restaurantId}`,
            },
          ],
        };
      } catch (error) {
        console.error("Error fetching table details:", error);
        return {
          content: [
            {
              type: "text",
              text: `Failed to fetch table details: ${error instanceof Error ? error.message : String(error)}`,
            },
          ],
          isError: true,
        };
      }
    }
  );

  // Register update-table tool
  server.tool(
    "update-table",
    "Updates an existing table's details",
    {
      tableId: z.number().int().positive(),
      name: z.string().min(1),
      capacity: z.number().int().positive(),
    },
    async (
      {
        tableId,
        name,
        capacity,
      }: { tableId: number; name: string; capacity: number },
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

        // Use sendNotification if available
        const { sendNotification } = context;
        if (sendNotification) {
          await sendNotification({
            method: "notifications/message",
            params: {
              level: "info",
              data: `Updating table ID: ${tableId}...`,
            },
          });
        }

        // Make the API request to update the table
        console.log(`Updating table ID: ${tableId}`);
        const updateTableUrl = `${BACKEND_API_URL}/tables/${tableId}`;

        const result = await put(updateTableUrl, token, {
          name,
          capacity,
        });

        if (result.message === "Table updated successfully" && result.table) {
          return {
            content: [
              {
                type: "text",
                text: `Table updated successfully!
                
Updated Table Details:
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
                text: `Table update response: ${result.message || "Unknown status"}`,
              },
            ],
            isError: true,
          };
        }
      } catch (error) {
        console.error("Error updating table:", error);
        return {
          content: [
            {
              type: "text",
              text: `Failed to update table: ${error instanceof Error ? error.message : String(error)}`,
            },
          ],
          isError: true,
        };
      }
    }
  );

  // Register delete-table tool
  server.tool(
    "delete-table",
    "Deletes a table from a restaurant",
    {
      tableId: z.number().int().positive(),
    },
    async (
      { tableId }: { tableId: number },
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

        // Use sendNotification if available
        const { sendNotification } = context;
        if (sendNotification) {
          await sendNotification({
            method: "notifications/message",
            params: {
              level: "info",
              data: `Deleting table ID: ${tableId}...`,
            },
          });
        }

        // Make the API request to delete the table
        console.log(`Deleting table ID: ${tableId}`);
        const deleteTableUrl = `${BACKEND_API_URL}/tables/${tableId}`;

        const result = await del(deleteTableUrl, token);

        if (result.message === "Table deleted successfully") {
          return {
            content: [
              {
                type: "text",
                text: `Table with ID ${tableId} has been successfully deleted.`,
              },
            ],
          };
        } else {
          return {
            content: [
              {
                type: "text",
                text: `Table deletion response: ${result.message || "Unknown status"}`,
              },
            ],
            isError: true,
          };
        }
      } catch (error) {
        console.error("Error deleting table:", error);
        return {
          content: [
            {
              type: "text",
              text: `Failed to delete table: ${error instanceof Error ? error.message : String(error)}`,
            },
          ],
          isError: true,
        };
      }
    }
  );
}
