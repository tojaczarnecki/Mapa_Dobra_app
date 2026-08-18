import { recordKindLabels } from "@/lib/places/constants";
import type { PlaceRecordKindValue } from "@/types/place-admin";

const styles: Record<PlaceRecordKindValue, string> = {
  PRODUCTION: "border-brand/35 bg-brand-soft text-[#086b55]",
  DEMO: "border-border bg-[#f3f1eb] text-foreground",
  TEST: "border-urgent bg-urgent-soft text-[#8c2d0c] ring-2 ring-urgent/20",
};

export function PlaceRecordBadge({ kind }: { kind: PlaceRecordKindValue }) {
  return (
    <span className={`inline-flex min-h-7 items-center rounded-full border px-2.5 py-1 text-xs font-black ${styles[kind]}`}>
      {recordKindLabels[kind]}
    </span>
  );
}
