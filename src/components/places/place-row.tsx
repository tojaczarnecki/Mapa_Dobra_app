import Link from "next/link";
import { ChevronRight, Navigation } from "lucide-react";
import type { DemoPlace, PlaceStatus } from "@/data/demo-places";
import { DataFreshness } from "@/components/ui/data-freshness";
import { StatusIndicator } from "@/components/ui/status-indicator";

const statusConfig: Record<PlaceStatus, { label: string; tone: string; status: "confirmed" | "absent" | "unknown" | "condition" }> = {
  open: { label: "Otwarte teraz", tone: "is-open", status: "confirmed" },
  closed: { label: "Zamknięte teraz", tone: "is-closed", status: "absent" },
  openToday: { label: "Otwarte dzisiaj", tone: "is-open-today", status: "confirmed" },
  unknownHours: { label: "Brak potwierdzonych godzin", tone: "is-warning", status: "unknown" },
  needsConfirmation: { label: "Dane wymagają potwierdzenia", tone: "is-warning", status: "unknown" },
};

export function PlaceRow({ place }: { place: DemoPlace }) {
  const Icon = place.primaryIcon;
  const status = statusConfig[place.status];
  const tags = Array.from(new Set([...place.helpTypes, ...place.conditions])).slice(0, 2);

  return (
    <Link
      href={`/lodz/${place.categorySlug}/${place.slug}`}
      className="md-place-row"
      aria-label={`${place.name}. ${status.label}. ${place.distance}. Pokaż szczegóły.`}
    >
      <span className="md-place-icon" aria-hidden="true">
        <Icon size={21} strokeWidth={1.9} />
      </span>

      <span className="md-place-content">
        <span className="md-place-title">{place.name}</span>
        <span className="md-place-status-line">
          <StatusIndicator status={status.status} className={`md-place-status-label ${status.tone}`}>
            {status.label}
          </StatusIndicator>
          <span aria-hidden="true">·</span>
          <span>{place.todayHours}</span>
        </span>
        <span className="md-place-distance">
          <Navigation aria-hidden="true" size={12} />
          <span>{place.distance}</span>
        </span>
        {place.freshnessWarning ? (
          <span className="mt-1 flex min-w-0 items-center gap-1 text-[0.68rem] font-extrabold leading-4 text-[#8a610a]">
            <DataFreshness kind="needsConfirmation" className="min-w-0">{place.freshness}</DataFreshness>
          </span>
        ) : null}
        {tags.length > 0 ? (
          <span className="md-place-tags" aria-label="Najważniejsze informacje">
            {tags.map((tag) => <span className="md-place-tag" key={tag}>{tag}</span>)}
          </span>
        ) : null}
      </span>

      <ChevronRight className="md-place-chevron" aria-hidden="true" size={18} strokeWidth={2} />
    </Link>
  );
}
