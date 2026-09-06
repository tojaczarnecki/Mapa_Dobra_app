CREATE TABLE "admin_push_subscriptions" (
    "id" UUID NOT NULL,
    "adminUserId" UUID NOT NULL,
    "endpoint" VARCHAR(2048) NOT NULL,
    "p256dh" VARCHAR(256) NOT NULL,
    "auth" VARCHAR(128) NOT NULL,
    "expirationTime" TIMESTAMPTZ(3),
    "active" BOOLEAN NOT NULL DEFAULT true,
    "userAgent" VARCHAR(512),
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(3) NOT NULL,
    "lastUsedAt" TIMESTAMPTZ(3),

    CONSTRAINT "admin_push_subscriptions_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "admin_push_subscriptions_endpoint_key" ON "admin_push_subscriptions"("endpoint");
CREATE INDEX "admin_push_subscriptions_adminUserId_active_idx" ON "admin_push_subscriptions"("adminUserId", "active");

ALTER TABLE "admin_push_subscriptions" ADD CONSTRAINT "admin_push_subscriptions_adminUserId_fkey"
  FOREIGN KEY ("adminUserId") REFERENCES "admin_users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
