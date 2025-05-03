/*
  Warnings:

  - A unique constraint covering the columns `[restaurantId,name]` on the table `Role` will be added. If there are existing duplicate values, this will fail.
  - Added the required column `restaurantId` to the `Role` table without a default value. This is not possible if the table is not empty.

*/
-- DropIndex
DROP INDEX "Role_name_key";

-- AlterTable
ALTER TABLE "Role" ADD COLUMN     "restaurantId" INTEGER NOT NULL;

-- CreateIndex
CREATE UNIQUE INDEX "Role_restaurantId_name_key" ON "Role"("restaurantId", "name");

-- AddForeignKey
ALTER TABLE "Role" ADD CONSTRAINT "Role_restaurantId_fkey" FOREIGN KEY ("restaurantId") REFERENCES "Restaurant"("id") ON DELETE CASCADE ON UPDATE CASCADE;
