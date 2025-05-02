import { z } from "zod"

// -------------------- Auth --------------------

export const SignUpSchema = z.object({
  name: z.string().min(1, "Name is required"),
  email: z.string().email(),
  password: z.string().min(6),
})

export const SignInSchema = z.object({
  email: z.string().email(),
  password: z.string().min(6),
})

// -------------------- Restaurant --------------------

export const CreateRestaurantSchema = z.object({
  name: z.string().min(3, "Restaurant name is required"),
})

// -------------------- Role --------------------

export const CreateRoleSchema = z.object({
  name: z.string().min(1),
  restaurantId: z.number(),
  canCreateRoles: z.boolean().optional().default(false),
  canManageTables: z.boolean().optional().default(false),
  canManageSlots: z.boolean().optional().default(false),
  canManageStaff: z.boolean().optional().default(false),
});

// -------------------- Table --------------------

export const CreateTableSchema = z.object({
  restaurantId: z.number(),
  name: z.string().min(1),
  capacity: z.number().int().min(1),
})

// -------------------- TimeSlot --------------------

export const CreateTimeSlotSchema = z.object({
  restaurantId: z.number(),
  date: z.string().refine((val) => !isNaN(Date.parse(val)), {
    message: "Invalid date",
  }),
  slotIndex: z.number().int().min(0).max(95),
  isOpen: z.boolean(),
})

// -------------------- Booking --------------------

export const CreateBookingSchema = z.object({
  tableId: z.number(),
  timeSlotId: z.number(),
  customerName: z.string().min(1),
  customerPhone: z.string().optional(),
})

// -------------------- Restaurant User --------------------

export const CreateRestaurantUserSchema = z.object({
  email: z.string().email("Invalid email"),
  restaurantId: z.number(),
  roleId: z.number()
});