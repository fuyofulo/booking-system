import { Router, Request, Response } from "express";
import { authMiddleware } from "../middlewares/auth";
import { checkPermission } from "../middlewares/checkPermission";
import { CreateBookingSchema } from "@repo/schemas/types";
import { prismaClient } from "@repo/db/client";

const router: any = Router();
const typedRouter = router as any;

typedRouter.post(
  "/book",
  authMiddleware,
  async (req: Request, res: Response) => {
    const data = req.body;
    const parsedData = CreateBookingSchema.safeParse(data);
    if (!parsedData.success) {
      return res.json({
        message: "invalid inputs",
      });
    }

    const tableId = parsedData.data.tableId;
    const restaurantId = parsedData.data.restaurantId;
    const date = parsedData.data.date;
    const slotIndices = parsedData.data.slotIndices;
    const customerName = parsedData.data.customerName;
    const customerPhone = parsedData.data.customerPhone;

    try {
      const tableExists = await prismaClient.table.findFirst({
        where: {
          id: tableId,
          restaurantId,
        },
      });

      if (!tableExists) {
        return res.status(404).json({
          message: "Table not found or does not belong to this restaurant",
        });
      }

      const parts = date.split("-").map(Number);
      const year = parts[0] || 0;
      const month = parts[1] || 1;
      const day = parts[2] || 1;
      const slotDate = new Date(Date.UTC(year, month - 1, day, 0, 0, 0, 0));

      const existing = await prismaClient.tableTimeSlot.findMany({
        where: {
          tableId,
          date: slotDate,
          slotIndex: { in: slotIndices },
          isOpen: true,
        },
      });

      if (existing.length !== slotIndices.length) {
        return res.json({
          message: "One or more slots are already booked or unavailable",
        });
      }

      const booking = await prismaClient.booking.create({
        data: {
          tableId,
          date: slotDate,
          slotIndices: slotIndices,
          customerName,
          customerPhone,
        },
      });

      await prismaClient.tableTimeSlot.updateMany({
        where: {
          tableId,
          date: slotDate,
          slotIndex: { in: slotIndices },
          isOpen: true,
        },
        data: {
          isOpen: true,
        },
      });

      for (const slotIndex of slotIndices) {
        await prismaClient.tableTimeSlot.update({
          where: {
            tableId_date_slotIndex: {
              tableId,
              date: slotDate,
              slotIndex,
            },
          },
          data: {
            booking: {
              connect: {
                id: booking.id,
              },
            },
          },
        });
      }

      return res.json({
        message: "Booking successful",
        booking,
      });
    } catch (error) {
      console.error("Error creating booking:", error);
      return res.status(500).json({ message: "Internal server error" });
    }
  }
);

typedRouter.get(
  "/available",
  authMiddleware,
  async (req: Request, res: Response) => {
    const restaurantId = req.query.restaurantId as string;
    const dateStr = req.query.date as string;

    if (!restaurantId || !dateStr) {
      return res
        .status(400)
        .json({ message: "Missing restaurantId or date query parameters" });
    }

    const parts = dateStr.split("-").map(Number);
    const year = parts[0] || 0;
    const month = parts[1] || 1;
    const day = parts[2] || 1;
    const date = new Date(Date.UTC(year, month - 1, day, 0, 0, 0, 0));

    try {
      const tables = await prismaClient.table.findMany({
        where: { restaurantId: Number(restaurantId) },
        select: { id: true, name: true, capacity: true },
      });

      const tableIds = tables.map((t) => t.id);

      const openSlots = await prismaClient.tableTimeSlot.findMany({
        where: {
          tableId: { in: tableIds },
          date,
          isOpen: true,
        },
        select: {
          tableId: true,
          slotIndex: true,
        },
        orderBy: {
          slotIndex: "asc",
        },
      });

      const slotMap: Record<number, number[]> = {};
      for (const slot of openSlots) {
        if (!slotMap[slot.tableId]) {
          slotMap[slot.tableId] = [];
        }
        slotMap[slot.tableId]!.push(slot.slotIndex);
      }

      const formatted = tables.map((table) => ({
        tableId: table.id,
        tableName: table.name,
        capacity: table.capacity,
        availableSlots: slotMap[table.id] || [],
      }));

      return res.json({ tables: formatted });
    } catch (err) {
      console.error("Failed to fetch available slots:", err);
      return res.status(500).json({ message: "Internal server error" });
    }
  }
);

