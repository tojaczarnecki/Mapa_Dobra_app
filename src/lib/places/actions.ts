export function telephoneHref(phone?: string) {
  if (!phone?.trim()) return undefined;
  const normalized = phone.trim().replace(/(?!^\+)[^\d]/gu, "");
  return normalized ? `tel:${normalized}` : undefined;
}

export function directionsHref(input: {
  latitude?: number;
  longitude?: number;
  address?: string;
}) {
  if (Number.isFinite(input.latitude) && Number.isFinite(input.longitude)) {
    return `https://www.openstreetmap.org/directions?engine=fossgis_osrm_foot&route=;${input.latitude},${input.longitude}`;
  }
  if (input.address?.trim()) {
    return `https://www.openstreetmap.org/search?query=${encodeURIComponent(input.address.trim())}`;
  }
  return undefined;
}
