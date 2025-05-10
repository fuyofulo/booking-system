import { Router, Request, Response } from "express";
import { authMiddleware } from "../middlewares/auth";
import {
  CreateRestaurantUserSchema,
  CreateRoleSchema,
} from "@repo/schemas/types";
import { prismaClient } from "@repo/db/client";
import { checkPermission } from "../middlewares/checkPermission";

const router: any = Router();
const typedRouter = router as any;

typedRouter.post(
  "/create",
  authMiddleware,
  checkPermission("canManageStaff"),
  async (req: Request, res: Response) => {
    const data = req.body;
    const parsedData = CreateRestaurantUserSchema.safeParse(data);
    if (!parsedData.success) {
      return res.json({
        message: "Invalid inputs",
      });
    }

    const email = parsedData.data.email;
    const restaurantId = parsedData.data.restaurantId;
    const roleId = parsedData.data.roleId;

    try {
      const user = await prismaClient.user.findUnique({
        where: {
          email: email,
        },
      });

      if (!user) {
        return res.json({
          message: "the email you are trying to add does not exist",
        });
      }

      const newUserId = user.id;

      const existingAssociation = await prismaClient.restaurantUser.findFirst({
        where: {
          userId: newUserId,
          restaurantId,
        },
      });

      if (existingAssociation) {
        return res.json({ message: "User is already part of this restaurant" });
      }

      const restaurantUser = await prismaClient.restaurantUser.create({
        data: {
          userId: newUserId,
          restaurantId: restaurantId,
          roleId: roleId,
        },
      });

      return res.json({
        message: "User added to restaurant successfully",
        data: restaurantUser,
      });
    } catch {
      return res.json({ message: "Server error" });
    }
  }
);

typedRouter.get(
  "/getAll/:restaurantId",
  authMiddleware,
  async (req: Request, res: Response) => {
    const restaurantId = req.params.restaurantId;

    const users = await prismaClient.restaurantUser.findMany({
      where: {
        restaurantId: parseInt(restaurantId!),
      },
      include: {
        user: {
          select: {
            id: true,
            email: true,
            name: true,
          },
        },
        role: {
          select: {
            id: true,
            name: true,
            canCreateRoles: true,
            canManageSlots: true,
            canManageStaff: true,
            canManageMenu: true,
            canManageOrders: true,
            canManageTables: true
          },
        },
      },
    });

    return res.json(users);
  }
);

typedRouter.post("/me", authMiddleware, async (req: Request, res: Response) => {
  const restaurantId = req.body.restaurantId;
  //@ts-ignore
  const userId = req.userId;

  const user = await prismaClient.restaurantUser.findFirst({
    where: {
      userId: userId,
      restaurantId: restaurantId,
    },
    include: {
      role: true,
    },
  });

  return res.json(user);
});



export const restaurantUserRouter = typedRouter;
