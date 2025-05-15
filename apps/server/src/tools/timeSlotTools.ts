import { z } from "zod";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { CallToolResult } from "@modelcontextprotocol/sdk/types.js";
import { getTokenForSession, getUserIdForSession } from "../auth.js";
import { get, post } from "../req-helper.js";
import { BACKEND_API_URL } from "../config.js";
import {
  UpdateOneSlotSchema,
  BatchUpdateSlotsSchema,
} from "@repo/schemas/types";

/**
 * Register time slot management tools with the MCP server
 *
 * A time slot represents a 30-minute period. Slots are numbered 0-47 for a full day:
 * - Slot 0: 12:00am - 12:30am
 * - Slot 1: 12:30am - 1:00am
 * ...
 * - Slot 24: 12:00pm - 12:30pm
 * ...
 * - Slot 47: 11:30pm - 12:00am
 *
 * Common time periods:
 * - Breakfast (8:00am - 10:00am): [16, 17, 18, 19]
 * - Lunch (12:00pm - 2:00pm): [24, 25, 26, 27]
 * - Dinner (6:00pm - 9:00pm): [36, 37, 38, 39, 40, 41]
 */
export function registerTimeSlotTools(server: McpServer): void {
  // Register update-time-slot tool
  server.tool(
    "update-time-slot",
    "Updates a single time slot's availability for a specific table and date.\n\n" +
      "A time slot is a 30-minute period (e.g., slot 24 = 12:00pm-12:30pm).\n" +
      "- tableId: The ID of the table to update\n" +
      "- date: The date in YYYY-MM-DD format\n" +
      "- slotIndex: A number from 0-47 representing a 30-min period (e.g., 36 = 6:00pm-6:30pm)\n" +
      "- isOpen: Set to true to make the slot available for booking, false to make it unavailable",
    UpdateOneSlotSchema.shape,
    async (
      params: {
        tableId: number;
        date: string;
        slotIndex: number;
        isOpen: boolean;
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

        // Use sendNotification if available
        const { sendNotification } = context;
        if (sendNotification) {
          await sendNotification({
            method: "notifications/message",
            params: {
              level: "info",
              data: `Updating time slot ${params.slotIndex} (${formatSlotTime(params.slotIndex)}) for table ID ${params.tableId} on ${params.date}...`,
            },
          });
        }

        // Make the API request to update the time slot
        console.log(
          `Updating time slot ${params.slotIndex} for table ID ${params.tableId} on ${params.date}`
        );
        const url = `${BACKEND_API_URL}/timeslot/update-one`;

        const result = await post(url, token, params);

        if (
          result.message === "Time slot updated successfully" &&
          result.slot
        ) {
          const slot = result.slot;
          const slotTime = formatSlotTime(slot.slotIndex);

          return {
            content: [
              {
                type: "text",
                text: `Time slot updated successfully!
                
Time Slot Details:
- Table ID: ${slot.tableId}
- Date: ${formatDate(slot.date)}
- Time: ${slotTime}
- Status: ${slot.isOpen ? "Open" : "Closed"}`,
              },
            ],
          };
        } else {
          return {
            content: [
              {
                type: "text",
                text: `Time slot update response: ${result.message || "Unknown status"}`,
              },
            ],
            isError: true,
          };
        }
      } catch (error) {
        console.error("Error updating time slot:", error);
        return {
          content: [
            {
              type: "text",
              text: `Failed to update time slot: ${error instanceof Error ? error.message : String(error)}`,
            },
          ],
          isError: true,
        };
      }
    }
  );

  // Register batch-update-time-slots tool
  server.tool(
    "batch-update-time-slots",
    "Updates multiple time slots' availability for specified tables and dates.\n\n" +
      "Allows updating many time slots at once across multiple tables and dates.\n" +
      "- tableIds: Array of table IDs to update [1, 2, 3]\n" +
      "- dates: Array of dates in YYYY-MM-DD format ['2023-06-01', '2023-06-02']\n" +
      "- slotIndices: Array of slot indices to update. Each index is a 30-min period:\n" +
      "  * Breakfast (8am-10am): [16, 17, 18, 19]\n" +
      "  * Lunch (12pm-2pm): [24, 25, 26, 27]\n" +
      "  * Dinner (6pm-9pm): [36, 37, 38, 39, 40, 41]\n" +
      "- isOpen: Set to true to make slots available, false to make them unavailable\n" +
      "- restaurantId: ID of the restaurant that owns these tables",
    BatchUpdateSlotsSchema.shape,
    async (
      params: {
        tableIds: number[];
        dates: string[];
        slotIndices: number[];
        isOpen: boolean;
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

        // Use sendNotification if available
        const { sendNotification } = context;
        if (sendNotification) {
          await sendNotification({
            method: "notifications/message",
            params: {
              level: "info",
              data: `Batch updating time slots for restaurant ID ${params.restaurantId}...`,
            },
          });
        }

        // Make the API request to batch update time slots
        console.log(
          `Batch updating time slots for restaurant ID ${params.restaurantId}`
        );
        const url = `${BACKEND_API_URL}/timeslot/batch-update`;

        const result = await post(url, token, params);

        if (
          result.message === "Batch time slot update successful" &&
          result.stats
        ) {
          const stats = result.stats;

          return {
            content: [
              {
                type: "text",
                text: `Batch time slot update successful!
                
Update Statistics:
- Tables processed: ${stats.tablesProcessed}
- Dates processed: ${stats.datesProcessed}
- Slot indices processed: ${stats.slotsProcessed}
- Total slots updated: ${stats.totalSlotsUpdated}`,
              },
            ],
          };
        } else {
          return {
            content: [
              {
                type: "text",
                text: `Batch time slot update response: ${result.message || "Unknown status"}`,
              },
            ],
            isError: true,
          };
        }
      } catch (error) {
        console.error("Error batch updating time slots:", error);
        return {
          content: [
            {
              type: "text",
              text: `Failed to batch update time slots: ${error instanceof Error ? error.message : String(error)}`,
            },
          ],
          isError: true,
        };
      }
    }
  );

  // Register get-table-time-slots tool
  server.tool(
    "get-table-time-slots",
    "Fetches time slots for a specific table on a specific date.\n\n" +
      "Retrieves all time slots (0-47) for a given table and date showing their availability status.\n" +
      "- tableId: The ID of the table to query\n" +
      "- date: The date in YYYY-MM-DD format (e.g., '2023-06-01')\n\n" +
      "The response will show each 30-minute slot and whether it's open or closed for bookings.",
    {
      tableId: z.number().int().positive(),
      date: z
        .string()
        .regex(/^\d{4}-\d{2}-\d{2}$/, "Date must be in YYYY-MM-DD format"),
    },
    async (
      { tableId, date }: { tableId: number; date: string },
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

        // Use sendNotification if available
        const { sendNotification } = context;
        if (sendNotification) {
          await sendNotification({
            method: "notifications/message",
            params: {
              level: "info",
              data: `Fetching time slots for table ID ${tableId} on ${date}...`,
            },
          });
        }

        // Make the API request to get time slots for a table and date
        console.log(`Fetching time slots for table ID ${tableId} on ${date}`);
        const url = `${BACKEND_API_URL}/timeslot/table/${tableId}/date/${date}`;

        const result = await get(url, token);

        if (
          result.message === "Time slots retrieved successfully" &&
          result.timeSlots
        ) {
          const timeSlots = result.timeSlots;

          if (timeSlots.length === 0) {
            return {
              content: [
                {
                  type: "text",
                  text: `No time slots found for table ID ${tableId} on ${formatDate(date)}.`,
                },
              ],
            };
          }

          // Format time slots data for display
          const formattedTimeSlots = timeSlots
            .map((slot: any) => {
              const slotTime = formatSlotTime(slot.slotIndex);
              return `- ${slotTime}: ${slot.isOpen ? "Open" : "Closed"}`;
            })
            .join("\n");

          return {
            content: [
              {
                type: "text",
                text: `Time Slots for Table ID ${tableId} on ${formatDate(date)}:\n\n${formattedTimeSlots}`,
              },
            ],
          };
        } else {
          return {
            content: [
              {
                type: "text",
                text: `Failed to retrieve time slots: ${result.message || "Unknown error"}`,
              },
            ],
            isError: true,
          };
        }
      } catch (error) {
        console.error("Error fetching time slots:", error);
        return {
          content: [
            {
              type: "text",
              text: `Failed to fetch time slots: ${error instanceof Error ? error.message : String(error)}`,
            },
          ],
          isError: true,
        };
      }
    }
  );
}

