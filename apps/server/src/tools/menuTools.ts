import { z } from "zod";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { CallToolResult } from "@modelcontextprotocol/sdk/types.js";
import { getTokenForSession } from "../auth.js";
import { get, post } from "../req-helper.js";
import { BACKEND_API_URL } from "../config.js";
import {
  CreateMenuSchema,
  CreateDishSchema,
  UpdateMenuSchema,
  UpdateDishSchema,
} from "@repo/schemas/types";

/**
 * Available Menu Tools:
 * - create-menu: Creates a new menu for a restaurant
 * - update-menu: Updates an existing menu
 * - create-dish: Creates a new dish in a menu
 * - update-dish: Updates an existing dish
 * - get-restaurant-menus: Fetches all menus for a restaurant
 * - get-menu-dishes: Fetches all dishes for a specific menu
 *
 * Register menu management tools with the MCP server
 */
export function registerMenuTools(server: McpServer): void {
  // Register create menu tool
  server.tool(
    "create-menu",
    "Creates a new menu for a restaurant",
    CreateMenuSchema.shape,
    async (
      params: {
        name: string;
        description?: string;
        restaurantId: number;
        imageUrl?: string;
      },
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
              data: "Creating new menu...",
            },
          });
        }

        // Make the API request to create a new menu
        console.log(
          `Creating menu ${params.name} for restaurant ${params.restaurantId}`
        );
        const createUrl = `${BACKEND_API_URL}/menu/create`;

        const result = await post(createUrl, token, params);

        if (result.message === "Menu created successfully") {
          return {
            content: [
              {
                type: "text",
                text: `Successfully created menu "${params.name}" with ID: ${result.data.id}`,
              },
            ],
          };
        } else {
          return {
            content: [
              {
                type: "text",
                text: `Failed to create menu: ${result.message}`,
              },
            ],
            isError: true,
          };
        }
      } catch (error) {
        console.error("Error creating menu:", error);
        return {
          content: [
            {
              type: "text",
              text: `Failed to create menu: ${error instanceof Error ? error.message : String(error)}`,
            },
          ],
          isError: true,
        };
      }
    }
  );

  // Register update menu tool
  server.tool(
    "update-menu",
    "Updates an existing menu",
    UpdateMenuSchema.shape,
    async (
      params: {
        menuId: number;
        name: string;
        description?: string;
        restaurantId: number;
        imageUrl?: string;
      },
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
              data: "Updating menu...",
            },
          });
        }

        // Make the API request to update the menu
        console.log(
          `Updating menu ${params.menuId} in restaurant ${params.restaurantId}`
        );
        const updateUrl = `${BACKEND_API_URL}/menu/update-menu`;

        const result = await post(updateUrl, token, params);

        if (result.message === "Menu updated successfully") {
          return {
            content: [
              {
                type: "text",
                text: `Successfully updated menu "${params.name}" (ID: ${params.menuId})`,
              },
            ],
          };
        } else {
          return {
            content: [
              {
                type: "text",
                text: `Failed to update menu: ${result.message}`,
              },
            ],
            isError: true,
          };
        }
      } catch (error) {
        console.error("Error updating menu:", error);
        return {
          content: [
            {
              type: "text",
              text: `Failed to update menu: ${error instanceof Error ? error.message : String(error)}`,
            },
          ],
          isError: true,
        };
      }
    }
  );

  // Register create dish tool
  server.tool(
    "create-dish",
    "Creates a new dish in a menu",
    CreateDishSchema.shape,
    async (
      params: {
        name: string;
        description?: string;
        price: number;
        imageUrl?: string;
        isAvailable?: boolean;
        calories?: number;
        isVegetarian?: boolean;
        menuId: number;
        restaurantId: number;
      },
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
              data: "Creating new dish...",
            },
          });
        }

        // Make the API request to create a new dish
        console.log(`Creating dish ${params.name} for menu ${params.menuId}`);
        const createUrl = `${BACKEND_API_URL}/menu/dish/create`;

        const result = await post(createUrl, token, params);

        if (result.message === "Dish created successfully") {
          return {
            content: [
              {
                type: "text",
                text: `Successfully created dish "${params.name}" with ID: ${result.data.id}`,
              },
            ],
          };
        } else {
          return {
            content: [
              {
                type: "text",
                text: `Failed to create dish: ${result.message}`,
              },
            ],
            isError: true,
          };
        }
      } catch (error) {
        console.error("Error creating dish:", error);
        return {
          content: [
            {
              type: "text",
              text: `Failed to create dish: ${error instanceof Error ? error.message : String(error)}`,
            },
          ],
          isError: true,
        };
      }
    }
  );

  // Register update dish tool
  server.tool(
    "update-dish",
    "Updates an existing dish",
    UpdateDishSchema.shape,
    async (
      params: {
        dishId: number;
        name: string;
        description?: string;
        price: number;
        imageUrl?: string;
        isAvailable: boolean;
        calories?: number;
        isVegetarian: boolean;
        menuId: number;
        restaurantId: number;
      },
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
              data: "Updating dish...",
            },
          });
        }

        // Make the API request to update the dish
        console.log(`Updating dish ${params.dishId} in menu ${params.menuId}`);
        const updateUrl = `${BACKEND_API_URL}/menu/update-dish`;

        const result = await post(updateUrl, token, params);

        if (result.message === "Dish updated successfully") {
          return {
            content: [
              {
                type: "text",
                text: `Successfully updated dish "${params.name}" (ID: ${params.dishId})`,
              },
            ],
          };
        } else {
          return {
            content: [
              {
                type: "text",
                text: `Failed to update dish: ${result.message}`,
              },
            ],
            isError: true,
          };
        }
      } catch (error) {
        console.error("Error updating dish:", error);
        return {
          content: [
            {
              type: "text",
              text: `Failed to update dish: ${error instanceof Error ? error.message : String(error)}`,
            },
          ],
          isError: true,
        };
      }
    }
  );

  // Register get all menus tool
  server.tool(
    "get-restaurant-menus",
    "Fetches all menus for a restaurant",
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

        // Use the sendNotification function to send progress updates to the client
        const { sendNotification } = context;
        if (sendNotification) {
          await sendNotification({
            method: "notifications/message",
            params: {
              level: "info",
              data: "Fetching restaurant menus...",
            },
          });
        }

        // Make the API request to get all menus for a restaurant
        console.log(`Fetching all menus for restaurant ${restaurantId}`);
        const getMenusUrl = `${BACKEND_API_URL}/menu/getMenus?restaurantId=${restaurantId}`;

        const result = await get(getMenusUrl, token);

        if (!result.data || result.data.length === 0) {
          return {
            content: [
              {
                type: "text",
                text: "No menus found for this restaurant.",
              },
            ],
          };
        }

        // Format menu data for display
        const formattedMenus = result.data
          .map((menu: any) => {
            return `- ${menu.name} (ID: ${menu.id})
  ${menu.description || "No description provided"}`;
          })
          .join("\n\n");

        return {
          content: [
            {
              type: "text",
              text: `Restaurant Menus (${result.data.length} total):\n\n${formattedMenus}`,
            },
          ],
        };
      } catch (error) {
        console.error("Error fetching restaurant menus:", error);
        return {
          content: [
            {
              type: "text",
              text: `Failed to fetch restaurant menus: ${error instanceof Error ? error.message : String(error)}`,
            },
          ],
          isError: true,
        };
      }
    }
  );

  // Register get all dishes tool
  server.tool(
    "get-menu-dishes",
    "Fetches all dishes for a specific menu",
    {
      restaurantId: z.number().int().positive(),
      menuId: z.number().int().positive(),
    },
    async (
      { restaurantId, menuId }: { restaurantId: number; menuId: number },
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
              data: "Fetching menu dishes...",
            },
          });
        }

        // Make the API request to get all dishes for a menu
        console.log(
          `Fetching all dishes for menu ${menuId} in restaurant ${restaurantId}`
        );
        const getDishesUrl = `${BACKEND_API_URL}/menu/getDishes?restaurantId=${restaurantId}&menuId=${menuId}`;

        const result = await get(getDishesUrl, token);

        if (!result.data || result.data.length === 0) {
          return {
            content: [
              {
                type: "text",
                text: "No dishes found for this menu.",
              },
            ],
          };
        }

        // Format dish data for display
        const formattedDishes = result.data
          .map((dish: any) => {
            return `- ${dish.name} (ID: ${dish.id})
  Price: $${dish.price.toFixed(2)}
  ${dish.description || "No description provided"}
  Available: ${dish.isAvailable ? "Yes" : "No"}
  Vegetarian: ${dish.isVegetarian ? "Yes" : "No"}
  ${dish.calories ? `Calories: ${dish.calories}` : ""}`;
          })
          .join("\n\n");

        return {
          content: [
            {
              type: "text",
              text: `Menu Dishes (${result.data.length} total):\n\n${formattedDishes}`,
            },
          ],
        };
      } catch (error) {
        console.error("Error fetching menu dishes:", error);
        return {
          content: [
            {
              type: "text",
              text: `Failed to fetch menu dishes: ${error instanceof Error ? error.message : String(error)}`,
            },
          ],
          isError: true,
        };
      }
    }
  );
}
