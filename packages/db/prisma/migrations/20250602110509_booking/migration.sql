/*
  Warnings:

  - You are about to drop the column `slotIndices` on the `Booking` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "Booking" DROP COLUMN "slotIndices";

-- AlterTable
ALTER TABLE "TableTimeSlot" ADD COLUMN     "bookingId" INTEGER;

-- CreateIndex
CREATE INDEX "Booking_tableId_date_idx" ON "Booking"("tableId", "date");

-- CreateIndex
CREATE INDEX "TableTimeSlot_bookingId_idx" ON "TableTimeSlot"("bookingId");

-- AddForeignKey
ALTER TABLE "TableTimeSlot" ADD CONSTRAINT "TableTimeSlot_bookingId_fkey" FOREIGN KEY ("bookingId") REFERENCES "Booking"("id") ON DELETE SET NULL ON UPDATE CASCADE;
