import { placeStatusLabels } from "@/lib/places/constants";
import type { PlacePublicationStatusValue } from "@/types/place-admin";

const styles: Record<PlacePublicationStatusValue, string> = {
  DRAFT: "border-border bg-surface-muted text-foreground",
  PUBLISHED: "border-brand/35 bg-brand-soft text-[#086b55]",
  TEMPORARILY_CLOSED: "border-urgent/35 bg-urgent-soft text-[#8c2d0c]",
  PERMANENTLY_CLOSED: "border-[#1d1d1b]/30 bg-[#eceae4] text-foreground",
  ARCHIVED: "border-border bg-white text-muted-foreground",
};

export function PlacePublicationBadge({
  status,
}: {
  status: PlacePublicationStatusValue;
}) {
  return (
    <span
      className={`inline-flex min-h-7 items-center rounded-full border px-2.5 py-1 text-xs font-bold ${styles[status]}`}
    >
      {placeStatusLabels[status]}
    </span>
  );
}
