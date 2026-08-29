INSERT INTO "categories" ("id", "slug", "name", "active", "sortOrder", "createdAt", "updatedAt")
VALUES
    ('9b9c0d77-1f8e-4d35-9c2f-0b6e2e7a4101', 'pomoc-psychologiczna', 'Pomoc psychologiczna', true, 6, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
    ('9b9c0d77-1f8e-4d35-9c2f-0b6e2e7a4102', 'pomoc-prawna', 'Pomoc prawna', true, 7, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
    ('9b9c0d77-1f8e-4d35-9c2f-0b6e2e7a4103', 'pomoc-socjalna', 'Pomoc socjalna', true, 8, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
ON CONFLICT ("slug") DO UPDATE
SET "name" = EXCLUDED."name",
    "active" = EXCLUDED."active",
    "sortOrder" = EXCLUDED."sortOrder",
    "updatedAt" = CURRENT_TIMESTAMP;
