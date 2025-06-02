-- AlterTable
ALTER TABLE "TableTimeSlot" ADD COLUMN     "bookingId" INTEGER;

-- AddForeignKey
ALTER TABLE "TableTimeSlot" ADD CONSTRAINT "TableTimeSlot_bookingId_fkey" FOREIGN KEY ("bookingId") REFERENCES "Booking"("id") ON DELETE SET NULL ON UPDATE CASCADE;
