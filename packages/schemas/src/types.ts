import { z } from "zod";

// -------------------- Auth --------------------

export const SignUpSchema = z.object({
  name: z.string().min(1, "Name is required"),
  email: z.string().email(),
  password: z.string().min(6),
});

export const SignInSchema = z.object({
  email: z.string().email(),
  password: z.string().min(6),
});

// -------------------- Restaurant --------------------

export const CreateRestaurantSchema = z.object({
  name: z.string().min(3, "Restaurant name is required"),
});

// -------------------- Role --------------------

export const CreateRoleSchema = z.object({
  name: z.string().min(1),
  restaurantId: z.number(),
  canCreateRoles: z.boolean().optional().default(false),
  canManageTables: z.boolean().optional().default(false),
  canManageSlots: z.boolean().optional().default(false),
  canManageStaff: z.boolean().optional().default(false),
  canManageMenu: z.boolean().optional().default(false),
  canManageOrders: z.boolean().optional().default(false),
});

export const UpdateRolePermissionsSchema = z.object({
  roleId: z.number().int().positive(),
  restaurantId: z.number().int().positive(), // For security validation
  canCreateRoles: z.boolean().optional(),
  canManageTables: z.boolean().optional(),
  canManageSlots: z.boolean().optional(),
  canManageStaff: z.boolean().optional(),
  canManageMenu: z.boolean().optional(),
  canManageOrders: z.boolean().optional(),
});

// -------------------- Table --------------------

export const CreateTableSchema = z.object({
  restaurantId: z.number(),
  name: z.string().min(1),
  capacity: z.number().int().min(1),
});

// -------------------- Booking --------------------

export const CreateBookingSchema = z.object({
  tableId: z.number(),
  restaurantId: z.number(),
  date: z.string(), // YYYY-MM-DD format (e.g., "2025-05-08")
  slotIndices: z.number().array().min(1),
  customerName: z.string().min(1),
  customerPhone: z.string().optional(),
});

// -------------------- Restaurant User --------------------

//works
export const CreateRestaurantUserSchema = z.object({
  email: z.string().email("Invalid email"),
  restaurantId: z.number(),
  roleId: z.number(),
});

// -------------------- TimeSlot --------------------

// Simple schema for updating a single time slot
//works
export const UpdateOneSlotSchema = z.object({
  tableId: z.number().int().positive(),
  date: z.string(), // Date in string format (e.g., "2025-05-01")
  slotIndex: z.number().int().min(0).max(47), // 0-47 for the 48 half-hour slots in a day
  isOpen: z.boolean(),
  restaurantId: z.number().int().positive(), // For security validation
});

// Schema for batch updating multiple time slots
//works
export const BatchUpdateSlotsSchema = z.object({
  tableIds: z
    .array(z.number().int().positive())
    .min(1, "At least one table must be specified"),
  dates: z.array(z.string()).min(1, "At least one date must be specified"),
  slotIndices: z
    .array(z.number().int().min(0).max(47))
    .min(1, "At least one slot index must be specified"),
  isOpen: z.boolean(),
  restaurantId: z.number().int().positive(),
});

// -------------------- Menu --------------------
//works
export const CreateMenuSchema = z.object({
  name: z.string().min(1, "Menu name is required"),
  description: z.string().optional(),
  restaurantId: z.number().int().positive(),
  imageUrl: z.string().url("Valid image URL is required").optional(),
});

//works
export const CreateDishSchema = z.object({
  name: z.string().min(1, "Dish name is required"),
  description: z.string().optional(),
  price: z.number().positive("Price must be a positive number"),
  imageUrl: z.string().url("Valid image URL is required").optional(),
  isAvailable: z.boolean().optional().default(true),
  calories: z.number().int().positive().optional(),
  isVegetarian: z.boolean().optional().default(false),
  menuId: z.number().int().positive(),
  restaurantId: z.number().int().positive(),
});

// -------------------- Order --------------------

export const OrderItemInput = z.object({
  dishId: z.number().int().positive(),
  quantity: z.number().int().positive(),
});

export const CreateOrderSchema = z.object({
  restaurantId: z.number().int().positive(),
  tableId: z.number().int().positive(),
  bookingId: z.number().int().positive(), // Required - each order is linked to a booking
  notes: z.string().optional(),
  items: z.array(OrderItemInput).min(1, "At least one item is required"),
});

// Valid status values for order items
export const OrderItemStatusEnum = z.enum([
  "pending",
  "preparing",
  "ready",
  "served",
  "cancelled"
]);

export const UpdateOrderItemStatusSchema = z.object({
  orderItemIds: z.array(z.number().int().positive()).min(1, "At least one order item ID is required"),
  status: OrderItemStatusEnum,
  restaurantId: z.number().int().positive(), // For security validation
});
