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

typedRouter.post(
  "/create",
  authMiddleware,
  checkPermission("canManageOrders"),
  async (req: Request, res: Response) => {
    try {

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


      const today = new Date();
      const datePart = today.toISOString().slice(0, 10).replace(/-/g, "");
      const randomPart = Math.floor(1000 + Math.random() * 9000);
      const orderNumber = `ORD-${datePart}-${randomPart}`;


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

typedRouter.post(
  "/get-booking-total",
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

typedRouter.post(
  "/update-item-status",
  authMiddleware,
  checkPermission("canManageOrders"),
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

export const ordersRouter = router;
