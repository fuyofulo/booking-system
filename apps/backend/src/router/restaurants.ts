import { Router, Request, Response } from "express";
import { prismaClient } from "@repo/db/client";
import jwt from "jsonwebtoken";
import { authMiddleware } from "../middlewares/auth";
import { CreateRestaurantSchema } from "@repo/schemas/types";

const router: any = Router();
const typedRouter = router as any;

typedRouter.post("/create", authMiddleware, async (req: Request, res: Response) => {
  const data = req.body;
  const parsedData = CreateRestaurantSchema.safeParse(data);
  if (!parsedData.success) {
    return res.json({
      message: "invalid name",
    });
  }

  //@ts-ignore
  const ownerId = req.userId;

  try {
    // creating the restaurant
    const restaurant = await prismaClient.restaurant.create({
      data: {
        name: parsedData.data.name,
        ownerId: ownerId,
      },
    });

    // creating the owner role for the restaurant
    const role = await prismaClient.role.create({
      data: {
        name: "Owner",
        restaurant: {
          connect: {
            id: restaurant.id, 
          },
        },
        canCreateRoles: true,
        canManageTables: true,
        canManageSlots: true,
        canManageStaff: true,
        canManageMenu: true,
        canManageOrders: true,
      },
    });


    // creating restaurant user 
    const restaurantUser = await prismaClient.restaurantUser.create({
      data: {
        userId: ownerId,
        restaurantId: restaurant.id,
        roleId: role.id,
      },
    });

    // returning appropriate data
    return res.json({
      message: "Restaurant created successfully",
      restaurant: {
        id: restaurant.id,
        name: restaurant.name,
        ownerId: restaurant.ownerId,
      },
      role: {
        id: role.id,
        name: role.name,
        permissions: {
          canCreateRoles: role.canCreateRoles,
          canManageTables: role.canManageTables,
          canManageSlots: role.canManageSlots,
          canManageStaff: role.canManageStaff,
        },
      },
      restaurantUser: {
        userId: ownerId,
        restaurantId: restaurant.id,
        roleId: role.id,
        id: restaurantUser.id, 
      },
    });
  } catch (err) {
    return res
      .status(500)
      .json({ message: "Failed to create restaurant", error: err });
  }
});

export const restaurantRouter = typedRouter;
