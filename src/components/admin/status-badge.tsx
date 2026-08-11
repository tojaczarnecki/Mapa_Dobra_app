import type { ModerationStatus } from "@/generated/prisma/enums";
import { moderationStatusLabels } from "@/lib/admin/labels";

const tones: Record<ModerationStatus, string> = {
  PENDING: "border-[#d8b46b] bg-[#fff8df] text-[#654500]",
  UNDER_REVIEW: "border-brand/50 bg-brand-soft text-brand-strong",
  APPROVED: "border-[#80a97c] bg-[#eef8ed] text-[#275623]",
  REJECTED: "border-urgent/45 bg-urgent-soft text-[#8c2d0c]",
};

export function StatusBadge({ status }: { status: ModerationStatus }) {
  return (
    <span
      className={`inline-flex min-h-7 items-center rounded-full border px-2.5 py-1 text-xs font-extrabold ${tones[status]}`}
    >
      {moderationStatusLabels[status]}
    </span>
  );
}
