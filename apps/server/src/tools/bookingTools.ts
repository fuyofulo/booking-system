import { z } from "zod";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { CallToolResult } from "@modelcontextprotocol/sdk/types.js";
import { getTokenForSession, getUserIdForSession } from "../auth.js";
import { get, post } from "../req-helper.js";
import { BACKEND_API_URL } from "../config.js";
import { CreateBookingSchema } from "@repo/schemas/types";

/**
 * Available Booking Tools:
 * - create-booking: Creates a new table booking : works
 * - get-available-slots: Fetches available booking slots for a restaurant : works 
 * - get-timeslots: Fetches detailed time slots with booking information : 
 * - get-all-bookings: Fetches all bookings for a restaurant : works
 * - get-bookings-by-date: Fetches all bookings for a specific date
 *
 * Register booking-related tools with the MCP server
 *
 * In this system, time slots represent 30-minute periods throughout the day (0-47):
 * - Slot 0: 12:00am - 12:30am
 * - Slot 1: 12:30am - 1:00am
 * ...
 * - Slot 24: 12:00pm - 12:30pm
 * ...
 * - Slot 47: 11:30pm - 12:00am
 *
 * Common booking periods:
 * - Breakfast (8:00am - 10:00am): [16, 17, 18, 19]
 * - Lunch (12:00pm - 2:00pm): [24, 25, 26, 27]
 * - Dinner (6:00pm - 9:00pm): [36, 37, 38, 39, 40, 41]
 */
