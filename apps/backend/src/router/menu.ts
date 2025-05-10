import { prismaClient } from "@repo/db/client";
import { Router, Request, Response } from "express";
import { checkPermission } from "../middlewares/checkPermission";
import { authMiddleware } from "../middlewares/auth";
import {
  CreateMenuSchema,
  CreateDishSchema,
  UpdateMenuSchema,
  UpdateDishSchema,
} from "@repo/schemas/types";

const router = Router();
const typedRouter = router as any;

typedRouter.post(
  "/create",
  authMiddleware,
  checkPermission("canManageMenu"),
  async (req: Request, res: Response) => {
    const data = req.body;
    const parsedData = CreateMenuSchema.safeParse(data);

    if (!parsedData.success) {
      return res.status(400).json({
        message: "Invalid input",
        errors: parsedData.error.errors,
      });
    }

    const name = parsedData.data.name;
    const description = parsedData.data.description;
    const restaurantId = parsedData.data.restaurantId;
    const imageUrl = parsedData.data.imageUrl;

    try {
      const existingMenu = await prismaClient.menu.findFirst({
        where: {
          restaurantId,
          name,
        },
      });

      if (existingMenu) {
        return res.status(400).json({
          message: "A menu with this name already exists in this restaurant",
        });
      }

      const newMenu = await prismaClient.menu.create({
        data: {
          name,
          description,
          restaurantId,
          ...(imageUrl && { imageUrl }),
        },
      });

      return res.json({
        message: "Menu created successfully",
        data: newMenu,
      });
    } catch (error) {
      console.error("Error creating menu:", error);
      return res.json({
        message: "An error occurred while creating the menu",
      });
    }
  }
);

// Create a new dish
typedRouter.post(
  "/dish/create",
  authMiddleware,
  checkPermission("canManageMenu"),
  async (req: Request, res: Response) => {
    const data = req.body;
    const parsedData = CreateDishSchema.safeParse(data);

    if (!parsedData.success) {
      return res.status(400).json({
        message: "Invalid input",
        errors: parsedData.error.errors,
      });
    }

    const name = parsedData.data.name;
    const description = parsedData.data.description;
    const price = parsedData.data.price;
    const imageUrl = parsedData.data.imageUrl;
    const isAvailable = parsedData.data.isAvailable;
    const calories = parsedData.data.calories;
    const isVegetarian = parsedData.data.isVegetarian;
    const menuId = parsedData.data.menuId;
    const restaurantId = parsedData.data.restaurantId;

    try {
      const menu = await prismaClient.menu.findFirst({
        where: {
          id: menuId,
          restaurantId,
        },
      });

      if (!menu) {
        return res.status(404).json({
          message: "Menu not found or does not belong to this restaurant",
        });
      }

      const newDish = await prismaClient.dish.create({
        data: {
          name,
          description,
          price,
          ...(imageUrl && { imageUrl }),
          ...(isAvailable !== undefined && { isAvailable }),
          ...(calories && { calories }),
          ...(isVegetarian !== undefined && { isVegetarian }),
          menuId,
          restaurantId,
        },
      });

      return res.status(201).json({
        message: "Dish created successfully",
        data: newDish,
      });
    } catch (error) {
      console.error("Error creating dish:", error);
      return res.status(500).json({
        message: "An error occurred while creating the dish",
      });
    }
  }
);

typedRouter.get(
  "/getMenus",
  authMiddleware,
  async (req: Request, res: Response) => {
    const restaurantId = req.query.restaurantId as string;

    try {
      const menus = await prismaClient.menu.findMany({
        where: {
          restaurantId: Number(restaurantId),
        },
      });

      return res.json({
        message: "Menus fetched successfully",
        data: menus,
      });
    } catch (error) {
      console.error("Error fetching menus:", error);
      return res.status(500).json({
        message: "An error occurred while fetching the menus",
      });
    }
  }
);

typedRouter.get(
  "/getDishes",
  authMiddleware,
  async (req: Request, res: Response) => {
    const restaurantId = req.query.restaurantId as string;
    const menuId = req.query.menuId as string;

    try {
      const dishes = await prismaClient.dish.findMany({
        where: {
          restaurantId: Number(restaurantId),
          menuId: Number(menuId),
        },
      });

      return res.json({
        message: "Dishes fetched successfully",
        data: dishes,
      });
    } catch (error) {
      console.error("Error fetching dishes:", error);
      return res.status(500).json({
        message: "An error occurred while fetching the dishes",
      });
    }
  }
);

typedRouter.post(
  "/update-menu",
  authMiddleware,
  checkPermission("canManageMenu"),
  async (req: Request, res: Response) => {
    const data = req.body;
    const parsedData = UpdateMenuSchema.safeParse(data);

    if (!parsedData.success) {
      return res.status(400).json({
        message: "Invalid input",
        errors: parsedData.error.errors,
      });
    }

    const restaurantId = parsedData.data.restaurantId;
    const menuId = parsedData.data.menuId;
    const name = parsedData.data.name;
    const description = parsedData.data.description;
    const imageUrl = parsedData.data.imageUrl;

    try {
      const updatedMenu = await prismaClient.menu.update({
        where: {
          id: menuId,
          restaurantId: restaurantId,
        },
        data: {
          name,
          description,
          ...(imageUrl && { imageUrl }),
        },
      });

      return res.json({
        message: "Menu updated successfully",
        data: updatedMenu,
      });
    } catch (error) {
      console.error("Error updating menu:", error);
      return res.status(500).json({
        message: "An error occurred while updating the menu",
      });
    }
  }
);

// Update a dish
typedRouter.post(
  "/update-dish",
  authMiddleware,
  checkPermission("canManageMenu"),
  async (req: Request, res: Response) => {
    const data = req.body;
    const parsedData = UpdateDishSchema.safeParse(data);

    if (!parsedData.success) {
      return res.status(400).json({
        message: "Invalid input",
        errors: parsedData.error.errors,
      });
    }

    const {
      dishId,
      name,
      description,
      price,
      imageUrl,
      isAvailable,
      calories,
      isVegetarian,
      menuId,
      restaurantId,
    } = parsedData.data;

    try {
      // First verify the dish belongs to the restaurant
      const existingDish = await prismaClient.dish.findFirst({
        where: {
          id: dishId,
          restaurantId,
        },
      });

      if (!existingDish) {
        return res.status(404).json({
          message: "Dish not found or does not belong to this restaurant",
        });
      }

      // Update the dish
      const updatedDish = await prismaClient.dish.update({
        where: {
          id: dishId,
        },
        data: {
          name,
          description,
          price,
          isAvailable,
          isVegetarian,
          menuId,
          ...(calories && { calories }),
          ...(imageUrl && { imageUrl }),
        },
      });

      return res.json({
        message: "Dish updated successfully",
        data: updatedDish,
      });
    } catch (error) {
      console.error("Error updating dish:", error);
      return res.status(500).json({
        message: "An error occurred while updating the dish",
      });
    }
  }
);

export const menuRouter = router;
