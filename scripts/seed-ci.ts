import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "../src/generated/prisma/client";
import { hashPassword } from "../src/lib/admin/password";

const connectionString = process.env.DATABASE_URL;
if (!connectionString) throw new Error("DATABASE_URL is required for the disposable CI seed.");

const prisma = new PrismaClient({ adapter: new PrismaPg({ connectionString }) });
const adminEmail = process.env.ADMIN_SEED_EMAIL ?? "e2e-admin@example.test";
const adminPassword = process.env.ADMIN_SEED_PASSWORD ?? "E2E-only-password-123!";
const recordKind = process.env.E2E_PUBLIC_RECORDS === "true" ? "PRODUCTION" : "TEST";

async function main() {
  const [food, accommodation] = await Promise.all([
    prisma.category.upsert({ where: { slug: "jedzenie" }, update: { name: "Jedzenie", active: true }, create: { slug: "jedzenie", name: "Jedzenie", active: true, sortOrder: 1 } }),
    prisma.category.upsert({ where: { slug: "nocleg" }, update: { name: "Nocleg", active: true }, create: { slug: "nocleg", name: "Nocleg", active: true, sortOrder: 2 } }),
    prisma.category.upsert({ where: { slug: "higiena" }, update: { name: "Higiena", active: true }, create: { slug: "higiena", name: "Higiena", active: true, sortOrder: 3 } }),
  ]);
  const organization = await prisma.organization.upsert({
    where: { slug: "e2e-organizacja" },
    update: { name: "E2E Organizacja" },
    create: { slug: "e2e-organizacja", name: "E2E Organizacja", email: "organization@example.test" },
  });
  await prisma.adminUser.upsert({
    where: { email: adminEmail },
    update: { displayName: "E2E Administrator", role: "SUPER_ADMIN", active: true, passwordHash: await hashPassword(adminPassword) },
    create: { email: adminEmail, displayName: "E2E Administrator", role: "SUPER_ADMIN", active: true, passwordHash: await hashPassword(adminPassword) },
  });

  for (const [index, category] of [food, accommodation, food].entries()) {
    const slug = `e2e-place-${index + 1}`;
    const place = await prisma.place.upsert({
      where: { slug },
      update: { name: `E2E Miejsce ${index + 1}`, publicationStatus: "PUBLISHED", recordKind, primaryCategoryId: category.id, organizationId: organization.id },
      create: {
        slug,
        name: `E2E Miejsce ${index + 1}`,
        organizationId: organization.id,
        primaryCategoryId: category.id,
        typeLabel: index === 1 ? "Schronisko" : "Punkt pomocy",
        description: "Deterministyczne miejsce testowe CI.",
        addressLine: "ul. Testowa 1, Łódź",
        street: "Testowa",
        buildingNumber: "1",
        postalCode: "90-001",
        city: "Łódź",
        latitude: 51.759,
        longitude: 19.457,
        phone: "+48420000000",
        publicationStatus: "PUBLISHED",
        verificationStatus: "VERIFIED",
        operationalStatus: "OPEN_TODAY",
        recordKind,
        audience: ["osoby potrzebujące pomocy"],
        services: ["informacja"],
        categories: { create: { categoryId: category.id, sortOrder: 0 } },
      },
    });
    if (index === 1) {
      await prisma.accommodationDetails.upsert({
        where: { placeId: place.id },
        update: { availabilityState: "AVAILABLE", availabilityLabel: "2 wolne miejsca", acceptsToday: "YES" },
        create: {
          placeId: place.id,
          type: "SHELTER",
          targetGroups: ["osoby dorosłe"],
          acceptedProfiles: ["adult"],
          acceptsToday: "YES",
          availabilityState: "AVAILABLE",
          availabilityLabel: "2 wolne miejsca",
          capacityGroups: { create: { label: "Ogólne", totalBeds: 10, availableBeds: 2 } },
        },
      });
    }
  }
  const legacyPlace = await prisma.place.findUniqueOrThrow({ where: { slug: "e2e-place-1" } });

  await prisma.placeUpdateSubmission.upsert({
    where: { requestId: "00000000-0000-4000-8000-000000000001" },
    update: {
      placeId: legacyPlace.id,
      placeSlug: legacyPlace.slug,
      placeNameSnapshot: legacyPlace.name,
      submissionTypes: ["PHONE"],
      description: "E2E starsze zaakceptowane zgłoszenie oczekujące na publikację.",
      proposedPhone: "+48421111111",
      moderationStatus: "APPROVED",
      publicationStatus: "NOT_PUBLISHED",
      publishedPlaceId: null,
      targetPlaceId: legacyPlace.id,
    },
    create: {
      requestId: "00000000-0000-4000-8000-000000000001",
      placeId: legacyPlace.id,
      placeSlug: legacyPlace.slug,
      placeNameSnapshot: legacyPlace.name,
      submissionTypes: ["PHONE"],
      description: "E2E starsze zaakceptowane zgłoszenie oczekujące na publikację.",
      proposedPhone: "+48421111111",
      moderationStatus: "APPROVED",
      publicationStatus: "NOT_PUBLISHED",
      publishedPlaceId: null,
      targetPlaceId: legacyPlace.id,
      createdAt: new Date("2026-01-01T00:00:00.000Z"),
    },
  });

  console.info(JSON.stringify({ seeded: true, recordKind, adminEmail, placeSlugs: ["e2e-place-1", "e2e-place-2", "e2e-place-3"] }));
}

try {
  await main();
} finally {
  await prisma.$disconnect();
}
