import { z } from "zod";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { makeHttpRequest } from "./utils.js";

const BACKEND_BASE_URL = "http://localhost:7000/api/v1";

// Register the tools with the server
export function registerTools(
  server: McpServer,
  authToken: { current: string | null }
) {
  // Tool: Get all users (not specific to any restaurant)
  server.tool("get-users", "Get all users from the database", {}, async () => {
    const url = `${BACKEND_BASE_URL}/general/users`;
    const response = await makeHttpRequest<{ users: any[] }>(
      url,
      "GET",
      {},
      undefined,
      authToken.current
    );

    if (!response?.users?.length) {
      return {
        content: [
          {
            type: "text",
            text: "No users found or failed to fetch users.",
          },
        ],
      };
    }

    return {
      content: [
        {
          type: "text",
          text: JSON.stringify(response.users, null, 2),
        },
      ],
    };
  });

  // Tool: Get users for a specific restaurant
  server.tool("get-restaurant-users", "Get users for a specific restaurant", 
    {
      restaurantID: z.number().min(1, "Restaurant ID must be a positive number")
    },
    async ({ restaurantID }) => {
      const url = `${BACKEND_BASE_URL}/restaurantUser/getAll`;
      const response = await makeHttpRequest<{ users: any[] }>(
        url,
        "POST",
        {},
        {
          data: {
            restaurantId: restaurantID,
          },
        },
        authToken.current
      );

      if (!response) {
        return {
          content: [
            {
              type: "text",
              text: `Failed to fetch users for restaurant with ID ${restaurantID}.`,
            },
          ],
        };
      }

      return {
        content: [
          {
            type: "text",
            text:
              `Users for restaurant with ID ${restaurantID}:\n` +
              JSON.stringify(response.users ?? response, null, 2),
          },
        ],
      };
    }
  );

  server.tool('create-staff', 'adds an already existing user to the restaurant', 
    {
        restaurantId: z.number().min(1),
        userId: z.number().min(1),
        roleId: z.number().min(1),
    },
    async ({restaurantId, userId, roleId}) => { 
      const url = `${BACKEND_BASE_URL}/restaurantUser/create`;
      const response = await makeHttpRequest<{ users: any[] }>(
        url,
        "POST",
        {}, 
        {
          data: {
            restaurantId: restaurantId,
            userId: userId,
            roleId: roleId,
          },
        },
        authToken.current
      );

      if (!response) {
        return {
          content: [
            {
              type: "text",
              text: `Failed to add user to restaurant with ID ${restaurantId}.`,
            },
          ],
        };
      }

      return {
        content: [
          { type: "text", text: `User added to restaurant with ID ${restaurantId}.` },
        ],
      };
    }
  );
  
  return server;
}