typedRouter.get(
  "/timeslots",
  authMiddleware,
  async (req: Request, res: Response) => {
    const restaurantId = req.query.restaurantId as string;
    const dateStr = req.query.date as string;

    if (!restaurantId || !dateStr) {
      return res
        .status(400)
        .json({ message: "Missing restaurantId or date query parameters" });
    }

    const parts = dateStr.split("-").map(Number);
    const year = parts[0] || 0;
    const month = parts[1] || 1;
    const day = parts[2] || 1;
    const date = new Date(Date.UTC(year, month - 1, day, 0, 0, 0, 0));

    try {
      const tables = await prismaClient.table.findMany({
        where: { restaurantId: Number(restaurantId) },
        select: { id: true, name: true, capacity: true },
      });

      const tableIds = tables.map((t) => t.id);

      const [allSlots, bookings] = await Promise.all([
        prismaClient.tableTimeSlot.findMany({
          where: {
            tableId: { in: tableIds },
            date,
          },
          include: {
            booking: {
              select: {
                customerName: true,
                customerPhone: true,
              },
            },
          },
          orderBy: {
            slotIndex: "asc",
          },
        }),

        prismaClient.booking.findMany({
          where: {
            tableId: { in: tableIds },
            date,
          },
          select: {
            tableId: true,
            slotIndices: true,
            customerName: true,
            customerPhone: true,
          },
        }),
      ]);

      const bookingMap = new Map<
        string,
        { customerName: string; customerPhone?: string }
      >();
      for (const booking of bookings) {
        const key = `${booking.tableId}-${booking.slotIndices}`;
        bookingMap.set(key, {
          customerName: booking.customerName,
          customerPhone: booking.customerPhone ?? undefined,
        });
      }

      const slotMap: Record<
        number,
        {
          slotIndex: number;
          isOpen: boolean;
          booking?: { customerName: string; customerPhone?: string };
        }[]
      > = {};

      for (const slot of allSlots) {
        if (!slotMap[slot.tableId]) {
          slotMap[slot.tableId] = [];
        }

        slotMap[slot.tableId]!.push({
          slotIndex: slot.slotIndex,
          isOpen: slot.isOpen,
          ...(slot.booking
            ? {
                booking: {
                  customerName: slot.booking.customerName,
                  customerPhone: slot.booking.customerPhone ?? undefined,
                },
              }
            : {}),
        });
      }

      // Format final response
      const formatted = tables.map((table) => ({
        tableId: table.id,
        tableName: table.name,
        capacity: table.capacity,
        timeSlots: slotMap[table.id] || [],
      }));

      return res.json({ tables: formatted });
    } catch (err) {
      console.error("Failed to fetch time slots:", err);
      return res.status(500).json({ message: "Internal server error" });
    }
  }
);

typedRouter.get(
  "/booked",
  authMiddleware,
  async (req: Request, res: Response) => {
    const restaurantId = req.query.restaurantId as string;

    if (!restaurantId) {
      return res
        .status(400)
        .json({ message: "Missing restaurantId query parameter" });
    }

    try {
      const tables = await prismaClient.table.findMany({
        where: { restaurantId: Number(restaurantId) },
        select: { id: true, name: true, capacity: true },
      });

      const tableIds = tables.map((t) => t.id);

      const bookings = await prismaClient.booking.findMany({
        where: {
          tableId: { in: tableIds },
        },
        select: {
          id: true,
          tableId: true,
          date: true,
          slotIndices: true,
          customerName: true,
          customerPhone: true,
          createdAt: true,
          table: {
            select: {
              name: true,
              capacity: true,
            },
          },
        },
        orderBy: {
          date: "asc",
        },
      });

      const formattedBookings = bookings.map((booking) => {
        const dateString = booking.date.toISOString().split("T")[0];

        return {
          id: booking.id,
          tableId: booking.tableId,
          tableName: booking.table.name,
          capacity: booking.table.capacity,
          date: dateString,
          slotIndices: booking.slotIndices,
          customerName: booking.customerName,
          customerPhone: booking.customerPhone,
          createdAt: booking.createdAt,
        };
      });

      return res.json({
        bookings: formattedBookings,
        totalBookings: bookings.length,
      });
    } catch (error) {
      console.error("Error fetching booked slots:", error);
      return res.status(500).json({ message: "Internal server error" });
    }
  }
);

// Get bookings by date
typedRouter.get(
  "/by-date",
  authMiddleware,
  async (req: Request, res: Response) => {
    try {
      const restaurantId = req.query.restaurantId as string;
      const dateStr = req.query.date as string;

      if (!restaurantId || !dateStr) {
        return res
          .status(400)
          .json({ message: "Missing restaurantId or date query parameters" });
      }

      // Parse date string to Date object
      const parts = dateStr.split("-").map(Number);
      const year = parts[0] || 0;
      const month = parts[1] || 1;
      const day = parts[2] || 1;
      const date = new Date(Date.UTC(year, month - 1, day, 0, 0, 0, 0));

      // Verify user has access to this restaurant
      const userId = (req as any).userId;
      const restaurantUser = await prismaClient.restaurantUser.findFirst({
        where: {
          userId,
          restaurantId: Number(restaurantId),
        },
      });

      if (!restaurantUser) {
        return res.status(403).json({
          message: "You don't have access to this restaurant",
        });
      }

      // Find all tables for this restaurant
      const tables = await prismaClient.table.findMany({
        where: { restaurantId: Number(restaurantId) },
        select: { id: true, name: true, capacity: true },
      });

      const tableIds = tables.map((t) => t.id);

      // Get all bookings for this date at this restaurant
      const bookings = await prismaClient.booking.findMany({
        where: {
          date,
          tableId: { in: tableIds },
        },
        include: {
          table: {
            select: {
              name: true,
              capacity: true,
            },
          },
        },
        orderBy: {
          createdAt: "desc",
        },
      });

      return res.json({
        success: true,
        bookings,
        count: bookings.length,
        date: dateStr,
      });
    } catch (error) {
      console.error("Error fetching bookings by date:", error);
      return res.status(500).json({
        success: false,
        message: "An error occurred while fetching bookings",
        error: error instanceof Error ? error.message : String(error),
      });
    }
  }
);

export const bookingsRouter = typedRouter;
