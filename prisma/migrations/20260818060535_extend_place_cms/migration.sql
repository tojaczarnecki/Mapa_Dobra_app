-- AlterTable
ALTER TABLE "accommodation_capacity_groups" ADD COLUMN     "active" BOOLEAN NOT NULL DEFAULT true;

-- AlterTable
ALTER TABLE "places" ADD COLUMN     "verifiedByAdminUserId" UUID;

-- AddForeignKey
ALTER TABLE "places" ADD CONSTRAINT "places_verifiedByAdminUserId_fkey" FOREIGN KEY ("verifiedByAdminUserId") REFERENCES "admin_users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
