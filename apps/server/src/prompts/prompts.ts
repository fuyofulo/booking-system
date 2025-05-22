import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { registerGreetingPrompts } from "./greeting.js";
import { registerRestaurantCreationPrompts } from "./restaurant_creation.js";
import { registerTableCreationPrompts } from "./table_creation.js";
import { registerErrorHandlingPrompts } from "./error_handling.js";

/**
 * This file registers all prompts from individual prompt files:
 *
 * 1. Greeting Prompts:
 *    - restaurant_greeting: A friendly greeting for users of the restaurant management system
 *
 * 2. Restaurant Creation Prompts:
 *    - restaurant_creation: Guide users through creating a new restaurant
 *
 * 3. Table Creation Prompts:
 *    - table_creation: Guide users through creating a table for a restaurant
 *
 * 4. Error Handling Prompts:
 *    - error_handling: Guide on handling errors gracefully in the restaurant management system
 */
export function registerPrompts(server: McpServer): void {
  registerGreetingPrompts(server);
  registerRestaurantCreationPrompts(server);
  registerTableCreationPrompts(server);
  registerErrorHandlingPrompts(server);

  console.log("Registered MCP prompts successfully");
}
