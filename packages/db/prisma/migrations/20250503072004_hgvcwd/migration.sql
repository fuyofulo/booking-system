-- DropIndex
DROP INDEX "Role_restaurantId_name_key";

-- AlterTable
ALTER TABLE "Role" ALTER COLUMN "canCreateRoles" DROP DEFAULT,
ALTER COLUMN "canManageSlots" DROP DEFAULT,
ALTER COLUMN "canManageStaff" DROP DEFAULT,
ALTER COLUMN "canManageTables" DROP DEFAULT;
