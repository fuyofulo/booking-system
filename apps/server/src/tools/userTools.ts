import { z } from "zod";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { CallToolResult } from "@modelcontextprotocol/sdk/types.js";
import { getTokenForSession, getUserIdForSession } from "../auth.js";
import { get } from "../req-helper.js";
import { BACKEND_API_URL } from "../config.js";

/**
 * Register user-related tools with the MCP server
 */
export function registerUserTools(server: McpServer): void {
  // Register get user profile tool
  server.tool(
    "get-user-profile",
    "Fetches the current user's profile information",
    {},
    async (_: {}, context: any): Promise<CallToolResult> => {
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

        // Use the sendNotification function to send progress updates to the client
        const { sendNotification } = context;

        if (sendNotification) {
          await sendNotification({
            method: "notifications/message",
            params: {
              level: "info",
              data: "Fetching your user profile data...",
            },
          });
        }

        // Make the API request to fetch user data
        console.log(`Fetching user profile for User ID: ${userId}`);
        const userUrl = `${BACKEND_API_URL}/user/me`;

        const userData = await get(userUrl, token);

        // Format user data for display
        const { user } = userData;

        if (!user) {
          return {
            content: [
              {
                type: "text",
                text: "Error: Could not retrieve user data from the server",
              },
            ],
            isError: true,
          };
        }

        // Format the response for better readability
        const restaurants = user.restaurants || [];
        const restaurantInfo =
          restaurants.length > 0
            ? restaurants
                .map((entry: any) => {
                  const restaurant = entry.restaurant;
                  const role = entry.role;

                  return `Restaurant: ${restaurant.name}
ID: ${restaurant.id}
Role: ${role.name}
Permissions: ${Object.entries(role)
                    .filter(
                      ([key, value]) => key.startsWith("can") && value === true
                    )
                    .map(([key]) => key.replace("can", ""))
                    .join(", ")}`;
                })
                .join("\n\n")
            : "No restaurants found";

        return {
          content: [
            {
              type: "text",
              text: `User Profile Information:
              
Name: ${user.name}
Email: ${user.email}
ID: ${user.id}

--- Restaurants ---
${restaurantInfo}`,
            },
          ],
        };
      } catch (error) {
        console.error("Error fetching user profile:", error);
        return {
          content: [
            {
              type: "text",
              text: `Failed to fetch user profile: ${error instanceof Error ? error.message : String(error)}`,
            },
          ],
          isError: true,
        };
      }
    }
  );

  // Add more user tools here as needed
}
