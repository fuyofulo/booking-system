import { Router, Request, Response } from "express";
import { authMiddleware } from "../middlewares/auth";
import { checkPermission } from "../middlewares/checkPermission";
import { CreateOrderSchema } from "@repo/schemas/types";
import { prismaClient } from "@repo/db/client";

const router = Router();
const typedRouter = router as any;

// Create a new order
typedRouter.post(
  "/create",
  authMiddleware,
  checkPermission("canManageOrders"),
  async (req: Request, res: Response) => {
    try {
      // Validate input
      const parsedData = CreateOrderSchema.safeParse(req.body);
      if (!parsedData.success) {
        return res.status(400).json({
          success: false,
          message: "Invalid input",
          errors: parsedData.error.errors,
        });
      }

      const { restaurantId, tableId, bookingId, notes, items } =
        parsedData.data;

      // Verify the table belongs to the restaurant and the booking exists
      const booking = await prismaClient.booking.findFirst({
        where: {
          id: bookingId,
          tableId,
          table: {
            restaurantId,
          },
        },
        include: {
          table: true,
        },
      });

      if (!booking) {
        return res.status(404).json({
          success: false,
          message: "Booking not found, or table/restaurant mismatch",
        });
      }

      // Fetch dish details for all items in the order
      const dishIds = items.map((item) => item.dishId);
      const dishes = await prismaClient.dish.findMany({
        where: {
          id: { in: dishIds },
          restaurantId,
        },
      });

      // Check if all dishes exist and belong to the restaurant
      if (dishes.length !== dishIds.length) {
        return res.status(404).json({
          success: false,
          message:
            "One or more dishes not found or don't belong to this restaurant",
        });
      }

      // Create a map of dish IDs to prices
      const dishPricesMap = new Map();
      dishes.forEach((dish) => {
        dishPricesMap.set(dish.id, dish.price);
      });

      // Calculate total amount
      let totalAmount = 0;
      const orderItems = items.map((item) => {
        const price = dishPricesMap.get(item.dishId);
        const itemTotal = parseFloat(price) * item.quantity;
        totalAmount += itemTotal;

        return {
          dishId: item.dishId,
          quantity: item.quantity,
          unitPrice: price,
          status: "pending",
        };
      });

      // Generate a unique order number (format: ORD-YYYYMMDD-XXXX)
      const today = new Date();
      const datePart = today.toISOString().slice(0, 10).replace(/-/g, "");
      const randomPart = Math.floor(1000 + Math.random() * 9000); // 4-digit random number
      const orderNumber = `ORD-${datePart}-${randomPart}`;

      // Create the order and its items in a transaction
      const order = await prismaClient.$transaction(async (tx) => {
        // Create the order
        const newOrder = await tx.order.create({
          data: {
            orderNumber,
            restaurantId,
            tableId,
            bookingId,
            status: "received",
            totalAmount,
            notes,
            items: {
              create: orderItems,
            },
          },
          include: {
            items: true,
          },
        });

        return newOrder;
      });

      return res.status(201).json({
        success: true,
        message: "Order created successfully",
        data: order,
      });
    } catch (error) {
      console.error("Error creating order:", error);
      return res.status(500).json({
        success: false,
        message: "An error occurred while creating the order",
      });
    }
  }
);

// Get all orders for a booking (for calculating bill total)
typedRouter.post(
  "/booking-orders",
  authMiddleware,
  checkPermission("canManageOrders"),
  async (req: Request, res: Response) => {
    try {
      const { bookingId } = req.body;

      if (!bookingId || typeof bookingId !== "number") {
        return res.status(400).json({
          success: false,
          message: "Invalid or missing bookingId in request body",
        });
      }

      // Get the booking to verify it exists and get the restaurant ID
      const booking = await prismaClient.booking.findUnique({
        where: { id: bookingId },
        include: {
          table: {
            select: {
              restaurantId: true,
              name: true,
            },
          },
        },
      });

      if (!booking) {
        return res.status(404).json({
          success: false,
          message: "Booking not found",
        });
      }

      // Get all orders for this booking
      const orders = await prismaClient.order.findMany({
        where: { bookingId },
        include: {
          items: {
            include: {
              dish: {
                select: {
                  name: true,
                  imageUrl: true,
                },
              },
            },
          },
        },
        orderBy: {
          id: "asc",
        },
      });

      // Calculate the grand total across all orders
      const grandTotal = orders.reduce(
        (sum, order) => sum + Number(order.totalAmount),
        0
      );

      return res.json({
        success: true,
        data: {
          booking: {
            id: booking.id,
            customerName: booking.customerName,
            date: booking.date,
            tableId: booking.tableId,
          },
          orders,
          grandTotal,
          orderCount: orders.length,
        },
      });
    } catch (error) {
      console.error("Error fetching booking orders:", error);
      return res.status(500).json({
        success: false,
        message: "An error occurred while fetching booking orders",
      });
    }
  }
);

export const ordersRouter = router;
