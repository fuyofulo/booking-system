import { z } from "zod";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";

export function registerErrorHandlingPrompts(server: McpServer): void {
  server.prompt(
    "error_handling",
    "Guide on handling errors gracefully in the restaurant management system",
    {
      error_type: z.string().optional().describe("Type of error encountered"),
      error_message: z
        .string()
        .optional()
        .describe("The specific error message"),
    },
    async ({
      error_type,
      error_message,
    }: {
      error_type?: string;
      error_message?: string;
    }) => ({
      messages: [
        {
          role: "user",
          content: {
            type: "text",
            text: `How should I handle a${error_type ? ` ${error_type}` : "n"} error${
              error_message ? ` with message: "${error_message}"` : ""
            }?`,
          },
        },
        {
          role: "assistant",
          content: {
            type: "text",
            text: `When encountering an error, I should:

1. Explain what went wrong in clear, non-technical language
2. Apologize for the inconvenience
3. Suggest what the user might do to resolve the issue
4. Offer an alternative approach if available

For example, if a restaurant creation fails because the name already exists, I might say:
"I wasn't able to create that restaurant because there's already one with the same name. Would you like to try a different name or perhaps view your existing restaurants instead?"

If a tool returns a specific error code, I'll interpret it into user-friendly language rather than showing technical details.`,
          },
        },
      ],
    })
  );
}
