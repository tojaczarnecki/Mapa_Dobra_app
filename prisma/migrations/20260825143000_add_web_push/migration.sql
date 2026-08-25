CREATE TYPE "NotificationCategory" AS ENUM ('LOCAL_ALERT', 'SAVED_PLACES', 'GUIDES', 'VOLUNTEERING', 'PARTNER');
CREATE TYPE "NotificationDeliveryStatus" AS ENUM ('SENT', 'FAILED', 'EXPIRED');

CREATE TABLE "push_subscriptions" (
  "id" UUID NOT NULL,
  "endpoint" VARCHAR(2048) NOT NULL,
  "p256dh" VARCHAR(255) NOT NULL,
  "auth" VARCHAR(255) NOT NULL,
  "userAgent" VARCHAR(500),
  "locale" VARCHAR(20),
  "region" VARCHAR(120),
  "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMPTZ(3) NOT NULL,
  "lastSeenAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "push_subscriptions_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "push_subscriptions_endpoint_key" ON "push_subscriptions"("endpoint");
CREATE INDEX "push_subscriptions_lastSeenAt_idx" ON "push_subscriptions"("lastSeenAt");

CREATE TABLE "notification_preferences" (
  "id" UUID NOT NULL,
  "subscriptionId" UUID NOT NULL,
  "localAlerts" BOOLEAN NOT NULL DEFAULT true,
  "savedPlaces" BOOLEAN NOT NULL DEFAULT true,
  "guides" BOOLEAN NOT NULL DEFAULT true,
  "volunteering" BOOLEAN NOT NULL DEFAULT true,
  "partnerContent" BOOLEAN NOT NULL DEFAULT false,
  "quietHoursFrom" VARCHAR(5),
  "quietHoursTo" VARCHAR(5),
  "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMPTZ(3) NOT NULL,
  CONSTRAINT "notification_preferences_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "notification_preferences_subscriptionId_fkey" FOREIGN KEY ("subscriptionId") REFERENCES "push_subscriptions"("id") ON DELETE CASCADE ON UPDATE CASCADE
);
CREATE UNIQUE INDEX "notification_preferences_subscriptionId_key" ON "notification_preferences"("subscriptionId");

CREATE TABLE "notification_deliveries" (
  "id" UUID NOT NULL,
  "subscriptionId" UUID NOT NULL,
  "category" "NotificationCategory" NOT NULL,
  "dedupeKey" VARCHAR(255) NOT NULL,
  "status" "NotificationDeliveryStatus" NOT NULL,
  "sentAt" TIMESTAMPTZ(3),
  "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "notification_deliveries_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "notification_deliveries_subscriptionId_fkey" FOREIGN KEY ("subscriptionId") REFERENCES "push_subscriptions"("id") ON DELETE CASCADE ON UPDATE CASCADE
);
CREATE UNIQUE INDEX "notification_deliveries_subscriptionId_dedupeKey_key" ON "notification_deliveries"("subscriptionId", "dedupeKey");
CREATE INDEX "notification_deliveries_category_createdAt_idx" ON "notification_deliveries"("category", "createdAt");
