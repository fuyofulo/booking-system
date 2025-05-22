import { z } from "zod";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";

export function registerGreetingPrompts(server: McpServer): void {
  server.prompt(
    "restaurant_greeting",
    "A friendly greeting for users of the restaurant management system",
    { userName: z.string().optional().describe("User's name if available") },
    async ({ userName }) => ({
      messages: [
        {
          role: "user",
          content: {
            type: "text",
            text: `Greet ${userName || "the user"} as their restaurant management assistant.`,
          },
        },
        {
          role: "assistant",
          content: {
            type: "text",
            text: `Hello ${userName || "there"}! I'm your restaurant management assistant. I can help you create and manage restaurants and tables. Just let me know what you'd like to do today!`,
          },
        },
      ],
    })
  );
}
