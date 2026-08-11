import type { ModerationStatus } from "@/generated/prisma/enums";

export const moderationTargets = [
  "UNDER_REVIEW",
  "APPROVED",
  "REJECTED",
] as const satisfies readonly ModerationStatus[];

export type ModerationTarget = (typeof moderationTargets)[number];

export function parseModerationInput(value: unknown) {
  if (typeof value !== "object" || value === null) return null;
  const input = value as Record<string, unknown>;
  const targetStatus = input.targetStatus;
  const note = typeof input.note === "string" ? input.note.trim() : "";

  if (
    typeof targetStatus !== "string" ||
    !moderationTargets.includes(targetStatus as ModerationTarget) ||
    note.length > 2000
  ) {
    return null;
  }

  if (targetStatus === "REJECTED" && (note.length < 3 || note.length > 1000)) {
    return null;
  }

  return { targetStatus: targetStatus as ModerationTarget, note };
}

export function canTransitionModerationStatus(
  current: ModerationStatus,
  target: ModerationTarget,
) {
  if (current === "PENDING") {
    return ["UNDER_REVIEW", "APPROVED", "REJECTED"].includes(target);
  }

  return current === "UNDER_REVIEW" && ["APPROVED", "REJECTED"].includes(target);
}
