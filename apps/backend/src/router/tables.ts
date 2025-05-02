import { prismaClient } from "@repo/db/client";
import { CreateTableSchema } from "@repo/schemas/types";
import { Router, Request, Response } from "express";
import { checkPermission } from "../middlewares/checkPermission";
import { authMiddleware } from "../middlewares/auth";
const router: any = Router();
const typedRouter = router as any;



typedRouter.post('/create', authMiddleware, checkPermission("canManageTables"), async(req: Request, res: Response) => {
    const data = req.body;
    const parsedData = CreateTableSchema.safeParse(data);
    if(!parsedData.success) {
        return res.json({
            message: "invalid input"
        })
    }

    const restaurantId = parsedData.data.restaurantId;
    const tableName = parsedData.data.name;
    const capacity = parsedData.data.capacity;

    try {
        const table = await prismaClient.table.create({
            data: {
                restaurantId: restaurantId,
                name: tableName,
                capacity: capacity
            }
        })

        if(!table) {
            return res.json({
                message: "failed to create table"
            })
        }

        return res.json({
            message: "table created successfully",
            table: {
                id: table.id,
                name: table.name,
                capacity: table.capacity,
                restaurantId: table.restaurantId

            }
        })
    } catch {
        console.log("server error");
    }
})



export const tablesRouter = typedRouter;