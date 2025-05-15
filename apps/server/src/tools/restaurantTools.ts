// import { z } from "zod";
// import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
// import { CallToolResult } from "@modelcontextprotocol/sdk/types.js";
// import { getTokenForSession } from "../auth.js";
// import { post } from "../req-helper.js";
// import { BACKEND_API_URL } from "../config.js";
// import { CreateRestaurantSchema } from "@repo/schemas/types";

// /**
//  * Register restaurant-specific tools with the MCP server
//  */
// export function registerRestaurantTools(server: McpServer): void {
//   // Register create restaurant tool
//   // server.tool(
//   //   "create-restaurant",
//   //   "Creates a new restaurant with the specified name",
//   //   CreateRestaurantSchema.shape,
//   //   async (
//   //     { name }: { name: string },
//   //     context: any
//   //   ): Promise<CallToolResult> => {
//   //     try {
//   //       // Get session ID from context
//   //       const sessionId =
//   //         context.sessionId ||
//   //         context.request?.headers?.["mcp-session-id"] ||
//   //         context.transport?.sessionId;

//   //       if (!sessionId) {
//   //         return {
//   //           content: [
//   //             {
//   //               type: "text",
//   //               text: "Error: Could not determine session ID for authentication",
//   //             },
//   //           ],
//   //           isError: true,
//   //         };
//   //       }

//   //       // Get token for session
//   //       const token = getTokenForSession(sessionId);
//   //       if (!token) {
//   //         return {
//   //           content: [
//   //             {
//   //               type: "text",
//   //               text: "Error: Authentication token not found. Please login again.",
//   //             },
//   //           ],
//   //           isError: true,
//   //         };
//   //       }

//   //       // Make the API request to create restaurant
//   //       console.log(`Creating restaurant with name: ${name}`);
//   //       const createUrl = `${BACKEND_API_URL}/restaurant/create`;

//   //       const result = await post(createUrl, token, { name });

//   //       return {
//   //         content: [
//   //           {
//   //             type: "text",
//   //             text: `Successfully created restaurant: ${name} with ID: ${result.id || "unknown"}`,
//   //           },
//   //         ],
//   //       };
//   //     } catch (error) {
//   //       console.error("Error creating restaurant:", error);
//   //       return {
//   //         content: [
//   //           {
//   //             type: "text",
//   //             text: `Failed to create restaurant: ${error instanceof Error ? error.message : String(error)}`,
//   //           },
//   //         ],
//   //         isError: true,
//   //       };
//   //     }
//   //   }
//   // );



// }
