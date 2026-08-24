const namedCategoryAccents: Record<string, string> = {
  jedzenie: "#D97706",
  nocleg: "#334155",
  higiena: "#0891B2",
  odziez: "#7C3AED",
  "pomoc-medyczna": "#DC2626",
  "pomoc-psychologiczna": "#8B5CF6",
  "pomoc-prawna": "#0F766E",
  prysznic: "#0284C7",
};

const fallbackAccents = [
  "#2563EB", "#BE185D", "#4D7C0F", "#9333EA", "#C2410C", "#0E7490", "#475569", "#A21CAF",
  "#0369A1", "#A16207", "#15803D", "#9F1239", "#6D28D9", "#B45309", "#166534", "#1D4ED8",
];

function hashSlug(slug: string) {
  return Array.from(slug).reduce((hash, character) => ((hash * 31) + character.charCodeAt(0)) >>> 0, 7);
}

export function getCategoryAccentMap(slugs: string[]) {
  const accents = new Map<string, string>();

  for (const slug of slugs) {
    const namedAccent = namedCategoryAccents[slug];
    if (namedAccent) {
      accents.set(slug, namedAccent);
      continue;
    }

    const fallbackIndex = hashSlug(slug) % fallbackAccents.length;
    accents.set(slug, fallbackAccents[fallbackIndex]);
  }

  return accents;
}
