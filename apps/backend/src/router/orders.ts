import { Router, Request, Response } from "express";
import { authMiddleware } from "../middlewares/auth";
import { checkPermission } from "../middlewares/checkPermission";
import {
  CreateOrderSchema,
  UpdateOrderItemStatusSchema,
} from "@repo/schemas/types";
import { prismaClient } from "@repo/db/client";

const router = Router();
const typedRouter = router as any;

// GET all orders for a restaurant
typedRouter.get("/", authMiddleware, async (req: Request, res: Response) => {
  try {
    const restaurantId = req.query.restaurantId as string;

    if (!restaurantId || typeof restaurantId !== "string") {
      return res.status(400).json({
        success: false,
        message: "Restaurant ID is required as a query parameter",
      });
    }

    // Validate that restaurantId is a valid number
    const parsedId = parseInt(restaurantId);
    if (isNaN(parsedId)) {
      return res.status(400).json({
        success: false,
        message: "Restaurant ID must be a valid number",
      });
    }

    // Verify the user has access to this restaurant
    const userId = (req as any).userId;
    console.log(`Checking user ${userId} access to restaurant ${parsedId}`);

    const restaurantUser = await prismaClient.restaurantUser.findFirst({
      where: {
        userId,
        restaurantId: parsedId,
      },
      include: {
        role: true,
      },
    });

    if (!restaurantUser) {
      return res.status(403).json({
        success: false,
        message: "You don't have access to this restaurant",
      });
    }

    // Check permission
    if (!restaurantUser.role.canManageOrders) {
      return res.status(403).json({
        success: false,
        message: "You don't have permission to manage orders",
      });
    }

    console.log(`Fetching orders for restaurant ${parsedId}`);
    const orders = await prismaClient.order.findMany({
      where: {
        restaurantId: parsedId,
      },
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
        id: "desc", // Most recent orders first
      },
    });

    console.log(`Found ${orders.length} orders for restaurant ${parsedId}`);
    return res.json({
      success: true,
      orders,
    });
  } catch (error) {
    console.error("Error in GET /orders:", error);
    return res.status(500).json({
      success: false,
      message: "An error occurred while fetching orders",
      error: error instanceof Error ? error.message : String(error),
    });
  }
});