export function registerBookingTools(server: McpServer): void {
  // Register create-booking tool
  server.tool(
    "create-booking",
    "Creates a new table booking for a specific date and time slots.\n\n" +
      "Time slots are 30-minute periods (0-47) throughout the day:\n" +
      "- Breakfast (8am-10am): [16, 17, 18, 19]\n" +
      "- Lunch (12pm-2pm): [24, 25, 26, 27]\n" +
      "- Dinner (6pm-9pm): [36, 37, 38, 39, 40, 41]\n\n" +
      "Parameters:\n" +
      "- tableId: ID of the table to book\n" +
      "- restaurantId: ID of the restaurant\n" +
      "- date: Date in YYYY-MM-DD format\n" +
      "- slotIndices: Array of time slot indices to book (e.g., [36, 37, 38] for 6pm-7:30pm)\n" +
      "- customerName: Name of the customer making the booking\n" +
      "- customerPhone: Optional phone number of the customer",
    CreateBookingSchema.shape,
    async (
      params: {
        tableId: number;
        restaurantId: number;
        date: string;
        slotIndices: number[];
        customerName: string;
        customerPhone?: string;
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
              data: `Creating booking for table ID ${params.tableId} on ${params.date} for slots ${formatSlotsList(params.slotIndices)}...`,
            },
          });
        }

        // Make the API request to create the booking
        console.log(
          `Creating booking for table ID ${params.tableId} on ${params.date}`
        );
        const bookingUrl = `${BACKEND_API_URL}/bookings/book`;

        const result = await post(bookingUrl, token, params);

        if (result.message === "Booking successful" && result.booking) {
          const booking = result.booking;
          const slotTimes = formatSlotTimes(booking.slotIndices);

          return {
            content: [
              {
                type: "text",
                text: `Booking created successfully!
                
            Booking Details:
            - Booking ID: ${booking.id}
            - Customer: ${booking.customerName}
            - Date: ${formatDate(booking.date)}
            - Time: ${slotTimes}
            - Table ID: ${booking.tableId}`,
              },
            ],
          };
        } else {
          return {
            content: [
              {
                type: "text",
                text: `Booking creation response: ${result.message || "Unknown status"}`,
              },
            ],
            isError: true,
          };
        }
      } catch (error) {
        console.error("Error creating booking:", error);
        return {
          content: [
            {
              type: "text",
              text: `Failed to create booking: ${error instanceof Error ? error.message : String(error)}`,
            },
          ],
          isError: true,
        };
      }
    }
  );

  // Register get-available-slots tool
  server.tool(
    "get-available-slots",
    "Fetches available booking slots for a restaurant on a specific date.\n\n" +
      "Retrieves all tables and their available time slots for booking on the specified date.\n" +
      "Time slots are 30-minute periods throughout the day.\n\n" +
      "Parameters:\n" +
      "- restaurantId: ID of the restaurant to check\n" +
      "- date: Date in YYYY-MM-DD format to check availability",
    {
      restaurantId: z.number().int().positive(),
      date: z
        .string()
        .regex(/^\d{4}-\d{2}-\d{2}$/, "Date must be in YYYY-MM-DD format"),
    },
    async (
      { restaurantId, date }: { restaurantId: number; date: string },
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
              data: `Fetching available slots for restaurant ID ${restaurantId} on ${date}...`,
            },
          });
        }

        // Make the API request to get available slots
        console.log(
          `Fetching available slots for restaurant ID ${restaurantId} on ${date}`
        );
        const availableUrl = `${BACKEND_API_URL}/bookings/available?restaurantId=${restaurantId}&date=${date}`;

        const result = await get(availableUrl, token);

        if (!result.tables || result.tables.length === 0) {
          return {
            content: [
              {
                type: "text",
                text: "No tables or available slots found for this restaurant on the specified date.",
              },
            ],
          };
        }

        // Format tables and available slots for display
        const formattedTables = result.tables
          .map((table: any) => {
            const slotsFormatted = formatSlotsList(table.availableSlots);

            return `- ${table.tableName} (ID: ${table.tableId})
                Capacity: ${table.capacity} people
                Available Time Slots: ${slotsFormatted || "None available"}`;
          })
          .join("\n\n");

        return {
          content: [
            {
              type: "text",
              text: `Available Booking Slots for ${formatDate(date)}:\n\n${formattedTables}`,
            },
          ],
        };
      } catch (error) {
        console.error("Error fetching available slots:", error);
        return {
          content: [
            {
              type: "text",
              text: `Failed to fetch available slots: ${error instanceof Error ? error.message : String(error)}`,
            },
          ],
          isError: true,
        };
      }
    }
  );

  // Register get-timeslots tool
  server.tool(
    "get-timeslots",
    "Fetches detailed time slots with booking information for a restaurant on a specific date.\n\n" +
      "Retrieves comprehensive information about all time slots for each table, including:\n" +
      "- Which slots are open vs. booked\n" +
      "- Customer information for booked slots\n\n" +
      "Parameters:\n" +
      "- restaurantId: ID of the restaurant to check\n" +
      "- date: Date in YYYY-MM-DD format to check",
    {
      restaurantId: z.number().int().positive(),
      date: z
        .string()
        .regex(/^\d{4}-\d{2}-\d{2}$/, "Date must be in YYYY-MM-DD format"),
    },
    async (
      { restaurantId, date }: { restaurantId: number; date: string },
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
              data: `Fetching time slots for restaurant ID ${restaurantId} on ${date}...`,
            },
          });
        }

        // Make the API request to get time slots
        console.log(
          `Fetching time slots for restaurant ID ${restaurantId} on ${date}`
        );
        const timeslotsUrl = `${BACKEND_API_URL}/bookings/timeslots?restaurantId=${restaurantId}&date=${date}`;

        const result = await get(timeslotsUrl, token);

        if (!result.tables || result.tables.length === 0) {
          return {
            content: [
              {
                type: "text",
                text: "No tables found for this restaurant on the specified date.",
              },
            ],
          };
        }

        // Format tables and time slots for display
        const formattedTables = result.tables
          .map((table: any) => {
            // Count open and booked slots
            const openSlots = table.timeSlots.filter(
              (slot: any) => slot.isOpen
            ).length;
            const bookedSlots = table.timeSlots.filter(
              (slot: any) => !slot.isOpen
            ).length;

            const bookedTimeSlots = table.timeSlots
              .filter((slot: any) => !slot.isOpen && slot.booking)
              .map((slot: any) => {
                const time = formatSlotTime(slot.slotIndex);
                return `${time} - ${slot.booking.customerName}`;
              })
              .join(", ");

            return `- ${table.tableName} (ID: ${table.tableId})
                Capacity: ${table.capacity} people
                Open Slots: ${openSlots}
                Booked Slots: ${bookedSlots}
                Bookings: ${bookedTimeSlots || "None"}`;
          })
          .join("\n\n");

        return {
          content: [
            {
              type: "text",
              text: `Time Slots for ${formatDate(date)}:\n\n${formattedTables}`,
            },
          ],
        };
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

  // Register get-all-bookings tool
  server.tool(
    "get-all-bookings",
    "Fetches all bookings for a restaurant.\n\n" +
      "Retrieves a list of all bookings for the specified restaurant across all dates.\n" +
      "Results are limited to 10 bookings in the response for readability.\n\n" +
      "Parameters:\n" +
      "- restaurantId: ID of the restaurant to get bookings for",
    {
      restaurantId: z.number().int().positive(),
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

        // Use sendNotification if available
        const { sendNotification } = context;
        if (sendNotification) {
          await sendNotification({
            method: "notifications/message",
            params: {
              level: "info",
              data: `Fetching all bookings for restaurant ID ${restaurantId}...`,
            },
          });
        }

        // Make the API request to get all bookings
        console.log(`Fetching all bookings for restaurant ID ${restaurantId}`);
        const bookedUrl = `${BACKEND_API_URL}/bookings/booked?restaurantId=${restaurantId}`;

        const result = await get(bookedUrl, token);

        if (!result.bookings || result.bookings.length === 0) {
          return {
            content: [
              {
                type: "text",
                text: "No bookings found for this restaurant.",
              },
            ],
          };
        }

        // Format bookings data for display (showing only the next 10 if there are many)
        const totalBookings = result.totalBookings;
        const displayLimit = 10;
        const displayedBookings = result.bookings.slice(0, displayLimit);

        const formattedBookings = displayedBookings
          .map((booking: any) => {
            const slotTimes = formatSlotsList(booking.slotIndices);

            return `- ${booking.date} | ${slotTimes}
                Customer: ${booking.customerName}
                Table: ${booking.tableName} (Capacity: ${booking.capacity})
                Booking ID: ${booking.id}`;
          })
          .join("\n\n");

        const remainingText =
          totalBookings > displayLimit
            ? `\n\n...and ${totalBookings - displayLimit} more bookings.`
            : "";

        return {
          content: [
            {
              type: "text",
              text: `All Bookings (${totalBookings} total):\n\n${formattedBookings}${remainingText}`,
            },
          ],
        };
      } catch (error) {
        console.error("Error fetching all bookings:", error);
        return {
          content: [
            {
              type: "text",
              text: `Failed to fetch bookings: ${error instanceof Error ? error.message : String(error)}`,
            },
          ],
          isError: true,
        };
      }
    }
  );

  // Register get-bookings-by-date tool
  server.tool(
    "get-bookings-by-date",
    "Fetches all bookings for a specific date at a restaurant.\n\n" +
      "Retrieves detailed information about all bookings on a particular date, including:\n" +
      "- Customer information\n" +
      "- Table details\n" +
      "- Time slots booked (in 30-minute increments)\n\n" +
      "Parameters:\n" +
      "- restaurantId: ID of the restaurant to query\n" +
      "- date: Date in YYYY-MM-DD format to get bookings for",
    {
      restaurantId: z.number().int().positive(),
      date: z
        .string()
        .regex(/^\d{4}-\d{2}-\d{2}$/, "Date must be in YYYY-MM-DD format"),
    },
    async (
      { restaurantId, date }: { restaurantId: number; date: string },
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
              data: `Fetching bookings for restaurant ID ${restaurantId} on ${date}...`,
            },
          });
        }

        // Make the API request to get bookings for a specific date
        console.log(
          `Fetching bookings for restaurant ID ${restaurantId} on ${date}`
        );
        const byDateUrl = `${BACKEND_API_URL}/bookings/by-date?restaurantId=${restaurantId}&date=${date}`;

        const result = await get(byDateUrl, token);

        if (!result.bookings || result.bookings.length === 0) {
          return {
            content: [
              {
                type: "text",
                text: `No bookings found for ${formatDate(date)}.`,
              },
            ],
          };
        }

        // Format bookings data for display
        const formattedBookings = result.bookings
          .map((booking: any) => {
            const slotTimes = formatSlotsList(booking.slotIndices);

            return `- ${slotTimes}
  Customer: ${booking.customerName}${booking.customerPhone ? ` (${booking.customerPhone})` : ""}
  Table: ${booking.table.name} (Capacity: ${booking.table.capacity})
  Booking ID: ${booking.id}`;
          })
          .join("\n\n");

        return {
          content: [
            {
              type: "text",
              text: `Bookings for ${formatDate(date)} (${result.bookings.length} total):\n\n${formattedBookings}`,
            },
          ],
        };
      } catch (error) {
        console.error("Error fetching bookings by date:", error);
        return {
          content: [
            {
              type: "text",
              text: `Failed to fetch bookings: ${error instanceof Error ? error.message : String(error)}`,
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

/**
 * Helper function to format a list of slot indices to a readable time range
 *
 * Converts an array of slot indices (e.g., [36, 37, 38]) to readable times (e.g., "6:00pm, 6:30pm, 7:00pm")
 * Common booking periods:
 * - Breakfast (8am-10am): [16, 17, 18, 19]
 * - Lunch (12pm-2pm): [24, 25, 26, 27]
 * - Dinner (6pm-9pm): [36, 37, 38, 39, 40, 41]
 */
function formatSlotsList(slotIndices: number[]): string {
  if (!slotIndices || slotIndices.length === 0) {
    return "No slots";
  }

  // Just format each slot as a time
  const timeStrings = slotIndices
    .sort((a, b) => a - b)
    .map((index) => formatSlotTime(index));

  return timeStrings.join(", ");
}

/**
 * Helper function to format slot times from an array of indices
 */
function formatSlotTimes(slotIndices: number[]): string {
  if (!slotIndices || slotIndices.length === 0) {
    return "No times specified";
  }

  return formatSlotsList(slotIndices);
}
