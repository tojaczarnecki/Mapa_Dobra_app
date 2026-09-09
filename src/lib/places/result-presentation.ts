import type { DemoPlace } from "@/data/demo-places";
import { resolvePublicPlaceStatus } from "@/lib/public/status-presentation";
import { directionsHref, telephoneHref } from "./actions.ts";

export type ResultPrimaryAction = {
  href: string;
  label: "Trasa" | "Zadzwoń" | "Zadzwoń i potwierdź" | "Szczegóły" | "Zobacz godziny" | "Zobacz miejsca otwarte teraz" | "Zobacz postoje";
  kind: "route" | "call" | "details" | "search";
  external?: boolean;
};

export function getResultPrimaryAction(place: DemoPlace, detailsHref?: string): ResultPrimaryAction | undefined {
  const phone = telephoneHref(place.phone);
  const route = directionsHref(place);
  const fallbackDetailsHref = detailsHref ?? `/lodz/${place.categorySlug}/${place.slug}`;
  const presentation = resolvePublicPlaceStatus({
    status: place.status,
    freshnessWarning: place.freshnessWarning,
    profileKind: place.profileKind,
    mobileSeasonLabel: place.mobileSeasonLabel,
    mobileSeasonActive: place.mobileSeasonActive,
  });

  // Public availability always wins over profile-specific actions.
  if (presentation.publicStatus === "absent") {
    return { href: "/szukaj?otwarte=1", label: "Zobacz miejsca otwarte teraz", kind: "search" };
  }
  if (presentation.publicStatus === "unknown" && phone) {
    return { href: phone, label: "Zadzwoń i potwierdź", kind: "call" };
  }
  if (presentation.publicStatus === "unknown") {
    return { href: fallbackDetailsHref, label: "Szczegóły", kind: "details" };
  }

  if (place.profileKind === "FOOD_SHARING") return { href: fallbackDetailsHref, label: "Szczegóły", kind: "details" };
  if (place.profileKind === "MOBILE_SERVICE") return { href: fallbackDetailsHref, label: "Zobacz postoje", kind: "details" };
  if (place.status === "openToday") {
    return { href: fallbackDetailsHref, label: "Zobacz godziny", kind: "details" };
  }
  if (route) return { href: route, label: "Trasa", kind: "route", external: true };
  if (phone) return { href: phone, label: "Zadzwoń", kind: "call" };
  return undefined;
}
