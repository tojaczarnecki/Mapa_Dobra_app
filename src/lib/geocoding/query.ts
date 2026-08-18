export type GeocodingAddressInput = {
  name: string;
  addressLine: string;
  street: string | null;
  buildingNumber: string | null;
  postalCode: string | null;
  city: string;
  country?: string;
};

export type GeocodingAttempt = {
  id: "structured" | "normalized" | "place-context";
  label: string;
  query: string;
  params: Record<string, string>;
};

export type PreparedGeocodingAddress = {
  street: string;
  simplifiedStreet: string;
  buildingNumber: string;
  postalCode: string;
  city: string;
  country: string;
};

function compact(value: string | null | undefined) {
  return (value ?? "").normalize("NFKC").replace(/\s+/gu, " ").trim();
}

function stripStreetPrefix(value: string) {
  return value.replace(/^(?:ul\.?|ulica|al\.?|aleja|pl\.?|plac)\s+/iu, "").trim();
}

function stripFloorOrRoom(value: string) {
  return value
    .replace(/,?\s*(?:[IVXLCDM]+|\d+)\s*(?:p\.?|piętro|pok\.?|lok\.?).*$/iu, "")
    .replace(/\s+/gu, " ")
    .trim();
}

function extractBuildingNumber(value: string) {
  const match = stripFloorOrRoom(value).match(/(?:^|\s)(\d+[a-z]?(?:\s*[/-]\s*\d+[a-z]?)?)\s*$/iu);
  return match?.[1]?.replace(/\s+/gu, "") ?? "";
}

function removeBuildingNumber(value: string, buildingNumber: string) {
  if (!buildingNumber) return value;
  const escaped = buildingNumber.replace(/[.*+?^${}()|[\]\\]/gu, "\\$&").replace(/[/\\-]/gu, "\\s*[/\\-]\\s*");
  return value.replace(new RegExp(`\\s+${escaped}\\s*$`, "iu"), "").trim();
}

function simplifyPatronName(value: string) {
  return value
    .replace(/\b(?:marsz\.?|gen\.?|prof\.?|dr\.?|im\.?)\s+/giu, "")
    .replace(/\b[A-ZĄĆĘŁŃÓŚŹŻ]\.(?=\s)/gu, "")
    .replace(/\s+/gu, " ")
    .trim();
}

export function prepareGeocodingAddress(input: GeocodingAddressInput): PreparedGeocodingAddress {
  const addressHead = compact(input.addressLine).split(",")[0] ?? "";
  const rawStreet = stripFloorOrRoom(compact(input.street) || addressHead);
  const buildingNumber = compact(input.buildingNumber) || extractBuildingNumber(rawStreet) || extractBuildingNumber(addressHead);
  const street = stripStreetPrefix(removeBuildingNumber(rawStreet, buildingNumber));
  return {
    street,
    simplifiedStreet: simplifyPatronName(street),
    buildingNumber,
    postalCode: compact(input.postalCode),
    city: compact(input.city) || "Łódź",
    country: compact(input.country) || "Polska",
  };
}

export function buildGeocodingAttempts(input: GeocodingAddressInput): GeocodingAttempt[] {
  const address = prepareGeocodingAddress(input);
  const structuredStreet = [address.street, address.buildingNumber].filter(Boolean).join(" ");
  const simplifiedAddress = [address.simplifiedStreet || address.street, address.buildingNumber].filter(Boolean).join(" ");
  const attempts: GeocodingAttempt[] = [];

  if (structuredStreet) {
    attempts.push({
      id: "structured",
      label: "Pełny adres strukturalny",
      query: [structuredStreet, address.postalCode, address.city, address.country].filter(Boolean).join(", "),
      params: {
        street: structuredStreet,
        city: address.city,
        ...(address.postalCode ? { postalcode: address.postalCode } : {}),
        country: address.country,
      },
    });
  }
  if (simplifiedAddress) {
    attempts.push({
      id: "normalized",
      label: "Uproszczony adres",
      query: [simplifiedAddress, address.city, address.country].join(", "),
      params: { q: [simplifiedAddress, address.city, address.country].join(", ") },
    });
    attempts.push({
      id: "place-context",
      label: "Adres z nazwą miejsca",
      query: [compact(input.name), simplifiedAddress, address.city].filter(Boolean).join(", "),
      params: { q: [compact(input.name), simplifiedAddress, address.city].filter(Boolean).join(", ") },
    });
  }

  const seen = new Set<string>();
  return attempts.filter((attempt) => {
    const key = JSON.stringify(attempt.params);
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}
