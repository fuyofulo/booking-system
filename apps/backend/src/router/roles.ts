import { Router, Request, Response } from "express";
import { authMiddleware } from "../middlewares/auth";
import {
  CreateRoleSchema,
  UpdateRolePermissionsSchema,
} from "@repo/schemas/types";
import { prismaClient } from "@repo/db/client";
import { checkPermission } from "../middlewares/checkPermission";

const router: any = Router();
const typedRouter = router as any;

typedRouter.post(
  "/create",
  authMiddleware,
  checkPermission("canCreateRoles"),
  async (req: Request, res: Response) => {
    const data = req.body;
    const parsedData = CreateRoleSchema.safeParse(data);
    if (!parsedData.success) {
      return res.json({
        message: "enter proper data",
      });
    }

    // @ts-ignore
    const userId = req.userId;

    const name = parsedData.data.name;
    const restaurantId = parsedData.data.restaurantId;
    const canCreateRoles = parsedData.data.canCreateRoles;
    const canManageTables = parsedData.data.canManageTables;
    const canManageSlots = parsedData.data.canManageSlots;
    const canManageStaff = parsedData.data.canManageStaff;
    const canManageMenu = parsedData.data.canManageMenu;
    const canManageOrders = parsedData.data.canManageOrders;

    try {
      const newRole = await prismaClient.role.create({
        data: {
          name,
          restaurant: {
            connect: {
              id: restaurantId,
            },
          },
          canCreateRoles: canCreateRoles ?? false,
          canManageTables: canManageTables ?? false,
          canManageSlots: canManageSlots ?? false,
          canManageStaff: canManageStaff ?? false,
          canManageMenu: canManageMenu ?? false,
          canManageOrders: canManageOrders ?? false,
        },
      });

      return res.json({
        message: "Role created successfully",
        role: newRole,
      });
    } catch {
      return res.json({
        message: "Failed to create role",
      });
    }
  }
);

typedRouter.post(
  "/update",
  authMiddleware,
  checkPermission("canCreateRoles"),
  async (req: Request, res: Response) => {
    try {
      const parsedData = UpdateRolePermissionsSchema.safeParse(req.body);
      if (!parsedData.success) {
        return res.status(400).json({
          success: false,
          message: "Invalid input data",
          errors: parsedData.error.errors,
        });
      }

      const {
        roleId,
        restaurantId,
        canCreateRoles,
        canManageTables,
        canManageSlots,
        canManageStaff,
        canManageMenu,
        canManageOrders,
      } = parsedData.data;

      const existingRole = await prismaClient.role.findFirst({
        where: {
          id: roleId,
          restaurantId,
        },
      });

      if (!existingRole) {
        return res.status(404).json({
          success: false,
          message: "Role not found or doesn't belong to this restaurant",
        });
      }

      const updateData: any = {};
      if (canCreateRoles !== undefined)
        updateData.canCreateRoles = canCreateRoles;
      if (canManageTables !== undefined)
        updateData.canManageTables = canManageTables;
      if (canManageSlots !== undefined)
        updateData.canManageSlots = canManageSlots;
      if (canManageStaff !== undefined)
        updateData.canManageStaff = canManageStaff;
      if (canManageMenu !== undefined) updateData.canManageMenu = canManageMenu;
      if (canManageOrders !== undefined)
        updateData.canManageOrders = canManageOrders;

      if (Object.keys(updateData).length === 0) {
        return res.status(400).json({
          success: false,
          message: "No permissions were provided to update",
        });
      }

      // Update the role
      const updatedRole = await prismaClient.role.update({
        where: {
          id: roleId,
        },
        data: updateData,
      });

      return res.json({
        success: true,
        message: "Role permissions updated successfully",
        data: updatedRole,
      });
    } catch (error) {
      console.error("Error updating role permissions:", error);
      return res.status(500).json({
        success: false,
        message: "An error occurred while updating role permissions",
      });
    }
  }
);

typedRouter.get(
  "/getRoles/:restaurantId",
  authMiddleware,
  async (req: Request, res: Response) => {
    const restaurantId = req.params.restaurantId;
    const parsedRestaurantId = parseInt(restaurantId!);
    const roles = await prismaClient.role.findMany({
      where: {
        restaurantId: parsedRestaurantId,
      },
    });

    return res.json({
      message: "Roles fetched successfully",
      roles,
    });
  }
);

typedRouter.post(
  "/change",
  authMiddleware,
  checkPermission("canManageStaff"),
  async (req: Request, res: Response) => {
    const { userId, restaurantId, newRoleId } = req.body;
    //@ts-ignore
    const currentUserId = req.userId;

    // Check if the new role exists and belongs to the restaurant
    const newRole = await prismaClient.role.findFirst({
      where: {
        id: newRoleId,
        restaurantId: restaurantId,
      },
    });

    if (!newRole) {
      return res.status(400).json({
        message: "Invalid role ID or role doesn't belong to this restaurant",
      });
    }

    // Find the RestaurantUser record for the target user
    const restaurantUser = await prismaClient.restaurantUser.findFirst({
      where: {
        userId: userId, // Use the userId from request body, not the authenticated user
        restaurantId: restaurantId,
      },
    });

    if (!restaurantUser) {
      return res
        .status(404)
        .json({ message: "Target user is not part of this restaurant" });
    }

    // Update the target user's role using the id
    const updatedUserRestaurant = await prismaClient.restaurantUser.update({
      where: {
        id: restaurantUser.id,
      },
      data: {
        roleId: newRoleId,
      },
      include: {
        role: true,
      },
    });

    return res.json(updatedUserRestaurant);
  }
);

export const roleRouter = typedRouter;
