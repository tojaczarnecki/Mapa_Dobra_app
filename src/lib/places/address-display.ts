function normalizeAddressPart(value: string) {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/gu, "")
    .toLocaleLowerCase("pl-PL")
    .replace(/\s+/gu, " ")
    .trim();
}

export function mapPreviewLocationLabel(address: string, coordinatesLabel?: string) {
  if (!coordinatesLabel?.trim()) return null;

  const normalizedAddress = normalizeAddressPart(address);
  const remainingParts = coordinatesLabel
    .split(",")
    .map((part) => part.trim())
    .filter((part) => part && !normalizedAddress.includes(normalizeAddressPart(part)));

  return remainingParts.join(", ") || null;
}
