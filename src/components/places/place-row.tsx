import Link from "next/link";
import { ChevronRight, Clock3 } from "lucide-react";
import type { DemoPlace } from "@/data/demo-places";
import { DataFreshness } from "@/components/ui/data-freshness";
import { StatusIndicator } from "@/components/ui/status-indicator";
import { CategoryIllustration } from "@/components/categories/category-illustration";
import { placeIllustrationSlug } from "@/lib/categories/category-illustrations";
import { resolvePublicPlaceStatus } from "@/lib/public/status-presentation";

export function PlaceRow({ place }: { place: DemoPlace }) {
  const Icon = place.primaryIcon;
  const illustrationSlug = placeIllustrationSlug(place.profileKind, place.categorySlug);
  const tags = Array.from(new Set([...place.helpTypes, ...place.conditions])).slice(0, 2);
  const status = resolvePublicPlaceStatus({
    status: place.status,
    compact: true,
    freshnessWarning: place.freshnessWarning,
    profileKind: place.profileKind,
    mobileSeasonLabel: place.mobileSeasonLabel,
    mobileSeasonActive: place.mobileSeasonActive,
  });
  const mobileTodayStop = place.profileKind === "MOBILE_SERVICE" && status.publicStatus === "confirmed"
    ? place.mobileTodayStops?.[0]
    : undefined;

  return (
    <Link
      href={`/lodz/${place.categorySlug}/${place.slug}`}
      className="md-place-row"
      aria-label={`${place.name}. ${status.label}. Pokaż szczegóły.`}
    >
      <span className="md-place-icon" aria-hidden="true">
        <CategoryIllustration slug={illustrationSlug} fallback={Icon} iconSize={21} />
      </span>

      <span className="md-place-content">
        <span className="md-place-title">{place.name}</span>
        <span className="md-place-status-line">
          <StatusIndicator status={status.publicStatus} className="md-place-status-label">
            {status.label}
          </StatusIndicator>
          {status.showStandardHours && place.todayHours ? (
            <>
              <span aria-hidden="true">·</span>
              <span>{place.todayHours}</span>
            </>
          ) : mobileTodayStop ? (
            <>
              <span aria-hidden="true">·</span>
              <span className="inline-flex min-w-0 items-center gap-1">
                <Clock3 aria-hidden="true" size={12} />
                Dziś: {mobileTodayStop}
              </span>
            </>
          ) : null}
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
