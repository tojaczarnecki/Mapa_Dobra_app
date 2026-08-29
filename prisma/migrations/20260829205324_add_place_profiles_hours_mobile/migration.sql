-- CreateEnum
CREATE TYPE "PlaceProfileKind" AS ENUM ('SUPPORT', 'ACCOMMODATION', 'FOOD_SHARING', 'MOBILE_SERVICE');

-- AlterTable
ALTER TABLE "opening_hours" ADD COLUMN     "allDay" BOOLEAN NOT NULL DEFAULT false;

-- AlterTable
ALTER TABLE "places" ADD COLUMN     "placeKind" "PlaceProfileKind" NOT NULL DEFAULT 'SUPPORT';

-- CreateTable
CREATE TABLE "mobile_service_stops" (
    "id" UUID NOT NULL,
    "placeId" UUID NOT NULL,
    "name" VARCHAR(240) NOT NULL,
    "addressLine" VARCHAR(400) NOT NULL,
    "latitude" DECIMAL(9,6),
    "longitude" DECIMAL(9,6),
    "note" VARCHAR(500),
    "sortOrder" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "mobile_service_stops_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "mobile_service_stop_schedules" (
    "id" UUID NOT NULL,
    "stopId" UUID NOT NULL,
    "weekday" "Weekday" NOT NULL,
    "allDay" BOOLEAN NOT NULL DEFAULT false,
    "opensAt" VARCHAR(5),
    "closesAt" VARCHAR(5),
    "note" VARCHAR(240),
    "sortOrder" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "mobile_service_stop_schedules_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "mobile_service_seasons" (
    "id" UUID NOT NULL,
    "placeId" UUID NOT NULL,
    "active" BOOLEAN NOT NULL DEFAULT false,
    "startMonth" INTEGER NOT NULL,
    "startDay" INTEGER NOT NULL,
    "endMonth" INTEGER NOT NULL,
    "endDay" INTEGER NOT NULL,
    "label" VARCHAR(240),

    CONSTRAINT "mobile_service_seasons_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "mobile_service_stops_placeId_sortOrder_idx" ON "mobile_service_stops"("placeId", "sortOrder");

-- CreateIndex
CREATE INDEX "mobile_service_stop_schedules_stopId_weekday_idx" ON "mobile_service_stop_schedules"("stopId", "weekday");

-- CreateIndex
CREATE UNIQUE INDEX "mobile_service_stop_schedules_stopId_weekday_sortOrder_key" ON "mobile_service_stop_schedules"("stopId", "weekday", "sortOrder");

-- CreateIndex
CREATE UNIQUE INDEX "mobile_service_seasons_placeId_key" ON "mobile_service_seasons"("placeId");

-- AddForeignKey
ALTER TABLE "mobile_service_stops" ADD CONSTRAINT "mobile_service_stops_placeId_fkey" FOREIGN KEY ("placeId") REFERENCES "places"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "mobile_service_stop_schedules" ADD CONSTRAINT "mobile_service_stop_schedules_stopId_fkey" FOREIGN KEY ("stopId") REFERENCES "mobile_service_stops"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "mobile_service_seasons" ADD CONSTRAINT "mobile_service_seasons_placeId_fkey" FOREIGN KEY ("placeId") REFERENCES "places"("id") ON DELETE CASCADE ON UPDATE CASCADE;
