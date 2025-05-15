import { z } from "zod";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { CallToolResult } from "@modelcontextprotocol/sdk/types.js";
import { getTokenForSession, getUserIdForSession } from "../auth.js";
import { get, post } from "../req-helper.js";
import { BACKEND_API_URL } from "../config.js";
import {
  CreateOrderSchema,
  UpdateOrderItemStatusSchema,
} from "@repo/schemas/types";

/**
 * Register order management tools with the MCP server
 *
 * These tools allow for managing restaurant orders including:
 * - Viewing all orders for a restaurant
 * - Creating new orders
 * - Checking orders for specific bookings
 * - Updating order status
 */
export function registerOrderTools(server: McpServer): void {
  // Register get-all-orders tool
  server.tool(
    "get-all-orders",
    "Fetches all orders for a specific restaurant.\n\n" +
      "Returns a list of all orders for the restaurant, including dish details.\n\n" +
      "Parameters:\n" +
      "- restaurantId: ID of the restaurant to get orders for",
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
              data: `Fetching all orders for restaurant ID ${restaurantId}...`,
            },
          });
        }

        // Make the API request to get all orders
        console.log(`Fetching all orders for restaurant ID ${restaurantId}`);
        const url = `${BACKEND_API_URL}/orders?restaurantId=${restaurantId}`;

        const result = await get(url, token);

        if (!result.success) {
          return {
            content: [
              {
                type: "text",
                text: `Failed to fetch orders: ${result.message || "Unknown error"}`,
              },
            ],
            isError: true,
          };
        }

        if (!result.orders || result.orders.length === 0) {
          return {
            content: [
              {
                type: "text",
                text: "No orders found for this restaurant.",
              },
            ],
          };
        }

        // Format orders for display (showing up to 10)
        const displayLimit = 10;
        const totalOrders = result.orders.length;
        const displayedOrders = result.orders.slice(0, displayLimit);

        const formattedOrders = displayedOrders
          .map((order: any) => {
            const orderItems = order.items
              .map((item: any) => {
                return `${item.quantity}x ${item.dish.name} (${item.status})`;
              })
              .join(", ");

            return `- Order #${order.orderNumber} (ID: ${order.id})
  Status: ${order.status}
  Total: $${Number(order.totalAmount).toFixed(2)}
  Items: ${orderItems || "None"}`;
          })
          .join("\n\n");

        const remainingText =
          totalOrders > displayLimit
            ? `\n\n...and ${totalOrders - displayLimit} more orders.`
            : "";

        return {
          content: [
            {
              type: "text",
              text: `All Orders for Restaurant ID ${restaurantId} (${totalOrders} total):\n\n${formattedOrders}${remainingText}`,
            },
          ],
        };
      } catch (error) {
        console.error("Error fetching all orders:", error);
        return {
          content: [
            {
              type: "text",
              text: `Failed to fetch orders: ${error instanceof Error ? error.message : String(error)}`,
            },
          ],
          isError: true,
        };
      }
    }
  );

  // Register get-order-by-id tool
  server.tool(
    "get-order-by-id",
    "Fetches details of a specific order by its ID.\n\n" +
      "Returns comprehensive information about the order, including all items and their status.\n\n" +
      "Parameters:\n" +
      "- orderId: ID of the order to fetch",
    {
      orderId: z.number().int().positive(),
    },
    async (
      { orderId }: { orderId: number },
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
              data: `Fetching order details for order ID ${orderId}...`,
            },
          });
        }

        // Make the API request to get order details
        console.log(`Fetching details for order ID ${orderId}`);
        const url = `${BACKEND_API_URL}/orders/${orderId}`;

        const result = await get(url, token);

        if (!result.success) {
          return {
            content: [
              {
                type: "text",
                text: `Failed to fetch order: ${result.message || "Unknown error"}`,
              },
            ],
            isError: true,
          };
        }

        if (!result.order) {
          return {
            content: [
              {
                type: "text",
                text: "Order not found.",
              },
            ],
          };
        }

        const order = result.order;
        const orderItems = order.items
          .map((item: any) => {
            return `- ${item.quantity}x ${item.dish.name} ($${Number(item.unitPrice).toFixed(2)} each)
    Status: ${item.status}
    Description: ${item.dish.description || "N/A"}`;
          })
          .join("\n\n");

        return {
          content: [
            {
              type: "text",
              text: `Order Details for #${order.orderNumber} (ID: ${order.id})

Status: ${order.status}
Table: ${order.table?.name || "Unknown"} (Capacity: ${order.table?.capacity || "N/A"})
Total Amount: $${Number(order.totalAmount).toFixed(2)}
Notes: ${order.notes || "None"}

Items:
${orderItems}`,
            },
          ],
        };
      } catch (error) {
        console.error("Error fetching order details:", error);
        return {
          content: [
            {
              type: "text",
              text: `Failed to fetch order details: ${error instanceof Error ? error.message : String(error)}`,
            },
          ],
          isError: true,
        };
      }
    }
  );

  // Register get-orders-by-booking tool
  server.tool(
    "get-orders-by-booking",
    "Fetches all orders associated with a specific booking.\n\n" +
      "Returns all orders placed for a specific booking, including details and total amount.\n\n" +
      "Parameters:\n" +
      "- bookingId: ID of the booking to get orders for",
    {
      bookingId: z.number().int().positive(),
    },
    async (
      { bookingId }: { bookingId: number },
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
              data: `Fetching orders for booking ID ${bookingId}...`,
            },
          });
        }

        // Make the API request to get orders for a booking
        console.log(`Fetching orders for booking ID ${bookingId}`);
        const url = `${BACKEND_API_URL}/orders/booking/${bookingId}`;

        const result = await get(url, token);

        if (!result.success) {
          return {
            content: [
              {
                type: "text",
                text: `Failed to fetch booking orders: ${result.message || "Unknown error"}`,
              },
            ],
            isError: true,
          };
        }

        if (!result.orders || result.orders.length === 0) {
          return {
            content: [
              {
                type: "text",
                text: `No orders found for booking ID ${bookingId}.`,
              },
            ],
          };
        }

        // Format orders for display
        const formattedOrders = result.orders
          .map((order: any) => {
            const orderItems = order.items
              .map((item: any) => {
                return `${item.quantity}x ${item.dish.name} (${item.status})`;
              })
              .join(", ");

            return `- Order #${order.orderNumber} (ID: ${order.id})
  Status: ${order.status}
  Total: $${Number(order.totalAmount).toFixed(2)}
  Items: ${orderItems || "None"}`;
          })
          .join("\n\n");

        return {
          content: [
            {
              type: "text",
              text: `Orders for Booking ID ${bookingId}
              
Customer: ${result.booking.customerName}
Date: ${new Date(result.booking.date).toLocaleDateString()}
Total Orders: ${result.orderCount}
Grand Total: $${Number(result.grandTotal).toFixed(2)}

Orders:
${formattedOrders}`,
            },
          ],
        };
      } catch (error) {
        console.error("Error fetching booking orders:", error);
        return {
          content: [
            {
              type: "text",
              text: `Failed to fetch booking orders: ${error instanceof Error ? error.message : String(error)}`,
            },
          ],
          isError: true,
        };
      }
    }
  );

  // Register create-order tool
  server.tool(
    "create-order",
    "Creates a new order for a booking.\n\n" +
      "Places a new order for a specific booking with selected dishes and quantities.\n\n" +
      "Parameters:\n" +
      "- restaurantId: ID of the restaurant\n" +
      "- tableId: ID of the table for the order\n" +
      "- bookingId: ID of the booking this order is for\n" +
      "- notes: Optional notes for the order\n" +
      "- items: Array of order items, each with:\n" +
      "  * dishId: ID of the dish to order\n" +
      "  * quantity: Number of this dish to order",
    CreateOrderSchema.shape,
    async (
      params: {
        restaurantId: number;
        tableId: number;
        bookingId: number;
        notes?: string;
        items: { dishId: number; quantity: number }[];
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
              data: `Creating order for booking ID ${params.bookingId} with ${params.items.length} items...`,
            },
          });
        }

        // Make the API request to create the order
        console.log(
          `Creating order for booking ID ${params.bookingId} with ${params.items.length} items`
        );
        const url = `${BACKEND_API_URL}/orders/create`;

        const result = await post(url, token, params);

        if (!result.success) {
          return {
            content: [
              {
                type: "text",
                text: `Failed to create order: ${result.message || "Unknown error"}`,
              },
            ],
            isError: true,
          };
        }

        const order = result.data;
        const totalAmount = Number(order.totalAmount).toFixed(2);

        return {
          content: [
            {
              type: "text",
              text: `Order created successfully!
              
Order Details:
- Order #${order.orderNumber} (ID: ${order.id})
- Table ID: ${order.tableId}
- Status: ${order.status}
- Total Amount: $${totalAmount}
- Number of Items: ${order.items.length}`,
            },
          ],
        };
      } catch (error) {
        console.error("Error creating order:", error);
        return {
          content: [
            {
              type: "text",
              text: `Failed to create order: ${error instanceof Error ? error.message : String(error)}`,
            },
          ],
          isError: true,
        };
      }
    }
  );

  // Register get-booking-total tool
  server.tool(
    "get-booking-total",
    "Calculates the total amount for all orders in a booking.\n\n" +
      "Returns a summary of all orders for a booking and their combined total.\n\n" +
      "Parameters:\n" +
      "- bookingId: ID of the booking to calculate total for",
    {
      bookingId: z.number().int().positive(),
    },
    async (
      { bookingId }: { bookingId: number },
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
              data: `Calculating total for booking ID ${bookingId}...`,
            },
          });
        }

        // Make the API request to get the booking total
        console.log(`Calculating total for booking ID ${bookingId}`);
        const url = `${BACKEND_API_URL}/orders/get-booking-total`;

        const result = await post(url, token, { bookingId });

        if (!result.success) {
          return {
            content: [
              {
                type: "text",
                text: `Failed to calculate booking total: ${result.message || "Unknown error"}`,
              },
            ],
            isError: true,
          };
        }

        const bookingData = result.data;
        if (!bookingData.orders || bookingData.orders.length === 0) {
          return {
            content: [
              {
                type: "text",
                text: `No orders found for booking ID ${bookingId}.`,
              },
            ],
          };
        }

        const grandTotal = Number(bookingData.grandTotal).toFixed(2);

        return {
          content: [
            {
              type: "text",
              text: `Booking Total for ID ${bookingId}
              
Customer: ${bookingData.booking.customerName}
Date: ${new Date(bookingData.booking.date).toLocaleDateString()}
Order Count: ${bookingData.orderCount}
Grand Total: $${grandTotal}`,
            },
          ],
        };
      } catch (error) {
        console.error("Error calculating booking total:", error);
        return {
          content: [
            {
              type: "text",
              text: `Failed to calculate booking total: ${error instanceof Error ? error.message : String(error)}`,
            },
          ],
          isError: true,
        };
      }
    }
  );

  // Register update-order-item-status tool
  server.tool(
    "update-order-item-status",
    "Updates the status of specific order items.\n\n" +
      "Changes the status of one or more order items to a new status.\n" +
      "Valid statuses: 'pending', 'preparing', 'ready', 'served', 'cancelled'\n\n" +
      "Parameters:\n" +
      "- orderItemIds: Array of order item IDs to update\n" +
      "- status: New status to set for the items\n" +
      "- restaurantId: ID of the restaurant these items belong to",
    UpdateOrderItemStatusSchema.shape,
    async (
      params: {
        orderItemIds: number[];
        status: string;
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
              data: `Updating ${params.orderItemIds.length} items to status '${params.status}'...`,
            },
          });
        }

        // Make the API request to update item status
        console.log(
          `Updating ${params.orderItemIds.length} items to status '${params.status}'`
        );
        const url = `${BACKEND_API_URL}/orders/update-item-status`;

        const result = await post(url, token, params);

        if (!result.success) {
          return {
            content: [
              {
                type: "text",
                text: `Failed to update item status: ${result.message || "Unknown error"}`,
              },
            ],
            isError: true,
          };
        }

        return {
          content: [
            {
              type: "text",
              text: `${result.message || `Successfully updated ${params.orderItemIds.length} items to status '${params.status}'`}
              
Items updated: ${result.data?.updatedItems?.length || 0}
Affected orders: ${result.data?.affectedOrders?.length || 0}`,
            },
          ],
        };
      } catch (error) {
        console.error("Error updating order item status:", error);
        return {
          content: [
            {
              type: "text",
              text: `Failed to update order item status: ${error instanceof Error ? error.message : String(error)}`,
            },
          ],
          isError: true,
        };
      }
    }
  );
}
