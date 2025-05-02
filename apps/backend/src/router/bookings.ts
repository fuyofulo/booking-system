import { Router, Request, Response } from "express";
import { authMiddleware } from "../middlewares/auth";
import { checkPermission } from "../middlewares/checkPermission";
import { CreateBookingSchema } from "@repo/schemas/types";
import { prismaClient } from "@repo/db/client";

const router: any = Router();
const typedRouter = router as any;

typedRouter.post('/book', authMiddleware, checkPermission("canManageSlots"), async (req: Request, res: Response) => {

    const data = req.body;
    const parsedData = CreateBookingSchema.safeParse(data);
    if(!parsedData.success) {
        return res.json({
            message: "invalid inputs"
        })
    }

    const tableId = parsedData.data.tableId;
    const date = parsedData.data.date;
    const slotIndices = parsedData.data.slotIndices;
    const customerName = parsedData.data.customerName;
    const customerPhone = parsedData.data.customerPhone; 

    try {
  
      // Normalize date to midnight
        const slotDate = new Date(date);
        slotDate.setUTCHours(0, 0, 0, 0);
  
      // Step 1: Check if the slot is open in TableTimeSlot
        const existing = await prismaClient.tableTimeSlot.findMany({
            where: {
                tableId,
                date: new Date(date),
                slotIndex: { in: slotIndices },
                isOpen: true,
            },
        });

        if (existing.length !== slotIndices.length) {
            return res.json({ message: "One or more slots are already booked or unavailable" });
        }

      // Create bookings
        const bookings = await prismaClient.$transaction(
            slotIndices.map((slotIndex) =>
                prismaClient.booking.create({
                    data: {
                        tableId,
                        date: new Date(date),
                        slotIndex,
                        customerName,
                        customerPhone,
                    },
                })
            )
        );

      // Optionally mark the booked slots as closed
        await prismaClient.tableTimeSlot.updateMany({
            where: {
                tableId,
                date: new Date(date),
                slotIndex: { in: slotIndices },
            },
            data: { isOpen: false },
        });

        return res.json({
            message: "Booking successful",
            bookings,
        });
    } catch {
      return res.json({ message: "internal error" });
    }
});

typedRouter.post("/available", authMiddleware, async (req: Request, res: Response) => {
    const { restaurantId, date: dateStr } = req.body;

    if (!restaurantId || !dateStr) {
        return res.status(400).json({ message: "Missing restaurantId or date" });
    }

    const rawDate = new Date(dateStr);
    const date = new Date(Date.UTC(rawDate.getUTCFullYear(), rawDate.getUTCMonth(), rawDate.getUTCDate()));

    try {
        const tables = await prismaClient.table.findMany({
            where: { restaurantId },
            select: { id: true, name: true, capacity: true }
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
            }
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
});


export const bookingsRouter = typedRouter;
