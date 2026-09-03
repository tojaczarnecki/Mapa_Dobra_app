import type { PlaceStatus } from "@/data/demo-places";
import { StatusIndicator } from "@/components/ui/status-indicator";

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
    label: "DANE WYMAGAJĄ POTWIERDZENIA",
  },
} satisfies Record<
  PlaceStatus,
  {
    className: string;
    status: "confirmed" | "absent" | "unknown";
    label: string;
  }
>;

export function PlaceStatusBadge({ status, compact = false, freshnessWarning = false }: { status: PlaceStatus; compact?: boolean; freshnessWarning?: boolean }) {
  const config = statusConfig[status];
  const compactLabel = {
    open: "Otwarte",
    closed: "Zamknięte",
    openToday: "Dzisiaj otwarte",
    unknownHours: "Nie mamy potwierdzonych godzin",
    needsConfirmation: "Dane do potwierdzenia",
  } satisfies Record<PlaceStatus, string>;

  const uncertainCurrent = freshnessWarning && (status === "open" || status === "openToday");
  return (
    <span
      className={[
        "inline-flex min-h-8 max-w-full min-w-0 flex-wrap items-center gap-1.5 rounded-full border px-3 py-1 text-xs font-extrabold leading-tight",
        uncertainCurrent ? "border-urgent-border bg-urgent-soft text-foreground" : config.className,
      ].join(" ")}
    >
      <StatusIndicator status={uncertainCurrent ? "unknown" : config.status} announceLabel={!compact || !uncertainCurrent && status !== "unknownHours" && status !== "needsConfirmation"}>
        {uncertainCurrent ? `Według ostatnich danych: ${compact ? compactLabel[status] : config.label.toLocaleLowerCase("pl-PL")}` : compact ? compactLabel[status] : config.label}
      </StatusIndicator>
    </span>
  );
}
