import { AlertTriangle, CheckCircle2, Clock, HelpCircle, XCircle } from "lucide-react";
import type { PlaceStatus } from "@/data/demo-places";

const statusConfig = {
  open: {
    className: "border-brand bg-brand-soft text-foreground",
    icon: CheckCircle2,
    label: "OTWARTE TERAZ",
  },
  closed: {
    className: "border-border bg-surface-muted text-foreground",
    icon: XCircle,
    label: "ZAMKNIĘTE TERAZ",
  },
  openToday: {
    className: "border-brand bg-surface text-foreground",
    icon: Clock,
    label: "OTWARTE DZISIAJ",
  },
  unknownHours: {
    className: "border-urgent-border bg-urgent-soft text-foreground",
    icon: HelpCircle,
    label: "BRAK POTWIERDZONYCH GODZIN",
  },
  needsConfirmation: {
    className: "border-urgent-border bg-urgent-soft text-foreground",
    icon: AlertTriangle,
    label: "DANE WYMAGAJĄ POTWIERDZENIA",
  },
} satisfies Record<
  PlaceStatus,
  {
    className: string;
    icon: typeof CheckCircle2;
    label: string;
  }
>;

export function PlaceStatusBadge({ status }: { status: PlaceStatus }) {
  const config = statusConfig[status];
  const Icon = config.icon;

  return (
    <span
      className={[
        "place-status-badge",
        config.className,
      ].join(" ")}
    >
      <Icon aria-hidden="true" className="shrink-0" size={15} strokeWidth={2.4} />
      {config.label}
    </span>
  );
}
