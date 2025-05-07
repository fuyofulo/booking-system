import { Router, Request, Response } from "express";
import { authMiddleware } from "../middlewares/auth";
import { CreateRestaurantUserSchema, CreateRoleSchema } from "@repo/schemas/types";
import { prismaClient } from "@repo/db/client";
import { checkPermission } from "../middlewares/checkPermission";

const router: any = Router();
const typedRouter = router as any;

typedRouter.post("/create", authMiddleware, checkPermission('canManageStaff'), async (req: Request, res: Response) => {
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
        email: email
      }
    })

    if(!user) {
      return res.json({
        message: "the email you are trying to add does not exist"
      })
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

typedRouter.post("/getAll", authMiddleware, async (req:Request, res:Response) => {

  const restaurantId = req.body.restaurantId;

  const users = await prismaClient.restaurantUser.findMany({
    where: {
      restaurantId: restaurantId,
    },
    include: {
      user: true,
    },
  });

  return res.json(users);

})


export const restaurantUserRouter = typedRouter;
