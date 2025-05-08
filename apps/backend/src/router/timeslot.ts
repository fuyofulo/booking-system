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

// Simple endpoint to update a single timeslot
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
      // Normalize date to midnight
      const normalizedDate = new Date(date);
      normalizedDate.setUTCHours(0, 0, 0, 0);
      const dateISO = normalizedDate.toISOString();

      // Update or create the timeslot
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

// Endpoint to batch update multiple time slots for multiple tables and dates
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

      // Process each combination of table, date, and slot
      for (const tableId of tableIds) {
        createdCount.tables++;

        for (const dateStr of dates) {
          createdCount.dates++;

          // Normalize date to midnight
          const normalizedDate = new Date(dateStr);
          normalizedDate.setUTCHours(0, 0, 0, 0);
          const dateISO = normalizedDate.toISOString();

          for (const slotIndex of slotIndices) {
            createdCount.slots++;
            createdCount.total++;

            try {
              // Update or create the timeslot
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

export const timeslotRouter = typedRouter;
