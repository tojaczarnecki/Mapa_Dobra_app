import type { DemoPlace } from "@/data/demo-places";
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
  const needsConfirmation = place.freshnessWarning || place.status === "unknownHours" || place.status === "needsConfirmation";
  if (place.profileKind === "FOOD_SHARING") return { href: fallbackDetailsHref, label: "Szczegóły", kind: "details" };
  if (place.profileKind === "MOBILE_SERVICE") return { href: fallbackDetailsHref, label: "Zobacz postoje", kind: "details" };

  if (needsConfirmation && phone) return { href: phone, label: "Zadzwoń i potwierdź", kind: "call" };
  if (needsConfirmation) return { href: fallbackDetailsHref, label: "Szczegóły", kind: "details" };
  if (place.status === "closed") {
    return { href: "/szukaj?otwarte=1", label: "Zobacz miejsca otwarte teraz", kind: "search" };
  }
  if (place.status === "openToday") {
    return { href: fallbackDetailsHref, label: "Zobacz godziny", kind: "details" };
  }
  if (route) return { href: route, label: "Trasa", kind: "route", external: true };
  if (phone) return { href: phone, label: "Zadzwoń", kind: "call" };
  return undefined;
}
