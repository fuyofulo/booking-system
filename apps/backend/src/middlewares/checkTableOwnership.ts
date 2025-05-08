import { Request, Response, NextFunction } from "express";
import { prismaClient } from "@repo/db/client";

// Middleware to check if tables belong to a restaurant
export const checkTableOwnership = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  
    const tableIds = req.body.tableIds;
    const restaurantId = req.body.restaurantId;
    const tableId = req.body.tableId;


  // Handle both single tableId and array of tableIds
  const tablesToCheck = tableIds || (tableId ? [tableId] : null);

  if (!tablesToCheck || !restaurantId) {
    return res.status(400).json({
      message: "Missing tableId/tableIds or restaurantId",
    });
  }

  try {
    // Check if all tables belong to the restaurant
    const tables = await prismaClient.table.findMany({
      where: {
        id: { in: tablesToCheck.map(Number) },
        restaurantId: Number(restaurantId),
      },
    });

    if (tables.length !== tablesToCheck.length) {
      return res.status(403).json({
        message: "One or more tables do not belong to this restaurant",
      });
    }

    // If validation passes, move to the next middleware or route handler
    next();
  } catch (error) {
    console.error("Error checking table ownership:", error);
    return res.status(500).json({
      message: "Internal server error",
    });
  }
};
