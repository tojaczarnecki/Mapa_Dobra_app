import type { PublicStatus } from "@/lib/public/status-presentation";
import type {
  AccommodationAvailabilityState,
  AccommodationPetPolicy,
  AccommodationSobrietyPolicy,
} from "@/lib/accommodations/types";

export type AccommodationAvailabilityPresentation = {
  status: PublicStatus;
  statusLabel: string;
};

const availabilityPresentation: Record<
  AccommodationAvailabilityState,
  AccommodationAvailabilityPresentation
> = {
  fresh: { status: "confirmed", statusLabel: "Są wolne miejsca" },
  few: { status: "condition", statusLabel: "Zostało niewiele miejsc" },
  none: { status: "absent", statusLabel: "Brak miejsc" },
  unknown: { status: "unknown", statusLabel: "Brak aktualnych danych" },
  stale: { status: "unknown", statusLabel: "Ostatni raport może być nieaktualny" },
  suspended: { status: "condition", statusLabel: "Przyjęcia czasowo wstrzymane" },
};

export function getAccommodationAvailabilityPresentation(
  state: AccommodationAvailabilityState,
): AccommodationAvailabilityPresentation {
  return availabilityPresentation[state];
}

export type AccommodationPetPresentation = {
  status: PublicStatus;
  label: string;
};

const petPresentation: Record<AccommodationPetPolicy, AccommodationPetPresentation> = {
  ACCEPTED: { status: "confirmed", label: "Zwierzęta przyjmowane" },
  NOT_ACCEPTED: { status: "absent", label: "Nie można przyjść ze zwierzęciem" },
  DOG_ONLY: { status: "condition", label: "Przyjmowany tylko pies" },
  BY_ARRANGEMENT: { status: "condition", label: "Zwierzęta po uzgodnieniu" },
  ASSISTANCE_DOG_ONLY: { status: "condition", label: "Przyjmowany pies asystujący" },
  UNKNOWN: { status: "unknown", label: "Brak potwierdzonych informacji o zwierzętach" },
};

export function getAccommodationPetPresentation(
  policy: AccommodationPetPolicy,
): AccommodationPetPresentation {
  return petPresentation[policy];
}

export function getAccommodationSobrietyLabel(policy: AccommodationSobrietyPolicy): string {
  return ({
    SOBRIETY_REQUIRED: "Wymagana trzeźwość",
    ZERO_TOLERANCE: "Obowiązuje pełna trzeźwość",
    INDIVIDUAL_ASSESSMENT: "Przyjęcie po indywidualnej ocenie",
    SEPARATE_PROCEDURE: "Osobna procedura dla osób po spożyciu",
    UNKNOWN: "Brak potwierdzonych zasad trzeźwości",
  } as const)[policy];
}

export function getAccommodationResultHeading(
  unmetConditions: string[],
  confirmationConditions: string[],
): string {
  if (unmetConditions.length > 0) return "Najbliższa alternatywa";
  if (confirmationConditions.length > 0) return "Miejsce, które warto potwierdzić";
  return "Najlepsza dostępna opcja";
}

export type AccommodationPrimaryAction = {
  kind: "call" | "search" | "route";
  href: string;
  label: string;
};

export function getAccommodationPrimaryAction({
  phoneHref,
  routeHref,
  closedNow,
  needsConfirmation,
  hasMismatch = false,
}: {
  phoneHref?: string;
  routeHref?: string;
  closedNow: boolean;
  needsConfirmation: boolean;
  hasMismatch?: boolean;
}): AccommodationPrimaryAction | undefined {
  if (hasMismatch) {
    return { kind: "search", href: "/szukaj?otwarte=1", label: "Zobacz inne możliwości" };
  }
  if (needsConfirmation && phoneHref) {
    return { kind: "call", href: phoneHref, label: "Zadzwoń i sprawdź miejsce" };
  }
  if (closedNow || needsConfirmation) {
    return { kind: "search", href: "/szukaj?otwarte=1", label: closedNow ? "Znajdź miejsce otwarte teraz" : "Zobacz inne miejsca" };
  }
  if (routeHref) return { kind: "route", href: routeHref, label: "Wyznacz trasę" };
  if (phoneHref) return { kind: "call", href: phoneHref, label: "Zadzwoń" };
  return undefined;
}

export const accommodationNoGuaranteeMessage =
  "Informacja o wolnych miejscach nie jest gwarancją przyjęcia.";
