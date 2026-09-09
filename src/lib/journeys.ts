export type JourneyKey = "neutral" | "search" | "help" | "now" | "guided" | "guide";

type SearchParamsLike = { get(name: string): string | null };

export const journeyThemes: Record<JourneyKey, { background: string }> = {
  neutral: { background: "#F6F5F3" },
  search: { background: "#F5F7FF" },
  help: { background: "#FFF7F4" },
  now: { background: "#FFFAE9" },
  guided: { background: "#FFF7FB" },
  guide: { background: "#FFF9EA" },
};

export function resolveJourney(pathname: string, searchParams?: SearchParamsLike): JourneyKey {
  if (pathname === "/") return "neutral";
  if (pathname.startsWith("/jak-pomagac")) return "guide";
  if (pathname.startsWith("/lodowki-spoleczne")) return "search";
  if (pathname === "/szukam" && searchParams?.get("tryb") === "guided") return "guided";
  if (pathname === "/znajdz-nocleg") return "guided";
  if (
    (pathname === "/mapa" || (pathname === "/szukaj" && searchParams?.get("view") === "map")) &&
    searchParams?.get("otwarte") === "1"
  ) return "now";
  if (pathname.startsWith("/pomagam") || pathname.startsWith("/uruchom-pomoc") || pathname.startsWith("/potrzeby")) return "help";
  if (pathname.startsWith("/szukam") || pathname.startsWith("/szukaj") || pathname.startsWith("/mapa") || pathname.startsWith("/lodz/")) return "search";
  return "neutral";
}
