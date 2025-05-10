import { Router, Request, Response } from "express";
import { authMiddleware } from "../middlewares/auth";
import { checkPermission } from "../middlewares/checkPermission";
import {
  UpdateOneSlotSchema,
  BatchUpdateSlotsSchema,
} from "@repo/schemas/types";
import { prismaClient } from "@repo/db/client";
import { z } from "zod";
import { checkTableOwnership } from "../middlewares/checkTableOwnership";
const router = Router();
const typedRouter = router as any;

typedRouter.post(
  "/update-one",
  authMiddleware,
  checkPermission("canManageSlots"),
  checkTableOwnership,
  async (req: Request, res: Response) => {
    const data = req.body;
    const parsedData = UpdateOneSlotSchema.safeParse(data);
    if (!parsedData.success) {
      return res.status(400).json({
        message: "Invalid inputs",
      });
    }

    const tableId = parsedData.data.tableId;
    const date = parsedData.data.date;
    const slotIndex = parsedData.data.slotIndex;
    const isOpen = parsedData.data.isOpen;

    try {
      const normalizedDate = new Date(date);
      normalizedDate.setUTCHours(0, 0, 0, 0);
      const dateISO = normalizedDate.toISOString();

      const result = await prismaClient.tableTimeSlot.upsert({
        where: {
          tableId_date_slotIndex: {
            tableId,
            date: dateISO,
            slotIndex,
          },
        },
        update: {
          isOpen,
        },
        create: {
          tableId,
          date: dateISO,
          slotIndex,
          isOpen,
        },
      });

      return res.json({
        message: "Time slot updated successfully",
        slot: result,
      });
    } catch (err) {
      console.error("Error updating time slot:", err);
      return res.status(500).json({
        message: "Failed to update time slot",
      });
    }
  }
);

typedRouter.post(
  "/batch-update",
  authMiddleware,
  checkPermission("canManageSlots"),
  checkTableOwnership,
  async (req: Request, res: Response) => {
    const data = req.body;
    const parsedData = BatchUpdateSlotsSchema.safeParse(data);

    if (!parsedData.success) {
      return res.status(400).json({
        message: "Invalid inputs",
        errors: parsedData.error.format(),
      });
    }

    const tableIds = parsedData.data.tableIds;
    const dates = parsedData.data.dates;
    const slotIndices = parsedData.data.slotIndices;
    const isOpen = parsedData.data.isOpen;
    const restaurantId = parsedData.data.restaurantId;

    try {
      const results = [];
      const createdCount = { tables: 0, dates: 0, slots: 0, total: 0 };
      for (const tableId of tableIds) {
        createdCount.tables++;

        for (const dateStr of dates) {
          createdCount.dates++;

          const normalizedDate = new Date(dateStr);
          normalizedDate.setUTCHours(0, 0, 0, 0);
          const dateISO = normalizedDate.toISOString();

          for (const slotIndex of slotIndices) {
            createdCount.slots++;
            createdCount.total++;

            try {
              const result = await prismaClient.tableTimeSlot.upsert({
                where: {
                  tableId_date_slotIndex: {
                    tableId,
                    date: dateISO,
                    slotIndex,
                  },
                },
                update: {
                  isOpen,
                },
                create: {
                  tableId,
                  date: dateISO,
                  slotIndex,
                  isOpen,
                },
              });

              results.push(result);
            } catch (err) {
              console.error("Error upserting time slot:", {
                tableId,
                dateISO,
                slotIndex,
                err,
              });
            }
          }
        }
      }

      return res.json({
        message: "Batch time slot update successful",
        stats: {
          tablesProcessed: tableIds.length,
          datesProcessed: dates.length,
          slotsProcessed: slotIndices.length,
          totalSlotsUpdated: results.length,
        },
        results: results,
      });
    } catch (err) {
      console.error("Error during batch update of time slots:", err);
      return res.status(500).json({
        message: "Failed to update time slots",
      });
    }
  }
);

// Add endpoint to get time slots for a specific table and date
typedRouter.get(
  "/table/:tableId/date/:date",
  authMiddleware,
  async (req: Request, res: Response) => {
    try {
      const tableId = parseInt(req.params.tableId!);
      const dateStr = req.params.date;

      if (isNaN(tableId)) {
        return res.status(400).json({
          message: "Invalid table ID",
        });
      }

      // Validate date format (YYYY-MM-DD)
      if (!/^\d{4}-\d{2}-\d{2}$/.test(dateStr!)) {
        return res.status(400).json({
          message: "Invalid date format. Use YYYY-MM-DD",
        });
      }

      const normalizedDate = new Date(dateStr!);
      normalizedDate.setUTCHours(0, 0, 0, 0);
      const dateISO = normalizedDate.toISOString();

      // Get the table to check if user has access to this restaurant
      const table = await prismaClient.table.findUnique({
        where: { id: tableId },
        include: { restaurant: true },
      });

      if (!table) {
        return res.status(404).json({
          message: "Table not found",
        });
      }

      // Check if user has access to this restaurant
      // @ts-ignore
      const userId = req.user.id;
      const restaurantUser = await prismaClient.restaurantUser.findFirst({
        where: {
          userId,
          restaurantId: table.restaurantId,
        },
      });

      if (!restaurantUser) {
        return res.status(403).json({
          message: "You don't have access to this restaurant",
        });
      }

      // Get time slots for this table and date
      const timeSlots = await prismaClient.tableTimeSlot.findMany({
        where: {
          tableId,
          date: dateISO,
        },
        orderBy: {
          slotIndex: "asc",
        },
      });

      return res.json({
        message: "Time slots retrieved successfully",
        timeSlots,
      });
    } catch (err) {
      console.error("Error retrieving time slots:", err);
      return res.status(500).json({
        message: "Failed to retrieve time slots",
      });
    }
  }
);

export const timeslotRouter = typedRouter;
