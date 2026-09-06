type CategoryIllustration = {
  path: string;
  color: string;
};

const categoryIllustrations: Record<string, CategoryIllustration> = {
  jedzenie: { path: "/illustrations/categories/jedzenie.svg", color: "#D97706" },
  nocleg: { path: "/illustrations/categories/nocleg.svg", color: "#334155" },
  higiena: { path: "/illustrations/categories/higiena.svg", color: "#0891B2" },
  odziez: { path: "/illustrations/categories/odzież.svg", color: "#7C3AED" },
  zdrowie: { path: "/illustrations/categories/zdrowie.svg", color: "#DC2626" },
  "pomoc-medyczna": { path: "/illustrations/categories/zdrowie.svg", color: "#DC2626" },
  "pomoc-prawna": { path: "/illustrations/categories/wsparcie prawne.svg", color: "#0F766E" },
  "pomoc-socjalna": { path: "/illustrations/categories/wsparcie.svg", color: "#B45309" },
  wsparcie: { path: "/illustrations/categories/wsparcie.svg", color: "#B45309" },
  "lodowka-spoleczna": { path: "/illustrations/categories/lodowka.svg", color: "#15803D" },
  autobus: { path: "/illustrations/categories/autobus.svg", color: "#E76F51" },
  wiecej: { path: "/illustrations/categories/wiecej.svg", color: "#2563EB" },
};

export function categoryIllustrationPath(slug: string | undefined) {
  return slug ? categoryIllustrations[slug]?.path : undefined;
}

export function categoryIllustrationColor(slug: string | undefined) {
  return slug ? categoryIllustrations[slug]?.color : undefined;
}

export function placeIllustrationSlug(profileKind: string | undefined, categorySlug: string | undefined) {
  if (profileKind === "FOOD_SHARING") return "lodowka-spoleczna";
  if (profileKind === "MOBILE_SERVICE") return "autobus";
  return categorySlug;
}
