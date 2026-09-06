import type { PlaceStatus } from "@/data/demo-places";
import { StatusIndicator } from "@/components/ui/status-indicator";
import type { PlaceProfileKindValue } from "@/types/place-admin";

const statusConfig = {
  open: {
    className: "border-brand bg-brand-soft text-foreground",
    status: "confirmed" as const,
    label: "OTWARTE TERAZ",
  },
  closed: {
    className: "border-border bg-surface-muted text-foreground",
    status: "absent" as const,
    label: "ZAMKNIĘTE TERAZ",
  },
  openToday: {
    className: "border-brand bg-surface text-foreground",
    status: "confirmed" as const,
    label: "OTWARTE DZISIAJ",
  },
  unknownHours: {
    className: "border-urgent-border bg-urgent-soft text-foreground",
    status: "unknown" as const,
    label: "BRAK POTWIERDZONYCH GODZIN",
  },
  needsConfirmation: {
    className: "border-urgent-border bg-urgent-soft text-foreground",
    status: "unknown" as const,
    label: "BRAK POTWIERDZONYCH INFORMACJI O DOSTĘPNOŚCI",
  },
} satisfies Record<
  PlaceStatus,
  {
    className: string;
    status: "confirmed" | "absent" | "unknown";
    label: string;
  }
>;

export function PlaceStatusBadge({ status, compact = false, freshnessWarning = false, profileKind, mobileSeasonLabel, mobileSeasonActive }: { status: PlaceStatus; compact?: boolean; freshnessWarning?: boolean; profileKind?: PlaceProfileKindValue; mobileSeasonLabel?: string; mobileSeasonActive?: boolean }) {
  const config = statusConfig[status];
  const compactLabel = {
    open: "Otwarte",
    closed: "Zamknięte",
    openToday: "Dzisiaj otwarte",
    unknownHours: "Nie mamy potwierdzonych godzin",
    needsConfirmation: "Brak potwierdzonych informacji o dostępności",
  } satisfies Record<PlaceStatus, string>;

  const uncertainCurrent = freshnessWarning && (status === "open" || status === "openToday");
  const foodSharing = profileKind === "FOOD_SHARING";
  const mobileService = profileKind === "MOBILE_SERVICE";
  const mobileLabel = mobileSeasonLabel
    ? mobileSeasonActive
      ? `Sezonowo · ${mobileSeasonLabel}`
      : "Poza sezonem"
    : "Mobilna usługa";
  if (foodSharing) {
    return (
      <span className="public-status-badge public-status-badge-informational">
        <span aria-hidden="true" className="shrink-0 font-extrabold">•</span>
        <span>Dostęp 24/7</span>
      </span>
    );
  }

  return (
    <span
      className={[
        "inline-flex min-h-8 max-w-full min-w-0 flex-wrap items-center gap-1.5 rounded-full border px-3 py-1 text-xs font-extrabold leading-tight",
        uncertainCurrent ? "border-urgent-border bg-urgent-soft text-foreground" : config.className,
      ].join(" ")}
    >
        <StatusIndicator status={mobileService && mobileSeasonActive ? "confirmed" : mobileService ? "absent" : uncertainCurrent ? "unknown" : config.status} announceLabel={!compact || mobileService || !uncertainCurrent && status !== "unknownHours" && status !== "needsConfirmation"}>
        {mobileService ? mobileLabel : uncertainCurrent ? `Według ostatnich danych: ${compact ? compactLabel[status] : config.label.toLocaleLowerCase("pl-PL")}` : compact ? compactLabel[status] : config.label}
      </StatusIndicator>
    </span>
  );
}
