import type { PlaceStatus } from "@/data/demo-places";
import { StatusIndicator } from "@/components/ui/status-indicator";
import { resolvePublicPlaceStatus } from "@/lib/public/status-presentation";
import type { PlaceProfileKindValue } from "@/types/place-admin";

const classNameByStatus = {
  confirmed: "border-brand bg-brand-soft text-foreground",
  absent: "border-border bg-surface-muted text-foreground",
  unknown: "border-urgent-border bg-urgent-soft text-foreground",
} as const;

export function PlaceStatusBadge({ status, compact = false, freshnessWarning = false, profileKind, mobileSeasonLabel, mobileSeasonActive }: { status: PlaceStatus; compact?: boolean; freshnessWarning?: boolean; profileKind?: PlaceProfileKindValue; mobileSeasonLabel?: string; mobileSeasonActive?: boolean }) {
  const presentation = resolvePublicPlaceStatus({
    status,
    compact,
    freshnessWarning,
    profileKind,
    mobileSeasonLabel,
    mobileSeasonActive,
  });

  if (presentation.informational) {
    return (
      <span className="public-status-badge public-status-badge-informational">
        <span aria-hidden="true" className="shrink-0 font-extrabold">•</span>
        <span>{presentation.label}</span>
      </span>
    );
  }

  return (
    <span
      className={[
        "inline-flex min-h-8 max-w-full min-w-0 flex-wrap items-center gap-1.5 rounded-full border px-3 py-1 text-xs font-extrabold leading-tight",
        `place-status-badge-${status}`,
        classNameByStatus[presentation.publicStatus],
      ].join(" ")}
    >
      <StatusIndicator status={presentation.publicStatus} announceLabel={!compact || presentation.publicStatus !== "unknown"}>
        {presentation.label}
      </StatusIndicator>
    </span>
  );
}
