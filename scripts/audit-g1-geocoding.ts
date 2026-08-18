import "dotenv/config";
import { geocodePublicAddress } from "../src/lib/geocoding/geocoder";
import { prisma } from "../src/lib/prisma";

const pilotPlaceIds = [
  "8c46a845-5b5d-4566-b63d-cd126f79d4a2",
  "c7955e80-2857-4187-b35e-00dc12fc2441",
  "5ad677dc-4f94-44fd-8d48-72e1406fe4de",
  "f8b4d028-8c98-48f3-8ef3-ad3f3109ece2",
  "c53801dc-90f1-4372-bfa9-a208b9e929db",
  "86e2803b-7747-440e-8184-9b663e2bb352",
  "b012951f-cd4b-4b9f-9eab-d75db784a652",
  "e4307ced-51b8-4c19-864b-b4693420a1f1",
  "e1ab7009-8b10-401c-bfb1-0e79f7baa1d0",
  "e003e36c-badc-42ba-83f1-c15dea8190ff",
] as const;

async function main() {
  const places = await prisma.place.findMany({
    where: { id: { in: [...pilotPlaceIds] } },
    orderBy: { name: "asc" },
    select: { id: true, name: true, addressLine: true, street: true, buildingNumber: true, postalCode: true, city: true, latitude: true, longitude: true, publicationStatus: true, verificationStatus: true },
  });
  const byAddress = new Map<string, (typeof places)[number]>();
  for (const place of places) if (!byAddress.has(place.addressLine)) byAddress.set(place.addressLine, place);

  const addressResults = new Map<string, Awaited<ReturnType<typeof geocodePublicAddress>>>();
  for (const place of byAddress.values()) {
    addressResults.set(place.addressLine, await geocodePublicAddress({
      name: place.name,
      addressLine: place.addressLine,
      street: place.street,
      buildingNumber: place.buildingNumber,
      postalCode: place.postalCode,
      city: place.city,
      country: "Polska",
    }));
  }

  const report = places.map((place) => {
    const result = addressResults.get(place.addressLine)!;
    return {
      id: place.id,
      name: place.name,
      address: place.addressLine,
      attempts: result.attempts,
      candidates: result.suggestions.map((suggestion) => ({
        displayName: suggestion.displayName,
        latitude: suggestion.latitude,
        longitude: suggestion.longitude,
        quality: suggestion.quality,
        qualityScore: suggestion.qualityScore,
      })),
      persistedCoordinates: place.latitude === null || place.longitude === null ? null : [Number(place.latitude), Number(place.longitude)],
      publicationStatus: place.publicationStatus,
      verificationStatus: place.verificationStatus,
    };
  });
  const unique = [...addressResults.entries()];
  const summary = {
    places: places.length,
    uniqueAddresses: unique.length,
    sensibleCandidates: unique.filter(([, result]) => result.suggestions.some((item) => item.quality === "HIGH" || item.quality === "REVIEW")).length,
    highQuality: unique.filter(([, result]) => result.suggestions.some((item) => item.quality === "HIGH")).length,
    ambiguous: unique.filter(([, result]) => !result.suggestions.some((item) => item.quality === "HIGH") && result.suggestions.some((item) => item.quality === "REVIEW")).length,
    noResults: unique.filter(([, result]) => result.suggestions.length === 0).length,
    improbableOnly: unique.filter(([, result]) => result.suggestions.length > 0 && result.suggestions.every((item) => item.quality === "IMPROBABLE")).length,
    persistedCoordinates: places.filter((place) => place.latitude !== null && place.longitude !== null).length,
  };
  console.log(JSON.stringify({ summary, report }, null, 2));
}

main().finally(() => prisma.$disconnect());
