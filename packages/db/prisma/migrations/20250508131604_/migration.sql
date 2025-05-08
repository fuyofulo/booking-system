/*
  Warnings:

  - You are about to drop the column `slotIndex` on the `Booking` table. All the data in the column will be lost.

*/
-- DropIndex
DROP INDEX "Booking_date_slotIndex_idx";

-- AlterTable
ALTER TABLE "Booking" DROP COLUMN "slotIndex",
ADD COLUMN     "slotIndices" INTEGER[];

-- CreateIndex
CREATE INDEX "Booking_date_idx" ON "Booking"("date");
