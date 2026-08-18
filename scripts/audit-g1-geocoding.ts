import "dotenv/config";
import { geocodePublicAddress } from "../src/lib/geocoding/geocoder";
import { prisma } from "../src/lib/prisma";
import { pilotGPlaceIds } from "../src/lib/verification/pilot-g";

async function main() {
  const places = await prisma.place.findMany({
    where: { id: { in: [...pilotGPlaceIds] } },
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
