import { z } from "zod";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { CallToolResult } from "@modelcontextprotocol/sdk/types.js";
import { getTokenForSession } from "../auth.js";
import { get, post } from "../req-helper.js";
import { BACKEND_API_URL } from "../config.js";
import {
  CreateRoleSchema,
  UpdateRolePermissionsSchema,
} from "@repo/schemas/types";

/**
 * Register role management tools with the MCP server
 */
export function registerRoleTools(server: McpServer): void {
  // Register create role tool
  server.tool(
    "create-role",
    "Creates a new role with specified permissions for a restaurant",
    CreateRoleSchema.shape,
    async (
      params: {
        name: string;
        restaurantId: number;
        canCreateRoles?: boolean;
        canManageTables?: boolean;
        canManageSlots?: boolean;
        canManageStaff?: boolean;
        canManageMenu?: boolean;
        canManageOrders?: boolean;
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
              data: "Creating new role...",
            },
          });
        }

        // Make the API request to create a new role
        console.log(
          `Creating role ${params.name} for restaurant ${params.restaurantId}`
        );
        const createUrl = `${BACKEND_API_URL}/roles/create`;

        const result = await post(createUrl, token, params);

        if (result.message === "Role created successfully") {
          return {
            content: [
              {
                type: "text",
                text: `Successfully created role "${params.name}" with ID: ${result.role.id}`,
              },
            ],
          };
        } else {
          return {
            content: [
              {
                type: "text",
                text: `Failed to create role: ${result.message}`,
              },
            ],
            isError: true,
          };
        }
      } catch (error) {
        console.error("Error creating role:", error);
        return {
          content: [
            {
              type: "text",
              text: `Failed to create role: ${error instanceof Error ? error.message : String(error)}`,
            },
          ],
          isError: true,
        };
      }
    }
  );

  // Register update role permissions tool
  server.tool(
    "update-role-permissions",
    "Updates permissions for an existing role",
    UpdateRolePermissionsSchema.shape,
    async (
      params: {
        roleId: number;
        restaurantId: number;
        canCreateRoles?: boolean;
        canManageTables?: boolean;
        canManageSlots?: boolean;
        canManageStaff?: boolean;
        canManageMenu?: boolean;
        canManageOrders?: boolean;
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
              data: "Updating role permissions...",
            },
          });
        }

        // Make the API request to update role permissions
        console.log(
          `Updating permissions for role ${params.roleId} in restaurant ${params.restaurantId}`
        );
        const updateUrl = `${BACKEND_API_URL}/roles/update`;

        const result = await post(updateUrl, token, params);

        if (result.success) {
          return {
            content: [
              {
                type: "text",
                text: `Successfully updated role permissions for role ID: ${params.roleId}`,
              },
            ],
          };
        } else {
          return {
            content: [
              {
                type: "text",
                text: `Failed to update role permissions: ${result.message}`,
              },
            ],
            isError: true,
          };
        }
      } catch (error) {
        console.error("Error updating role permissions:", error);
        return {
          content: [
            {
              type: "text",
              text: `Failed to update role permissions: ${error instanceof Error ? error.message : String(error)}`,
            },
          ],
          isError: true,
        };
      }
    }
  );

  // Register get all roles tool
  server.tool(
    "get-restaurant-roles",
    "Fetches all roles for a specific restaurant",
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
              data: "Fetching restaurant roles...",
            },
          });
        }

        // Make the API request to get all roles for a restaurant
        console.log(`Fetching all roles for restaurant ${restaurantId}`);
        const getRolesUrl = `${BACKEND_API_URL}/roles/getRoles/${restaurantId}`;

        const result = await get(getRolesUrl, token);

        if (!result.roles || result.roles.length === 0) {
          return {
            content: [
              {
                type: "text",
                text: "No roles found for this restaurant.",
              },
            ],
          };
        }

        // Format role data for display
        const formattedRoles = result.roles
          .map((role: any) => {
            const permissions = Object.entries(role)
              .filter(([key, value]) => key.startsWith("can") && value === true)
              .map(([key]) => key.replace("can", ""))
              .join(", ");

            return `- ${role.name} (ID: ${role.id})
                    Permissions: ${permissions || "None"}`;
          })
          .join("\n\n");

        return {
          content: [
            {
              type: "text",
              text: `Restaurant Roles (${result.roles.length} total):\n\n${formattedRoles}`,
            },
          ],
        };
      } catch (error) {
        console.error("Error fetching restaurant roles:", error);
        return {
          content: [
            {
              type: "text",
              text: `Failed to fetch restaurant roles: ${error instanceof Error ? error.message : String(error)}`,
            },
          ],
          isError: true,
        };
      }
    }
  );

  // Register change user role tool
  server.tool(
    "change-user-role",
    "Changes a user's role within a restaurant",
    {
      userId: z.number().int().positive(),
      restaurantId: z.number().int().positive(),
      newRoleId: z.number().int().positive(),
    },
    async (
      {
        userId,
        restaurantId,
        newRoleId,
      }: { userId: number; restaurantId: number; newRoleId: number },
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
              data: "Changing user role...",
            },
          });
        }

        // Make the API request to change user role
        console.log(
          `Changing role for user ${userId} in restaurant ${restaurantId} to role ${newRoleId}`
        );
        const changeRoleUrl = `${BACKEND_API_URL}/roles/change`;

        const result = await post(changeRoleUrl, token, {
          userId,
          restaurantId,
          newRoleId,
        });

        if (result.role) {
          return {
            content: [
              {
                type: "text",
                text: `Successfully changed user's role to "${result.role.name}" (ID: ${result.role.id})`,
              },
            ],
          };
        } else if (result.message) {
          return {
            content: [
              {
                type: "text",
                text: `Failed to change user role: ${result.message}`,
              },
            ],
            isError: true,
          };
        } else {
          return {
            content: [
              {
                type: "text",
                text: `User role has been changed successfully.`,
              },
            ],
          };
        }
      } catch (error) {
        console.error("Error changing user role:", error);
        return {
          content: [
            {
              type: "text",
              text: `Failed to change user role: ${error instanceof Error ? error.message : String(error)}`,
            },
          ],
          isError: true,
        };
      }
    }
  );
}
