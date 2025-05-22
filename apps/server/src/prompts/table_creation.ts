import { z } from "zod";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";

export function registerTableCreationPrompts(server: McpServer): void {
  server.prompt(
    "table_creation",
    "Guide users through creating a table for a restaurant",
    {
      restaurant_id: z
        .string()
        .optional()
        .describe("ID of the restaurant where the table will be created"),
      restaurant_name: z
        .string()
        .optional()
        .describe("Name of the restaurant where the table will be created"),
    },
    async ({
      restaurant_id,
      restaurant_name,
    }: {
      restaurant_id?: string;
      restaurant_name?: string;
    }) => ({
      messages: [
        {
          role: "user",
          content: {
            type: "text",
            text: `How should I guide the user to create a new table${
              restaurant_id ? ` for restaurant ID ${restaurant_id}` : ""
            }${restaurant_name ? ` (${restaurant_name})` : ""}?`,
          },
        },
        {
          role: "assistant",
          content: {
            type: "text",
            text: `To create a new table${
              restaurant_name ? ` for ${restaurant_name}` : ""
            }, I'll need the following information:

1. Table name (e.g., "Table 1", "Window Booth", etc.)
2. Seating capacity (how many people can sit at this table)
${!restaurant_id ? "3. Which restaurant this table belongs to (I'll need the restaurant ID)" : ""}

Once you provide these details, I'll use the create-table tool to set up the table for you.

${
  restaurant_id
    ? `I'll create this table with restaurant ID: ${restaurant_id}`
    : "Please let me know which restaurant you'd like to add this table to."
}`,
          },
        },
      ],
    })
  );
}
