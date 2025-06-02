/*
  Warnings:

  - You are about to drop the column `bookingId` on the `TableTimeSlot` table. All the data in the column will be lost.

*/
-- DropForeignKey
ALTER TABLE "TableTimeSlot" DROP CONSTRAINT "TableTimeSlot_bookingId_fkey";

-- DropIndex
DROP INDEX "Booking_tableId_date_idx";

-- DropIndex
DROP INDEX "TableTimeSlot_bookingId_idx";

-- AlterTable
ALTER TABLE "Booking" ADD COLUMN     "slotIndices" INTEGER[];

-- AlterTable
ALTER TABLE "TableTimeSlot" DROP COLUMN "bookingId";
