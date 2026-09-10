type SearchParamReader = {
  get(name: string): string | null;
};

const focusFlowRoutes = ["/uruchom-pomoc", "/zglos-zmiane", "/zglos-miejsce"] as const;

export function isFocusFlowPath(pathname: string, searchParams?: SearchParamReader | null) {
  if (focusFlowRoutes.some((route) => pathname === route || pathname.startsWith(`${route}/`))) {
    return true;
  }

  return pathname === "/szukam" && searchParams?.get("tryb") === "guided";
}