// NEW ENDPOINT: Get orders by booking ID (using query parameters)
typedRouter.get(
  "/get-by-booking",
  authMiddleware,
  async (req: Request, res: Response) => {
    try {
      console.log("GET /orders/get-by-booking - Query:", req.query);
      const bookingIdParam = req.query.bookingId as string;

      if (!bookingIdParam) {
        return res.status(400).json({
          success: false,
          message: "Booking ID is required as a query parameter",
        });
      }

      const bookingId = parseInt(bookingIdParam);

      if (isNaN(bookingId)) {
        return res.status(400).json({
          success: false,
          message: "Invalid booking ID",
        });
      }

      console.log(`Looking up booking with ID: ${bookingId}`);
      // First verify that the user has access to this booking's restaurant
      const booking = await prismaClient.booking.findUnique({
        where: { id: bookingId },
        include: {
          table: {
            select: {
              restaurantId: true,
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

      const userId = (req as any).userId;
      console.log(
        `Checking user ${userId} access to restaurant ${booking.table.restaurantId}`
      );

      const restaurantUser = await prismaClient.restaurantUser.findFirst({
        where: {
          userId,
          restaurantId: booking.table.restaurantId,
        },
        include: {
          role: true,
        },
      });

      if (!restaurantUser) {
        return res.status(403).json({
          success: false,
          message: "You don't have access to this booking",
        });
      }

      // Check permission manually
      if (!restaurantUser.role.canManageOrders) {
        return res.status(403).json({
          success: false,
          message: "You don't have permission to view orders",
        });
      }

      console.log(`Fetching orders for booking ID: ${bookingId}`);
      // Fetch orders for this booking
      const orders = await prismaClient.order.findMany({
        where: {
          bookingId,
        },
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
          id: "desc",
        },
      });

      const grandTotal = orders.reduce(
        (sum, order) => sum + Number(order.totalAmount),
        0
      );

      console.log(`Found ${orders.length} orders for booking ${bookingId}`);
      return res.json({
        success: true,
        booking: {
          id: booking.id,
          tableId: booking.tableId,
          customerName: booking.customerName,
          date: booking.date,
        },
        orders,
        grandTotal,
        orderCount: orders.length,
      });
    } catch (error) {
      console.error("Error in GET /orders/get-by-booking:", error);
      return res.status(500).json({
        success: false,
        message: "An error occurred while fetching orders for this booking",
        error: error instanceof Error ? error.message : String(error),
      });
    }
  }
);

// GET orders by booking ID - must be before the generic /:id route
typedRouter.get(
  "/booking/:bookingId",
  authMiddleware,
  async (req: Request, res: Response) => {
    try {
      console.log("GET /orders/booking/:bookingId - Params:", req.params);
      const bookingIdParam = req.params.bookingId;
      if (!bookingIdParam) {
        return res.status(400).json({
          success: false,
          message: "Booking ID is required",
        });
      }

      const bookingId = parseInt(bookingIdParam);

      if (isNaN(bookingId)) {
        return res.status(400).json({
          success: false,
          message: "Invalid booking ID",
        });
      }

      console.log(`Looking up booking with ID: ${bookingId}`);
      // First verify that the user has access to this booking's restaurant
      const booking = await prismaClient.booking.findUnique({
        where: { id: bookingId },
        include: {
          table: {
            select: {
              restaurantId: true,
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

      const userId = (req as any).userId;
      console.log(
        `Checking user ${userId} access to restaurant ${booking.table.restaurantId}`
      );

      const restaurantUser = await prismaClient.restaurantUser.findFirst({
        where: {
          userId,
          restaurantId: booking.table.restaurantId,
        },
        include: {
          role: true,
        },
      });

      if (!restaurantUser) {
        return res.status(403).json({
          success: false,
          message: "You don't have access to this booking",
        });
      }

      // Check permission manually
      if (!restaurantUser.role.canManageOrders) {
        return res.status(403).json({
          success: false,
          message: "You don't have permission to view orders",
        });
      }

      console.log(`Fetching orders for booking ID: ${bookingId}`);
      // Fetch orders for this booking
      const orders = await prismaClient.order.findMany({
        where: {
          bookingId,
        },
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
          id: "desc",
        },
      });

      const grandTotal = orders.reduce(
        (sum, order) => sum + Number(order.totalAmount),
        0
      );

      console.log(`Found ${orders.length} orders for booking ${bookingId}`);
      return res.json({
        success: true,
        booking: {
          id: booking.id,
          tableId: booking.tableId,
          customerName: booking.customerName,
          date: booking.date,
        },
        orders,
        grandTotal,
        orderCount: orders.length,
      });
    } catch (error) {
      console.error("Error in GET /orders/booking/:bookingId:", error);
      return res.status(500).json({
        success: false,
        message: "An error occurred while fetching orders for this booking",
        error: error instanceof Error ? error.message : String(error),
      });
    }
  }
);

// GET a specific order by ID
typedRouter.get("/:id", authMiddleware, async (req: Request, res: Response) => {
  try {
    console.log("GET /orders/:id - Params:", req.params);
    const idParam = req.params.id;
    if (!idParam) {
      return res.status(400).json({
        success: false,
        message: "Order ID is required",
      });
    }

    const orderId = parseInt(idParam);

    if (isNaN(orderId)) {
      return res.status(400).json({
        success: false,
        message: "Invalid order ID",
      });
    }

    console.log(`Looking up order with ID: ${orderId}`);
    const order = await prismaClient.order.findUnique({
      where: {
        id: orderId,
      },
      include: {
        table: {
          select: {
            name: true,
            capacity: true,
          },
        },
        items: {
          include: {
            dish: {
              select: {
                name: true,
                imageUrl: true,
                description: true,
                price: true,
              },
            },
          },
        },
      },
    });

    if (!order) {
      return res.status(404).json({
        success: false,
        message: "Order not found",
      });
    }

    // Check if user has access to this restaurant
    const userId = (req as any).userId;
    console.log(
      `Checking user ${userId} access to restaurant ${order.restaurantId}`
    );

    const restaurantUser = await prismaClient.restaurantUser.findFirst({
      where: {
        userId,
        restaurantId: order.restaurantId,
      },
      include: {
        role: true,
      },
    });

    if (!restaurantUser) {
      return res.status(403).json({
        success: false,
        message: "You don't have access to this order",
      });
    }

    // Check permission manually
    if (!restaurantUser.role.canManageOrders) {
      return res.status(403).json({
        success: false,
        message: "You don't have permission to view orders",
      });
    }

    console.log(`Successfully fetched order ${orderId}`);
    return res.json({
      success: true,
      order,
    });
  } catch (error) {
    console.error("Error in GET /orders/:id:", error);
    return res.status(500).json({
      success: false,
      message: "An error occurred while fetching the order",
      error: error instanceof Error ? error.message : String(error),
    });
  }
});

typedRouter.post(
  "/create",
  authMiddleware,
  async (req: Request, res: Response) => {
    try {
      console.log("POST /orders/create - Body:", JSON.stringify(req.body));

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

      // Check if user has permission to manage orders for this restaurant
      const userId = (req as any).userId;
      const restaurantUser = await prismaClient.restaurantUser.findFirst({
        where: {
          userId,
          restaurantId,
        },
        include: {
          role: true,
        },
      });

      if (!restaurantUser) {
        return res.status(403).json({
          success: false,
          message: "You don't have access to this restaurant",
        });
      }

      // Check permission manually
      if (!restaurantUser.role.canManageOrders) {
        return res.status(403).json({
          success: false,
          message: "You don't have permission to manage orders",
        });
      }

      console.log(
        `Verifying booking: id=${bookingId}, tableId=${tableId}, restaurantId=${restaurantId}`
      );
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

      console.log(
        `Verifying ${items.length} dishes for restaurant ${restaurantId}`
      );
      const dishIds = items.map((item) => item.dishId);
      const dishes = await prismaClient.dish.findMany({
        where: {
          id: { in: dishIds },
          restaurantId,
        },
      });

      if (dishes.length !== dishIds.length) {
        return res.status(404).json({
          success: false,
          message:
            "One or more dishes not found or don't belong to this restaurant",
        });
      }

      console.log("Creating price map and calculating total amount");
      const dishPricesMap = new Map();
      dishes.forEach((dish) => {
        dishPricesMap.set(dish.id, dish.price);
      });

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

      console.log(`Generated order items with total amount: ${totalAmount}`);
      const today = new Date();
      const datePart = today.toISOString().slice(0, 10).replace(/-/g, "");
      const randomPart = Math.floor(1000 + Math.random() * 9000);
      const orderNumber = `ORD-${datePart}-${randomPart}`;

      console.log(`Creating order with number: ${orderNumber}`);
      const order = await prismaClient.$transaction(async (tx) => {
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

      console.log(`Successfully created order with ID: ${order.id}`);
      return res.status(201).json({
        success: true,
        message: "Order created successfully",
        data: order,
      });
    } catch (error) {
      console.error("Error in POST /orders/create:", error);
      return res.status(500).json({
        success: false,
        message: "An error occurred while creating the order",
        error: error instanceof Error ? error.message : String(error),
      });
    }
  }
);

typedRouter.post(
  "/get-booking-total",
  authMiddleware,
  async (req: Request, res: Response) => {
    try {
      console.log(
        "POST /orders/get-booking-total - Body:",
        JSON.stringify(req.body)
      );
      const { bookingId } = req.body;

      if (!bookingId || typeof bookingId !== "number") {
        return res.status(400).json({
          success: false,
          message: "Invalid or missing bookingId in request body",
        });
      }

      console.log(`Looking up booking with ID: ${bookingId}`);
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

      // Check if user has access to this restaurant
      const userId = (req as any).userId;
      const restaurantUser = await prismaClient.restaurantUser.findFirst({
        where: {
          userId,
          restaurantId: booking.table.restaurantId,
        },
        include: {
          role: true,
        },
      });

      if (!restaurantUser) {
        return res.status(403).json({
          success: false,
          message: "You don't have access to this booking",
        });
      }

      // Check permission manually
      if (!restaurantUser.role.canManageOrders) {
        return res.status(403).json({
          success: false,
          message: "You don't have permission to view orders",
        });
      }

      console.log(`Fetching orders for booking ID: ${bookingId}`);
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

      console.log(`Found ${orders.length} orders for booking ${bookingId}`);
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
      console.error("Error in POST /orders/get-booking-total:", error);
      return res.status(500).json({
        success: false,
        message: "An error occurred while fetching booking orders",
        error: error instanceof Error ? error.message : String(error),
      });
    }
  }
);

typedRouter.post(
  "/update-item-status",
  authMiddleware,
  async (req: Request, res: Response) => {
    try {
      const parsedData = UpdateOrderItemStatusSchema.safeParse(req.body);
      if (!parsedData.success) {
        return res.status(400).json({
          success: false,
          message: "Invalid input data",
          errors: parsedData.error.errors,
        });
      }

      const { orderItemIds, status, restaurantId } = parsedData.data;

      // Check if user has permission to manage orders for this restaurant
      const userId = (req as any).userId;
      const restaurantUser = await prismaClient.restaurantUser.findFirst({
        where: {
          userId,
          restaurantId,
        },
        include: {
          role: true,
        },
      });

      if (!restaurantUser) {
        return res.status(403).json({
          success: false,
          message: "You don't have access to this restaurant",
        });
      }

      // Check permission manually
      if (!restaurantUser.role.canManageOrders) {
        return res.status(403).json({
          success: false,
          message: "You don't have permission to manage orders",
        });
      }

      const orderItems = await prismaClient.orderItem.findMany({
        where: {
          id: { in: orderItemIds },
          order: {
            restaurantId,
          },
        },
        include: {
          order: {
            select: {
              id: true,
              orderNumber: true,
              restaurantId: true,
            },
          },
        },
      });

      if (orderItems.length !== orderItemIds.length) {
        return res.status(404).json({
          success: false,
          message:
            "One or more order items not found or don't belong to this restaurant",
        });
      }

      const updatedItems = await prismaClient.$transaction(
        orderItemIds.map((itemId) =>
          prismaClient.orderItem.update({
            where: { id: itemId },
            data: { status },
            include: {
              dish: {
                select: {
                  name: true,
                },
              },
            },
          })
        )
      );

      const affectedOrderIds = [
        ...new Set(orderItems.map((item) => item.order.id)),
      ];

      for (const orderId of affectedOrderIds) {
        const allOrderItems = await prismaClient.orderItem.findMany({
          where: { orderId },
        });

        const allSameStatus = allOrderItems.every(
          (item) => item.status === status
        );

        if (allSameStatus) {
          let orderStatus = "received";

          if (status === "pending") orderStatus = "received";
          else if (status === "preparing") orderStatus = "preparing";
          else if (status === "ready") orderStatus = "ready";
          else if (status === "served") orderStatus = "completed";
          else if (status === "cancelled") orderStatus = "cancelled";

          await prismaClient.order.update({
            where: { id: orderId },
            data: { status: orderStatus },
          });
        }
      }

      return res.json({
        success: true,
        message: `Updated ${updatedItems.length} items to status: ${status}`,
        data: {
          updatedItems,
          affectedOrders: affectedOrderIds,
        },
      });
    } catch (error) {
      console.error("Error updating order item status:", error);
      return res.status(500).json({
        success: false,
        message: "An error occurred while updating order item status",
      });
    }
  }
);

export const ordersRouter = typedRouter;
