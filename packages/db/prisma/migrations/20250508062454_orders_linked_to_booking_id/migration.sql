-- AlterTable
ALTER TABLE "Order" ADD COLUMN     "bookingId" INTEGER;

-- AlterTable
ALTER TABLE "Role" ALTER COLUMN "canCreateRoles" SET DEFAULT false,
ALTER COLUMN "canManageSlots" SET DEFAULT false,
ALTER COLUMN "canManageStaff" SET DEFAULT false,
ALTER COLUMN "canManageTables" SET DEFAULT false,
ALTER COLUMN "canManageMenu" SET DEFAULT false;

-- CreateIndex
CREATE INDEX "Order_bookingId_idx" ON "Order"("bookingId");

-- AddForeignKey
ALTER TABLE "Order" ADD CONSTRAINT "Order_bookingId_fkey" FOREIGN KEY ("bookingId") REFERENCES "Booking"("id") ON DELETE SET NULL ON UPDATE CASCADE;
