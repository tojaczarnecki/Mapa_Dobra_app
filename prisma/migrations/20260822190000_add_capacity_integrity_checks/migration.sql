ALTER TABLE "accommodation_capacity_groups"
  ADD CONSTRAINT "capacity_total_beds_nonnegative"
    CHECK ("totalBeds" IS NULL OR "totalBeds" >= 0),
  ADD CONSTRAINT "capacity_available_beds_nonnegative"
    CHECK ("availableBeds" IS NULL OR "availableBeds" >= 0),
  ADD CONSTRAINT "capacity_available_beds_lte_total"
    CHECK ("availableBeds" IS NULL OR "totalBeds" IS NULL OR "availableBeds" <= "totalBeds");

ALTER TABLE "accommodation_availability_history"
  ADD CONSTRAINT "history_total_beds_nonnegative"
    CHECK ("totalBeds" IS NULL OR "totalBeds" >= 0),
  ADD CONSTRAINT "history_available_beds_nonnegative"
    CHECK ("availableBeds" IS NULL OR "availableBeds" >= 0),
  ADD CONSTRAINT "history_available_beds_lte_total"
    CHECK ("availableBeds" IS NULL OR "totalBeds" IS NULL OR "availableBeds" <= "totalBeds");
