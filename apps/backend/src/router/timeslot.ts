import { Router, Request, Response } from "express";
import { authMiddleware } from "../middlewares/auth";
import { checkPermission } from "../middlewares/checkPermission";
import { updateTimeSlotsSchema } from "@repo/schemas/types";
import { prismaClient } from "@repo/db/client";

const router: any = Router();
const typedRouter = router as any;

typedRouter.post('/update', authMiddleware, checkPermission("canManageSlots"), async (req: Request, res: Response) => {

    const body = req.body;
    const parsedData = updateTimeSlotsSchema.safeParse(body);

    if (!parsedData.success) {
        return res.json({
            message: "Invalid inputs",
        });
    }

    const entries = parsedData.data.entries;

    try {
        const results = [];
        const allDesiredKeys = new Set<string>();
        const tableDateSet = new Set<string>();

        for (let k = 0; k < entries.length; k++) {
            const entry = entries[k];
            const { tableIds, date, slotIndices, isOpen } = entry!;

            const normalizedDate = new Date(date);
            normalizedDate.setUTCHours(0, 0, 0, 0);
            const dateISO = normalizedDate.toISOString();

            for (let i = 0; i < tableIds.length; i++) {
                const tableId = tableIds[i];
                const tableDateKey = `${tableId}|${dateISO}`;
                tableDateSet.add(tableDateKey);

                for (let j = 0; j < slotIndices.length; j++) {
                    const slotIndex = slotIndices[j];

                    if (typeof slotIndex !== 'number' || typeof tableId !== 'number') {
                        console.error("Invalid tableId or slotIndex:", tableId, slotIndex);
                        continue;
                    }

                    const key = `${tableId}-${dateISO}-${slotIndex}`;
                    allDesiredKeys.add(key);

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
                        console.log("Error upserting slot:", { tableId, slotIndex, err });
                    }
                }
            }
        }

        // Fetch and delete stale slots
        const staleSlotIds: number[] = [];

        for (const tableDateKey of tableDateSet) {
            const [tableIdStr, dateISO] = tableDateKey.split("|");
            const tableId = Number(tableIdStr);

            const existingSlots = await prismaClient.tableTimeSlot.findMany({
                where: {
                    tableId,
                    date: dateISO,
                },
            });

            for (const slot of existingSlots) {
                const key = `${slot.tableId}-${slot.date.toISOString()}-${slot.slotIndex}`;
                if (!allDesiredKeys.has(key)) {
                    staleSlotIds.push(slot.id);
                }
            }
        }

        if (staleSlotIds.length > 0) {
            await prismaClient.tableTimeSlot.deleteMany({
                where: {
                    id: { in: staleSlotIds },
                },
            });
        }

        return res.json({
            message: "Time slots updated successfully",
            results,
            deletedSlotIds: staleSlotIds,
        });

    } catch (err) {
        console.error("Error during time slot update:", err);
        return res.json({
            message: "Failed to update time slots",
        });
    }
});




export const timeslotRouter = typedRouter;
