function canonicalMapReturnTo(returnTo?: string) {
  if (!returnTo) return "/szukaj?view=map";

  try {
    const parsed = new URL(returnTo, "https://dobra-mapa.local");
    if (parsed.origin !== "https://dobra-mapa.local") return "/szukaj?view=map";

    if (parsed.pathname === "/mapa") {
      parsed.pathname = "/szukaj";
    }

    if (parsed.pathname !== "/szukaj") return "/szukaj?view=map";
    parsed.searchParams.set("view", "map");
    return `${parsed.pathname}?${parsed.searchParams.toString()}`;
  } catch {
    return "/szukaj?view=map";
  }
}

export function mapDetailsHref(detailsHref: string, returnTo?: string) {
  const separator = detailsHref.includes("?") ? "&" : "?";
  const mapReturnTo = canonicalMapReturnTo(returnTo);
  return `${detailsHref}${separator}from=mapa&returnTo=${encodeURIComponent(mapReturnTo)}`;
}
