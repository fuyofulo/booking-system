import { z } from "zod";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import {
  CallToolResult,
  GetPromptResult,
} from "@modelcontextprotocol/sdk/types.js";
import { registerRestaurantTools } from "./restaurantTools.js";
import { registerUserTools } from "./userTools.js";
import { registerTableTools } from "./tableTools.js";

export function registerTools(server: McpServer): void {
  // Register a simple tool that returns a greeting
  server.tool(
    "greet",
    "A simple greeting tool",
    {
      name: z.string().describe("Name to greet"),
    },
    async (
      { name }: { name: string },
      context: any
    ): Promise<CallToolResult> => {
      // Access authenticated user from context if needed
      const userId = context.request?.userId || "anonymous";
      console.log(`User ${userId} called greet tool for ${name}`);

      return {
        content: [
          {
            type: "text",
            text: `Hello, ${name}!`,
          },
        ],
      };
    }
  );

  // Register a tool that sends multiple greetings with notifications (with annotations)
  server.tool(
    "multi-greet",
    "A tool that sends different greetings with delays between them",
    {
      name: z.string().describe("Name to greet"),
    },
    {
      title: "Multiple Greeting Tool",
      readOnlyHint: true,
      openWorldHint: false,
    },
    async (
      { name }: { name: string },
      context: any
    ): Promise<CallToolResult> => {
      const { sendNotification } = context;
      const userId = context.request?.userId || "anonymous";
      console.log(`User ${userId} called multi-greet tool for ${name}`);

      const sleep = (ms: number) =>
        new Promise((resolve) => setTimeout(resolve, ms));

      await sendNotification({
        method: "notifications/message",
        params: { level: "debug", data: `Starting multi-greet for ${name}` },
      });

      await sleep(1000); // Wait 1 second before first greeting

      await sendNotification({
        method: "notifications/message",
        params: { level: "info", data: `Sending first greeting to ${name}` },
      });

      await sleep(1000); // Wait another second before second greeting

      await sendNotification({
        method: "notifications/message",
        params: { level: "info", data: `Sending second greeting to ${name}` },
      });

      return {
        content: [
          {
            type: "text",
            text: `Good morning, ${name}!`,
          },
        ],
      };
    }
  );

  // Register a simple prompt
  server.prompt(
    "greeting-template",
    "A simple greeting prompt template",
    {
      name: z.string().describe("Name to include in greeting"),
    },
    async (
      { name }: { name: string },
      context: any
    ): Promise<GetPromptResult> => {
      const userId = context.request?.userId || "anonymous";
      console.log(`User ${userId} requested greeting template for ${name}`);

      return {
        messages: [
          {
            role: "user",
            content: {
              type: "text",
              text: `Please greet ${name} in a friendly manner.`,
            },
          },
        ],
      };
    }
  );

  // Register a tool specifically for testing resumability
  server.tool(
    "start-notification-stream",
    "Starts sending periodic notifications for testing resumability",
    {
      interval: z
        .number()
        .describe("Interval in milliseconds between notifications")
        .default(100),
      count: z
        .number()
        .describe("Number of notifications to send (0 for 100)")
        .default(50),
    },
    async (
      { interval, count }: { interval: number; count: number },
      context: any
    ): Promise<CallToolResult> => {
      const { sendNotification } = context;
      const userId = context.request?.userId || "anonymous";
      console.log(
        `User ${userId} started notification stream: interval=${interval}ms, count=${count}`
      );

      const sleep = (ms: number) =>
        new Promise((resolve) => setTimeout(resolve, ms));
      let counter = 0;

      while (count === 0 || counter < count) {
        counter++;
        try {
          await sendNotification({
            method: "notifications/message",
            params: {
              level: "info",
              data: `Periodic notification #${counter} at ${new Date().toISOString()}`,
            },
          });
        } catch (error) {
          console.error("Error sending notification:", error);
        }
        // Wait for the specified interval
        await sleep(interval);
      }

      return {
        content: [
          {
            type: "text",
            text: `Started sending periodic notifications every ${interval}ms`,
          },
        ],
      };
    }
  );

  // Register restaurant-specific tools
  registerRestaurantTools(server);

  // Register user-specific tools
  registerUserTools(server);

  // Register table-specific tools
  registerTableTools(server);
}
