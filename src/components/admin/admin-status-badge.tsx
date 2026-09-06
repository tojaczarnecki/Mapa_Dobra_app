import { AlertTriangle, CheckCircle2, Clock3, Info, XCircle } from "lucide-react";

type StatusTone = "positive" | "warning" | "neutral" | "danger" | "info";
type StatusConfig = { label: string; tone: StatusTone; description?: string };

const statuses: Record<string, StatusConfig> = {
  DRAFT: { label: "Szkic", tone: "neutral", description: "Nie jest jeszcze widoczny publicznie." },
  PUBLISHED: { label: "Opublikowane", tone: "positive" },
  TEMPORARILY_CLOSED: { label: "Tymczasowo zamknięte", tone: "warning" },
  PERMANENTLY_CLOSED: { label: "Zamknięte na stałe", tone: "neutral" },
  ARCHIVED: { label: "Zarchiwizowane", tone: "neutral" },
  UNKNOWN: { label: "Brak danych", tone: "neutral" },
  NEEDS_CONFIRMATION: { label: "Wymaga potwierdzenia", tone: "warning" },
  VERIFIED: { label: "Zweryfikowane", tone: "positive" },
  PENDING: { label: "Oczekuje", tone: "warning" },
  UNDER_REVIEW: { label: "W trakcie", tone: "info" },
  APPROVED: { label: "Zatwierdzone", tone: "positive" },
  REJECTED: { label: "Odrzucone", tone: "danger" },
  FILLED: { label: "Komplet", tone: "positive" },
  CANCELLED: { label: "Anulowane", tone: "neutral" },
};

const toneClasses: Record<StatusTone, string> = {
  positive: "border-brand/35 bg-brand-soft text-brand-strong",
  warning: "border-[#d7a548]/70 bg-[#fff4d8] text-[#684500]",
  neutral: "border-border bg-surface-muted text-muted-foreground",
  danger: "border-urgent/35 bg-urgent-soft text-[#8c2d0c]",
  info: "border-[#9ebbd0] bg-[#eef7fc] text-[#28516a]",
};

const icons: Record<StatusTone, typeof CheckCircle2> = { positive: CheckCircle2, warning: AlertTriangle, neutral: Info, danger: XCircle, info: Clock3 };

export function AdminStatusBadge({ status, label, description }: { status: string; label?: string; description?: string }) {
  const config = statuses[status] ?? { label: label ?? status.replaceAll("_", " "), tone: "neutral" as const };
  const Icon = icons[config.tone];
  return <span title={description ?? config.description} className={`inline-flex min-h-7 items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs font-extrabold ${toneClasses[config.tone]}`}><Icon aria-hidden="true" size={13} />{label ?? config.label}</span>;
}

export function statusLabel(status: string) {
  return statuses[status]?.label ?? status.replaceAll("_", " ");
}
