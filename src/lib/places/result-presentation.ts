import type { DemoPlace } from "@/data/demo-places";
import { directionsHref, telephoneHref } from "./actions.ts";

export type ResultPrimaryAction = {
  href: string;
  label: "Trasa" | "Zadzwoń" | "Zadzwoń i potwierdź" | "Sprawdź szczegóły" | "Zobacz godziny";
  kind: "route" | "call" | "details";
  external?: boolean;
};

export function getResultPrimaryAction(place: DemoPlace, detailsHref?: string): ResultPrimaryAction | undefined {
  const phone = telephoneHref(place.phone);
  const route = directionsHref(place);
  const fallbackDetailsHref = detailsHref ?? `/lodz/${place.categorySlug}/${place.slug}`;
  const needsConfirmation = place.freshnessWarning || place.status === "unknownHours" || place.status === "needsConfirmation";
  const hasKnownHours = !/brak|wymagają potwierdzenia|wymagaja potwierdzenia/iu.test(place.todayHours);

  if (needsConfirmation && phone) return { href: phone, label: "Zadzwoń i potwierdź", kind: "call" };
  if (needsConfirmation) return { href: fallbackDetailsHref, label: "Sprawdź szczegóły", kind: "details" };
  if (place.status === "closed") {
    return { href: fallbackDetailsHref, label: hasKnownHours ? "Zobacz godziny" : "Sprawdź szczegóły", kind: "details" };
  }
  if (place.status === "openToday") {
    return { href: fallbackDetailsHref, label: "Zobacz godziny", kind: "details" };
  }
  if (route) return { href: route, label: "Trasa", kind: "route", external: true };
  if (phone) return { href: phone, label: "Zadzwoń", kind: "call" };
  return undefined;
}
