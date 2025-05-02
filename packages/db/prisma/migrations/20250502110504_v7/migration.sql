/*
  Warnings:

  - You are about to drop the column `timeSlotId` on the `Booking` table. All the data in the column will be lost.
  - You are about to drop the `TimeSlot` table. If the table is not empty, all the data it contains will be lost.
  - Added the required column `date` to the `Booking` table without a default value. This is not possible if the table is not empty.
  - Added the required column `slotIndex` to the `Booking` table without a default value. This is not possible if the table is not empty.

*/
-- DropForeignKey
ALTER TABLE "Booking" DROP CONSTRAINT "Booking_timeSlotId_fkey";

-- DropForeignKey
ALTER TABLE "TimeSlot" DROP CONSTRAINT "TimeSlot_restaurantId_fkey";

-- AlterTable
ALTER TABLE "Booking" DROP COLUMN "timeSlotId",
ADD COLUMN     "date" TIMESTAMP(3) NOT NULL,
ADD COLUMN     "slotIndex" INTEGER NOT NULL;

-- DropTable
DROP TABLE "TimeSlot";

-- CreateTable
CREATE TABLE "TableTimeSlot" (
    "id" SERIAL NOT NULL,
    "tableId" INTEGER NOT NULL,
    "date" TIMESTAMP(3) NOT NULL,
    "slotIndex" INTEGER NOT NULL,
    "isOpen" BOOLEAN NOT NULL,

    CONSTRAINT "TableTimeSlot_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "TableTimeSlot_tableId_date_slotIndex_key" ON "TableTimeSlot"("tableId", "date", "slotIndex");

-- CreateIndex
CREATE INDEX "Booking_date_slotIndex_idx" ON "Booking"("date", "slotIndex");

-- AddForeignKey
ALTER TABLE "TableTimeSlot" ADD CONSTRAINT "TableTimeSlot_tableId_fkey" FOREIGN KEY ("tableId") REFERENCES "Table"("id") ON DELETE CASCADE ON UPDATE CASCADE;
