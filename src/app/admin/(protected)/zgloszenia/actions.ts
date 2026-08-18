"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { requirePermission } from "@/lib/admin/session";
import {
  canTransitionModerationStatus,
  parseModerationInput,
} from "@/lib/admin/validation";

export type ModerationActionState = {
  error?: string;
  success?: string;
};

const uuidPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/iu;

export async function moderateSubmission(
  _previousState: ModerationActionState,
  formData: FormData,
): Promise<ModerationActionState> {
  const session = await requirePermission("MODERATE_SUBMISSIONS");
  const entityId = formData.get("entityId");
  const entityType = formData.get("entityType");
  const parsed = parseModerationInput({
    targetStatus: formData.get("targetStatus"),
    note: formData.get("note"),
  });

  if (
    typeof entityId !== "string" ||
    !uuidPattern.test(entityId) ||
    (entityType !== "place-update" && entityType !== "new-place") ||
    !parsed
  ) {
    return { error: "Nie udało się przetworzyć tej operacji. Odśwież stronę i spróbuj ponownie." };
  }

  try {
    await prisma.$transaction(async (transaction) => {
      const current =
        entityType === "place-update"
          ? await transaction.placeUpdateSubmission.findUnique({
              where: { id: entityId },
              select: { moderationStatus: true },
            })
          : await transaction.newPlaceSubmission.findUnique({
              where: { id: entityId },
              select: { moderationStatus: true },
            });

      if (!current || !canTransitionModerationStatus(current.moderationStatus, parsed.targetStatus)) {
        throw new Error("INVALID_TRANSITION");
      }

      const sharedData = {
        moderationStatus: parsed.targetStatus,
        moderatedAt: new Date(),
        moderatedByAdminUserId: session.user.id,
        ...(parsed.targetStatus === "APPROVED"
          ? { moderatorNote: parsed.note || null, rejectionReason: null }
          : parsed.targetStatus === "REJECTED"
            ? { rejectionReason: parsed.note, moderatorNote: null }
            : {}),
      };

      const updateResult =
        entityType === "place-update"
          ? await transaction.placeUpdateSubmission.updateMany({
              where: { id: entityId, moderationStatus: current.moderationStatus },
              data: sharedData,
            })
          : await transaction.newPlaceSubmission.updateMany({
              where: { id: entityId, moderationStatus: current.moderationStatus },
              data: sharedData,
            });

      if (updateResult.count !== 1) throw new Error("CONCURRENT_UPDATE");

      await transaction.auditLog.create({
        data: {
          adminUserId: session.user.id,
          action:
            parsed.targetStatus === "APPROVED"
              ? "APPROVED"
              : parsed.targetStatus === "REJECTED"
                ? "REJECTED"
                : "STATUS_CHANGED",
          entityType:
            entityType === "place-update"
              ? "PLACE_UPDATE_SUBMISSION"
              : "NEW_PLACE_SUBMISSION",
          entityId,
          previousStatus: current.moderationStatus,
          newStatus: parsed.targetStatus,
          note: parsed.note || null,
        },
      });
    });
  } catch {
    return {
      error: "Status zgłoszenia nie został zmieniony. Odśwież stronę i spróbuj ponownie.",
    };
  }

  revalidatePath("/admin");
  revalidatePath("/admin/zgloszenia");
  revalidatePath(`/admin/zgloszenia/${entityId}`);

  return {
    success:
      parsed.targetStatus === "UNDER_REVIEW"
        ? "Rozpoczęto weryfikację zgłoszenia."
        : parsed.targetStatus === "APPROVED"
          ? "Zgłoszenie zostało zatwierdzone. Dane publiczne nie zostały zmienione."
          : "Zgłoszenie zostało odrzucone.",
  };
}
