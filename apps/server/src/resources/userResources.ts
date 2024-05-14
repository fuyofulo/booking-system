import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { ReadResourceResult } from "@modelcontextprotocol/sdk/types.js";
import { BACKEND_API_URL } from "../config.js";
import { getUserIdForSession, getTokenForSession } from "../auth.js";
import { get } from "../req-helper.js";

/**
 * Register user-related resources
 */
export function registerUserResources(server: McpServer): void {
  // User data resource
  server.resource(
    "user-data",
    `${BACKEND_API_URL}/user/me`,
    { mimeType: "application/json" },
    async (context: any): Promise<ReadResourceResult> => {
      try {
        // Get session ID from context
        const sessionId = context.sessionId || context.transport?.sessionId;

        if (!sessionId) {
          throw new Error("Could not determine session ID for authentication");
        }

        // Get token for session
        const token = getTokenForSession(sessionId);
        if (!token) {
          throw new Error(
            "Authentication token not found. Please login again."
          );
        }

        // Get user ID (for logging)
        const userId = getUserIdForSession(sessionId);
        console.log(`Fetching user data for User ID: ${userId}`);

        // Fetch user data from backend
        const userUrl = `${BACKEND_API_URL}/user/me`;
        const userData = await get(userUrl, token);

        return {
          contents: [
            {
              uri: `${BACKEND_API_URL}/user/me`,
              text: JSON.stringify(userData),
              mimeType: "application/json",
            },
          ],
        };
      } catch (error) {
        console.error("Error fetching user data:", error);
        throw error;
      }
    }
  );
}
