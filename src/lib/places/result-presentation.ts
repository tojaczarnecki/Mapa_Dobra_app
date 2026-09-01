import type { DemoPlace } from "@/data/demo-places";
import { directionsHref, telephoneHref } from "./actions.ts";

export type ResultPrimaryAction = {
  href: string;
  label: "Trasa" | "Zadzwoń" | "Zadzwoń i potwierdź";
  external?: boolean;
};

export function getResultPrimaryAction(place: DemoPlace): ResultPrimaryAction | undefined {
  const phone = telephoneHref(place.phone);
  const route = directionsHref(place);
  const needsConfirmation = place.freshnessWarning || place.status === "unknownHours" || place.status === "needsConfirmation";

  if (needsConfirmation && phone) return { href: phone, label: "Zadzwoń i potwierdź" };
  if (route) return { href: route, label: "Trasa", external: true };
  if (phone) return { href: phone, label: "Zadzwoń" };
  return undefined;
}
