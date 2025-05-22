import { z } from "zod";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { CallToolResult } from "@modelcontextprotocol/sdk/types.js";
import { getTokenForSession } from "../auth.js";
import { get, post } from "../req-helper.js";
import { BACKEND_API_URL } from "../config.js";
import { CreateRestaurantUserSchema } from "@repo/schemas/types";

/**
 * Available Staff Tools:
 * - create-restaurant-user: Adds a user to a restaurant with a specific role
 * - get-restaurant-users: Fetches all users for a specific restaurant
 *
 * Register staff management tools with the MCP server
 */
export function registerStaffTools(server: McpServer): void {
  // Register create restaurant user tool
  server.tool(
    "create-restaurant-user",
    "Adds a user to a restaurant with a specific role",
    CreateRestaurantUserSchema.shape,
    async (
      {
        email,
        restaurantId,
        roleId,
      }: { email: string; restaurantId: number; roleId: number },
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

        // Use the sendNotification function to send progress updates to the client
        const { sendNotification } = context;
        if (sendNotification) {
          await sendNotification({
            method: "notifications/message",
            params: {
              level: "info",
              data: "Adding user to restaurant...",
            },
          });
        }

        // Make the API request to add user to restaurant
        console.log(
          `Adding user with email ${email} to restaurant ${restaurantId} with role ${roleId}`
        );
        const createUrl = `${BACKEND_API_URL}/restaurantUser/create`;

        const result = await post(createUrl, token, {
          email,
          restaurantId,
          roleId,
        });

        if (result.message === "User added to restaurant successfully") {
          return {
            content: [
              {
                type: "text",
                text: `Successfully added user ${email} to restaurant with ID: ${restaurantId}`,
              },
            ],
          };
        } else {
          return {
            content: [
              {
                type: "text",
                text: `Failed to add user: ${result.message}`,
              },
            ],
            isError: true,
          };
        }
      } catch (error) {
        console.error("Error adding user to restaurant:", error);
        return {
          content: [
            {
              type: "text",
              text: `Failed to add user to restaurant: ${error instanceof Error ? error.message : String(error)}`,
            },
          ],
          isError: true,
        };
      }
    }
  );

  // Register get all restaurant users tool
  server.tool(
    "get-restaurant-users",
    "Fetches all users for a specific restaurant",
    {
      restaurantId: z.number(),
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

        // Use the sendNotification function to send progress updates to the client
        const { sendNotification } = context;
        if (sendNotification) {
          await sendNotification({
            method: "notifications/message",
            params: {
              level: "info",
              data: "Fetching restaurant staff members...",
            },
          });
        }

        // Make the API request to get all users for a restaurant
        console.log(`Fetching all users for restaurant ${restaurantId}`);
        const getUsersUrl = `${BACKEND_API_URL}/restaurantUser/getAll/${restaurantId}`;

        const users = await get(getUsersUrl, token);

        if (!users || users.length === 0) {
          return {
            content: [
              {
                type: "text",
                text: "No users found for this restaurant.",
              },
            ],
          };
        }

        // Format user data for display
        const formattedUsers = users
          .map((user: any) => {
            const userData = user.user;
            const role = user.role;

            const permissions = Object.entries(role)
              .filter(([key, value]) => key.startsWith("can") && value === true)
              .map(([key]) => key.replace("can", ""))
              .join(", ");

            return `- ${userData.name} (${userData.email})
                    ID: ${userData.id}
                    Role: ${role.name}
                    Permissions: ${permissions}`;
          })
          .join("\n\n");

        return {
          content: [
            {
              type: "text",
              text: `Restaurant Staff (${users.length} users):\n\n${formattedUsers}`,
            },
          ],
        };
      } catch (error) {
        console.error("Error fetching restaurant users:", error);
        return {
          content: [
            {
              type: "text",
              text: `Failed to fetch restaurant users: ${error instanceof Error ? error.message : String(error)}`,
            },
          ],
          isError: true,
        };
      }
    }
  );
}
