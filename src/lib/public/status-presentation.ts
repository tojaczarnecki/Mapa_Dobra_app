import type { PlaceStatus } from "@/data/demo-places";
import type { PlaceProfileKindValue } from "@/types/place-admin";

export type PublicStatus = "confirmed" | "absent" | "unknown" | "condition";

export const publicStatusSymbol: Record<PublicStatus, string> = {
  confirmed: "✓",
  absent: "×",
  unknown: "?",
  condition: "!",
};

export const publicStatusLabel: Record<PublicStatus, string> = {
  confirmed: "Potwierdzone",
  absent: "Brak / nie",
  unknown: "Brak potwierdzenia",
  condition: "Ważny warunek",
};

export function detailToneToPublicStatus(tone: "positive" | "warning" | "neutral" | "unknown"): PublicStatus {
  if (tone === "positive") return "confirmed";
  if (tone === "warning") return "condition";
  if (tone === "neutral") return "absent";
  return "unknown";
}

export function publicStatusForLabel(label: string): PublicStatus {
  const normalized = label.toLocaleLowerCase("pl-PL");

  if (/(brak potwierdz|brak danych|wymaga potwierdzenia)/.test(normalized)) return "unknown";
  if (/(brak miejsc|nie przyjm|brak windy|nie są przyjm)/.test(normalized)) return "absent";
  if (/(^|\s)bez\b|niewymag|bezpłat/.test(normalized)) return "confirmed";
  if (/(wymag|trzeź|limit|najpierw zadzwoń)/.test(normalized)) return "condition";
  return "confirmed";
}

export type PublicPlaceStatusPresentation = {
  publicStatus: Exclude<PublicStatus, "condition">;
  label: string;
  informational?: boolean;
  showStandardHours: boolean;
};

type PublicPlaceStatusInput = {
  status: PlaceStatus;
  compact?: boolean;
  freshnessWarning?: boolean;
  profileKind?: PlaceProfileKindValue;
  mobileSeasonLabel?: string;
  mobileSeasonActive?: boolean;
};

const standardLabels = {
  open: { full: "OTWARTE TERAZ", compact: "Otwarte", publicStatus: "confirmed" as const },
  closed: { full: "ZAMKNIĘTE TERAZ", compact: "Zamknięte", publicStatus: "absent" as const },
  openToday: { full: "OTWARTE DZISIAJ", compact: "Dzisiaj otwarte", publicStatus: "confirmed" as const },
  unknownHours: { full: "BRAK POTWIERDZONYCH GODZIN", compact: "Nie mamy potwierdzonych godzin", publicStatus: "unknown" as const },
  needsConfirmation: { full: "BRAK POTWIERDZONYCH INFORMACJI O DOSTĘPNOŚCI", compact: "Brak potwierdzonych informacji o dostępności", publicStatus: "unknown" as const },
} satisfies Record<PlaceStatus, { full: string; compact: string; publicStatus: "confirmed" | "absent" | "unknown" }>;

/**
 * Single precedence rule for public place status labels.
 * Operational closure and uncertainty always win over profile-specific messaging.
 */
export function resolvePublicPlaceStatus(input: PublicPlaceStatusInput): PublicPlaceStatusPresentation {
  const { status, compact = false, freshnessWarning = false, profileKind, mobileSeasonLabel, mobileSeasonActive } = input;
  const standard = standardLabels[status];
  const baseLabel = compact ? standard.compact : standard.full;

  if (status === "closed") {
    return { publicStatus: "absent", label: baseLabel, showStandardHours: true };
  }

  if (status === "unknownHours" || status === "needsConfirmation") {
    return { publicStatus: "unknown", label: baseLabel, showStandardHours: false };
  }

  if (freshnessWarning) {
    return {
      publicStatus: "unknown",
      label: `Według ostatnich danych: ${baseLabel.toLocaleLowerCase("pl-PL")}`,
      showStandardHours: false,
    };
  }

  if (profileKind === "FOOD_SHARING") {
    return {
      publicStatus: "confirmed",
      label: "Dostęp 24/7",
      informational: true,
      showStandardHours: false,
    };
  }

  if (profileKind === "MOBILE_SERVICE") {
    if (mobileSeasonLabel) {
      return mobileSeasonActive
        ? { publicStatus: "confirmed", label: `Sezonowo · ${mobileSeasonLabel}`, showStandardHours: false }
        : { publicStatus: "absent", label: "Poza sezonem", showStandardHours: false };
    }

    return {
      publicStatus: standard.publicStatus,
      label: compact ? "Według rozkładu" : "KURSUJE WEDŁUG ROZKŁADU",
      showStandardHours: false,
    };
  }

  return {
    publicStatus: standard.publicStatus,
    label: baseLabel,
    showStandardHours: status === "open" || status === "openToday" || status === "closed",
  };
}
