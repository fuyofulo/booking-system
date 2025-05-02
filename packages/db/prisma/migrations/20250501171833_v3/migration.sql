-- AlterTable
ALTER TABLE "Role" ADD COLUMN     "canCreateRoles" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "canManageSlots" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "canManageStaff" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "canManageTables" BOOLEAN NOT NULL DEFAULT false;
