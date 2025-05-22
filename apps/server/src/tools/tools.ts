import { z } from "zod";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import {
  CallToolResult,
  GetPromptResult,
} from "@modelcontextprotocol/sdk/types.js";
// import { registerRestaurantTools } from "./restaurantTools.js";
import { registerUserTools } from "./userTools.js";
import { registerTableTools } from "./tableTools.js";
import { registerTimeSlotTools } from "./timeSlotTools.js";
import { registerBookingTools } from "./bookingTools.js";
import { registerStaffTools } from "./staffTools.js";
import { registerMenuTools } from "./menuTools.js";
import { registerOrderTools } from "./orderTools.js";

/**
 * This file registers all tools from individual tool files:
 *
 * 1. User Tools:
 *    - get-user-profile: Fetches the current user's profile
 *
 * 2. Table Tools:
 *    - create-table, get-restaurant-tables, get-table-details,
 *    - update-table, delete-table
 *
 * 3. Time Slot Tools:
 *    - update-time-slot, batch-update-time-slots, get-table-time-slots
 *
 * 4. Booking Tools:
 *    - create-booking, get-available-slots, get-timeslots,
 *    - get-all-bookings, get-bookings-by-date
 *
 * 5. Staff Tools:
 *    - create-restaurant-user, get-restaurant-users
 *
 * 6. Menu Tools:
 *    - create-menu, update-menu, create-dish, update-dish,
 *    - get-restaurant-menus, get-menu-dishes
 *
 * 7. Order Tools:
 *    - get-all-orders, get-order-by-id, get-orders-by-booking,
 *    - create-order, get-booking-total, update-order-item-status
 *
 * Testing Tools:
 * - start-notification-stream: Used for testing notification resumability
 */
export function registerTools(server: McpServer): void {
  registerUserTools(server);

  registerTimeSlotTools(server);

  registerBookingTools(server);

  registerTableTools(server);

  registerStaffTools(server);

  registerMenuTools(server);

  registerOrderTools(server);

  // Testing tools for notification system
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
}