/**
 * Helper function to format a date string
 */
function formatDate(dateStr: string): string {
  if (!dateStr) return "Unknown date";

  try {
    const date = new Date(dateStr);
    return date.toLocaleDateString("en-US", {
      weekday: "long",
      year: "numeric",
      month: "long",
      day: "numeric",
    });
  } catch (error) {
    return dateStr;
  }
}

/**
 * Helper function to format a slot index to a time string
 *
 * Each slot represents a 30-minute period:
 * - Slot 0: 12:00am - 12:30am
 * - Slot 1: 12:30am - 1:00am
 * ...
 * - Slot 24: 12:00pm - 12:30pm
 * ...
 * - Slot 47: 11:30pm - 12:00am
 */
function formatSlotTime(slotIndex: number): string {
  // Each slot is 30 minutes, starting from 00:00
  const hours = Math.floor(slotIndex / 2);
  const minutes = (slotIndex % 2) * 30;

  // Format in 12-hour with am/pm
  let displayHour = hours % 12;
  if (displayHour === 0) displayHour = 12; // 0 hour is 12 in 12-hour format
  const amPm = hours < 12 ? "am" : "pm";

  const formattedMinutes = minutes.toString().padStart(2, "0");

  return `${displayHour}:${formattedMinutes}${amPm}`;
}
