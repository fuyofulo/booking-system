import { Request, Response, NextFunction } from "express";
import { prismaClient } from "@repo/db/client";

// List only the permission-related fields
type RolePermission = "canCreateRoles" | "canManageTables" | "canManageSlots" | "canManageStaff" | "canManageMenu" | "canManageOrders";

export function checkPermission(permission: RolePermission) {
    return async (req: Request, res: Response, next: NextFunction) => {
      // @ts-ignore
      const userId = req.userId;
  
      let restaurantId = req.body.restaurantId;

      if (!userId) {
        return res.status(401).json({ message: "Unauthorized user" });
      }

      if (!restaurantId) {
        return res.status(400).json({ message: "restaurantId is required" });
      }

      const restaurantUser = await prismaClient.restaurantUser.findFirst({
        where: { userId, restaurantId },
        include: { role: true }
      });

      if (!restaurantUser) {
        return res.status(403).json({ message: "You are not part of this restaurant" });
      }
  
      const userRole = restaurantUser.role;

      if (!userRole[permission as keyof typeof userRole]) {
        return res.status(403).json({ message: `You do not have permission to ${permission}` });
      }

      // @ts-ignore
      req.restaurantId = restaurantId;
  
      next();
    };
  }
  