ALTER TABLE "push_subscriptions"
  ADD COLUMN "adminUserId" UUID;

CREATE INDEX "push_subscriptions_adminUserId_idx"
  ON "push_subscriptions"("adminUserId");

ALTER TABLE "push_subscriptions"
  ADD CONSTRAINT "push_subscriptions_adminUserId_fkey"
  FOREIGN KEY ("adminUserId") REFERENCES "admin_users"("id")
  ON DELETE SET NULL ON UPDATE CASCADE;
