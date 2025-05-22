import { z } from "zod";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";

export function registerRestaurantCreationPrompts(server: McpServer): void {
  server.prompt(
    "restaurant_creation",
    "Guide users through creating a new restaurant",
    {},
    async () => ({
      messages: [
        {
          role: "user",
          content: {
            type: "text",
            text: "How should I guide the user to create a new restaurant?",
          },
        },
        {
          role: "assistant",
          content: {
            type: "text",
            text: `To create a new restaurant, I'll need a name for it. What would you like to call your restaurant?

After you provide a name, I'll use the create-restaurant tool to set it up for you. Once created, I'll confirm with the restaurant ID assigned by the system.

Would you like to proceed with creating a restaurant now?`,
          },
        },
      ],
    })
  );
}
