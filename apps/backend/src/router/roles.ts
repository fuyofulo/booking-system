import { Router, Request, Response } from "express";
import { authMiddleware } from "../middlewares/auth";
import { CreateRoleSchema } from "@repo/schemas/types";
import { prismaClient } from "@repo/db/client";
import { checkPermission } from "../middlewares/checkPermission";

const router: any = Router();
const typedRouter = router as any;

typedRouter.post("/create", authMiddleware, checkPermission("canCreateRoles"), async (req: Request, res: Response) => {
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

  try {
    const newRole = await prismaClient.role.create({
      data: {
        name,
        canCreateRoles: canCreateRoles ?? false,
        canManageTables: canManageTables ?? false,
        canManageSlots: canManageSlots ?? false,
        canManageStaff: canManageStaff ?? false,
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
});

export const roleRouter = typedRouter;
