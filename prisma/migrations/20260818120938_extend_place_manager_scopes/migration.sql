-- AlterEnum
-- This migration adds more than one value to an enum.
-- With PostgreSQL versions 11 and earlier, this is not possible
-- in a single migration. This can be worked around by creating
-- multiple migrations, each migration adding only one value to
-- the enum.


ALTER TYPE "AdminPermission" ADD VALUE 'UPDATE_PLACE_BASIC';
ALTER TYPE "AdminPermission" ADD VALUE 'UPDATE_ACCOMMODATION_DETAILS';
ALTER TYPE "AdminPermission" ADD VALUE 'UPDATE_TOTAL_CAPACITY';
