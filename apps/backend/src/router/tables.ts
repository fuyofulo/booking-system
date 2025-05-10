import { prismaClient } from "@repo/db/client";
import { CreateTableSchema } from "@repo/schemas/types";
import { Router, Request, Response } from "express";
import { checkPermission } from "../middlewares/checkPermission";
import { authMiddleware } from "../middlewares/auth";
const router: any = Router();
const typedRouter = router as any;

typedRouter.post(
  "/create",
  authMiddleware,
  checkPermission("canManageTables"),
  async (req: Request, res: Response) => {
    const data = req.body;
    const parsedData = CreateTableSchema.safeParse(data);
    if (!parsedData.success) {
      return res.json({
        message: "invalid input",
      });
    }

    const restaurantId = parsedData.data.restaurantId;
    const tableName = parsedData.data.name;
    const capacity = parsedData.data.capacity;

    try {
      const table = await prismaClient.table.create({
        data: {
          restaurantId: restaurantId,
          name: tableName,
          capacity: capacity,
        },
      });

      if (!table) {
        return res.json({
          message: "failed to create table",
        });
      }

      return res.json({
        message: "table created successfully",
        table: {
          id: table.id,
          name: table.name,
          capacity: table.capacity,
          restaurantId: table.restaurantId,
        },
      });
    } catch (error) {
      console.error("Error creating table:", error);
      return res.status(500).json({
        message: "Server error",
      });
    }
  }
);

// Get all tables for a restaurant
typedRouter.get("/", authMiddleware, async (req: Request, res: Response) => {
  const restaurantId = req.query.restaurantId;

  if (!restaurantId) {
    return res.status(400).json({
      message: "Restaurant ID is required",
    });
  }

  try {
    const tables = await prismaClient.table.findMany({
      where: {
        restaurantId: Number(restaurantId),
      },
      orderBy: {
        name: "asc",
      },
    });

    return res.json({
      tables,
    });
  } catch (error) {
    console.error("Error fetching tables:", error);
    return res.status(500).json({
      message: "Server error",
    });
  }
});

// Get table by ID
typedRouter.get("/:id", authMiddleware, async (req: Request, res: Response) => {
  const tableId = req.params.id;

  try {
    const table = await prismaClient.table.findUnique({
      where: {
        id: Number(tableId),
      },
    });

    if (!table) {
      return res.status(404).json({
        message: "Table not found",
      });
    }

    return res.json({
      table,
    });
  } catch (error) {
    console.error("Error fetching table:", error);
    return res.status(500).json({
      message: "Server error",
    });
  }
});

// Update table
typedRouter.put(
  "/:id",
  authMiddleware,
  checkPermission("canManageTables"),
  async (req: Request, res: Response) => {
    const tableId = req.params.id;
    const { name, capacity } = req.body;

    if (!name || !capacity) {
      return res.status(400).json({
        message: "Name and capacity are required",
      });
    }

    try {
      const table = await prismaClient.table.update({
        where: {
          id: Number(tableId),
        },
        data: {
          name,
          capacity: Number(capacity),
        },
      });

      return res.json({
        message: "Table updated successfully",
        table,
      });
    } catch (error) {
      console.error("Error updating table:", error);
      return res.status(500).json({
        message: "Server error",
      });
    }
  }
);

// Delete table
typedRouter.delete(
  "/:id",
  authMiddleware,
  checkPermission("canManageTables"),
  async (req: Request, res: Response) => {
    const tableId = req.params.id;

    try {
      await prismaClient.table.delete({
        where: {
          id: Number(tableId),
        },
      });

      return res.json({
        message: "Table deleted successfully",
      });
    } catch (error) {
      console.error("Error deleting table:", error);
      return res.status(500).json({
        message: "Server error",
      });
    }
  }
);

export const tablesRouter = typedRouter;
